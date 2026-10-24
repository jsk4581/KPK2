package app.KPK2.lifelog.collect.device

import android.app.Application
import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import app.KPK2.lifelog.data.LifelogRepository
import app.KPK2.lifelog.sources.Collector
import app.KPK2.lifelog.sources.ForegroundWatcher
import app.KPK2.lifelog.sources.SourceId
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.time.ZoneId

/**
 * Records charging, battery band, Do Not Disturb and headphones as a "Device state" item, only when
 * one of them changed since the last reading. Reads when the source starts (the person turning it on,
 * or a new app process), whenever the app comes to the foreground, and on every periodic pull. Needs
 * no runtime permission.
 */
class DeviceCollector(
    private val read: (Context) -> DeviceState = { DeviceStateReader.read(it).toState() },
    private val clock: () -> Long = System::currentTimeMillis,
    private val zone: () -> ZoneId = ZoneId::systemDefault,
) : Collector {
    override val id: SourceId = SourceId.DEVICE
    override val pullsPeriodically: Boolean = true

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val lock = Mutex()

    private var foregroundWatcher: ForegroundWatcher? = null

    @Synchronized
    override fun start(context: Context, repository: LifelogRepository) {
        if (foregroundWatcher != null) return
        val app = context.applicationContext as Application
        // A warm reopen does not start the source again, so read on every return to the foreground too.
        foregroundWatcher = ForegroundWatcher { readSoon(app, repository, "foreground") }
            .also(app::registerActivityLifecycleCallbacks)
        readSoon(app, repository, "start")
    }

    /** Forgets the last state, so turning the source back on records a fresh starting point. */
    @Synchronized
    override fun stop(context: Context) {
        val app = context.applicationContext as Application
        val watcher = foregroundWatcher
        if (watcher == null && !memory(app).contains(KEY_LAST)) return
        watcher?.let(app::unregisterActivityLifecycleCallbacks)
        foregroundWatcher = null
        scope.launch { lock.withLock { memory(app).edit().remove(KEY_LAST).commit() } }
    }

    private fun readSoon(app: Context, repository: LifelogRepository, reason: String) {
        scope.launch {
            runCatching { snapshot(app, repository) }.onFailure { Log.w(TAG, "reading on $reason failed", it) }
        }
    }

    override suspend fun pull(context: Context, repository: LifelogRepository): Int =
        runCatching { snapshot(context.applicationContext, repository) }
            .onFailure { Log.w(TAG, "reading on pull failed", it) }
            .getOrDefault(0)

    /** Reads the state once and records it when it differs from the last one. Returns items written. */
    suspend fun snapshot(context: Context, repository: LifelogRepository): Int = lock.withLock {
        val prefs = memory(context)
        val previous = DeviceState.decode(prefs.getString(KEY_LAST, null))
        val current = read(context)
        val item = DeviceStateItems.itemFor(previous, current, clock(), zone()) ?: return@withLock 0
        val written = repository.record(item)
        prefs.edit().putString(KEY_LAST, current.encode()).commit()
        written
    }

    private fun memory(context: Context): SharedPreferences =
        context.getSharedPreferences(MEMORY_FILE, Context.MODE_PRIVATE)

    companion object {
        private const val TAG = "DeviceCollector"

        /** Private preferences holding only the last encoded state; backup rules exclude all preferences. */
        const val MEMORY_FILE = "device_state_memory"
        private const val KEY_LAST = "last_state"
    }
}
