package app.KPK2.lifelog.collect.calendar

import android.Manifest
import android.app.Activity
import android.app.Application
import android.content.Context
import android.os.Bundle
import android.util.Log
import app.KPK2.lifelog.data.LifelogRepository
import app.KPK2.lifelog.sources.Collector
import app.KPK2.lifelog.sources.SourceId
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Records calendar events: one item per instance from the last 14 days through tomorrow. While the
 * source is on it pulls when it is turned on, whenever the app comes to the foreground, and every
 * 15 minutes in the background. Pulls are idempotent because item ids come from the instance, not
 * from the time of the pull.
 */
class CalendarCollector(
    private val clock: () -> Long = System::currentTimeMillis,
) : Collector {
    override val id: SourceId = SourceId.CALENDAR
    override val requiredPermissions: List<String> = listOf(Manifest.permission.READ_CALENDAR)
    override val pullsPeriodically: Boolean = true

    private var foregroundWatcher: ForegroundWatcher? = null

    @Synchronized
    override fun start(context: Context, repository: LifelogRepository) {
        if (foregroundWatcher != null) return
        val app = context.applicationContext as Application
        foregroundWatcher = ForegroundWatcher { CalendarPullWorker.pullNow(app) }.also(app::registerActivityLifecycleCallbacks)
        CalendarPullWorker.schedule(app)
        CalendarPullWorker.pullNow(app)
    }

    @Synchronized
    override fun stop(context: Context) {
        val app = context.applicationContext as Application
        foregroundWatcher?.let(app::unregisterActivityLifecycleCallbacks)
        foregroundWatcher = null
        CalendarPullWorker.cancel(app)
    }

    override suspend fun pull(context: Context, repository: LifelogRepository): Int {
        if (!hasAccess(context)) return 0
        val instances = withContext(Dispatchers.IO) {
            try {
                CalendarReader(context.contentResolver).read(CalendarItems.window(clock()))
            } catch (e: SecurityException) {
                Log.w(TAG, "calendar access was revoked", e)
                emptyList()
            } catch (e: RuntimeException) {
                Log.w(TAG, "calendar provider query failed", e)
                emptyList()
            }
        }
        return repository.record(CalendarItems.toItems(instances))
    }

    /** Calls [onForeground] each time the first of the app's activities becomes visible. */
    private class ForegroundWatcher(private val onForeground: () -> Unit) : Application.ActivityLifecycleCallbacks {
        private var visible = 0

        override fun onActivityStarted(activity: Activity) {
            if (visible++ == 0) onForeground()
        }

        override fun onActivityStopped(activity: Activity) {
            visible = (visible - 1).coerceAtLeast(0)
        }

        override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
        override fun onActivityResumed(activity: Activity) {}
        override fun onActivityPaused(activity: Activity) {}
        override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
        override fun onActivityDestroyed(activity: Activity) {}
    }

    private companion object {
        const val TAG = "CalendarCollector"
    }
}
