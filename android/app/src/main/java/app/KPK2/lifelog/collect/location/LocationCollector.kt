package app.KPK2.lifelog.collect.location

import android.Manifest
import android.app.Activity
import android.app.ActivityManager
import android.app.Application
import android.content.Context
import android.os.Bundle
import android.util.Log
import app.KPK2.lifelog.data.LifelogRepository
import app.KPK2.lifelog.sources.Collector
import app.KPK2.lifelog.sources.SourceId
import app.KPK2.lifelog.sources.SourcePolicy
import app.KPK2.lifelog.sources.SourceSettings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancelChildren
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.concurrent.atomic.AtomicLong

/** Result of one attempt to record the current place, for the "Record place now" action. */
enum class RecordOutcome { RECORDED, SOURCE_OFF, LOCATION_OFF, NO_FIX, IMPRECISE, NOT_SAVED }

/**
 * Places: samples the phone's location while the app is open (each time it comes to the front, and on
 * "Record place now"), groups consecutive samples into stays, and records one item per stay. Uses
 * foreground location only; there is no background sampling. Raw coordinates stay in the device-only
 * part of the item; the exported summary carries the duration and a center rounded to about 1 km.
 */
class LocationCollector(
    private val fixReader: FixReader = PlatformFixReader,
    private val clock: () -> Long = System::currentTimeMillis,
) : Collector {

    override val id: SourceId = SourceId.LOCATION

    /** Android 12 and later only show the precise option when coarse is requested alongside fine. */
    override val requiredPermissions: List<String> =
        listOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val lastOpenSampleAt = AtomicLong(0L)
    private var callbacks: Application.ActivityLifecycleCallbacks? = null

    override fun start(context: Context, repository: LifelogRepository) {
        val app = context.applicationContext as? Application ?: return
        val registered = synchronized(this) {
            if (callbacks != null) return
            OpenWatcher { sampleOnOpen(app, repository) }.also { callbacks = it }
        }
        app.registerActivityLifecycleCallbacks(registered)
        // Turning the source on while the app is open, or a start that raced the first screen.
        if (isInForeground()) sampleOnOpen(app, repository)
    }

    override fun stop(context: Context) {
        val app = context.applicationContext as? Application
        val registered = synchronized(this) { callbacks.also { callbacks = null } }
        if (registered != null) app?.unregisterActivityLifecycleCallbacks(registered)
        scope.coroutineContext.cancelChildren()
    }

    /** One sample now. Not run periodically ([pullsPeriodically] is false), so background never samples. */
    override suspend fun pull(context: Context, repository: LifelogRepository): Int =
        if (sample(context, repository) == RecordOutcome.RECORDED) 1 else 0

    /**
     * The "Record place now" action. Records only while the person has Places on and access granted,
     * whatever screen the action is shown on.
     */
    suspend fun recordNow(context: Context, repository: LifelogRepository): RecordOutcome {
        val choice = SourceSettings(context).current()[id]
        if (!SourcePolicy.isOn(this, choice, hasAccess(context))) return RecordOutcome.SOURCE_OFF
        return sample(context, repository)
    }

    private fun sampleOnOpen(context: Context, repository: LifelogRepository) {
        val now = clock()
        val previous = lastOpenSampleAt.get()
        if (now - previous < MIN_OPEN_INTERVAL_MILLIS && now >= previous) return
        if (!lastOpenSampleAt.compareAndSet(previous, now)) return
        scope.launch {
            runCatching { sample(context, repository) }
                .onFailure { Log.w(TAG, "sample on open failed", it) }
        }
    }

    private suspend fun sample(context: Context, repository: LifelogRepository): RecordOutcome {
        if (!hasAccess(context)) return RecordOutcome.SOURCE_OFF
        return when (val result = fixReader.read(context)) {
            FixResult.LocationOff -> RecordOutcome.LOCATION_OFF
            FixResult.NoFix -> RecordOutcome.NO_FIX
            FixResult.Imprecise -> RecordOutcome.IMPRECISE
            is FixResult.Fix -> writeLock.withLock {
                val item = StayRecorder(repository, PrefsOpenStayMarker(context)).add(result.sample)
                if (item != null) RecordOutcome.RECORDED else RecordOutcome.NOT_SAVED
            }
        }
    }

    private fun isInForeground(): Boolean {
        val state = ActivityManager.RunningAppProcessInfo()
        ActivityManager.getMyMemoryState(state)
        return state.importance <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
    }

    /** Calls [onOpen] whenever one of the app's screens becomes visible. */
    private class OpenWatcher(private val onOpen: () -> Unit) : Application.ActivityLifecycleCallbacks {
        override fun onActivityStarted(activity: Activity) = onOpen()
        override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
        override fun onActivityResumed(activity: Activity) {}
        override fun onActivityPaused(activity: Activity) {}
        override fun onActivityStopped(activity: Activity) {}
        override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
        override fun onActivityDestroyed(activity: Activity) {}
    }

    companion object {
        /** Reopening the app (or rotating it) within this window does not take another sample. */
        const val MIN_OPEN_INTERVAL_MILLIS = 10 * 60_000L

        private const val TAG = "LocationCollector"

        /** Shared by every instance so two writers never extend the same stay at once. */
        private val writeLock = Mutex()
    }
}
