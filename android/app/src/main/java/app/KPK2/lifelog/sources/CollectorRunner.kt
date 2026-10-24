package app.KPK2.lifelog.sources

import android.content.Context
import android.util.Log
import app.KPK2.lifelog.data.LifelogRepository
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** Starts, stops and pulls the registered collectors according to the person's choices. */
class CollectorRunner(
    private val context: Context,
    private val repository: LifelogRepository,
    private val settings: SourceSettings,
    private val collectors: List<Collector> = CollectorRegistry.all,
) {
    /** App start, every return to the app and every toggle call [sync]; one runs at a time. */
    private val syncLock = Mutex()

    private fun active(): List<Collector> {
        val choices = settings.current()
        return collectors.filter { SourcePolicy.isOn(it, choices[it.id], it.hasAccess(context)) }
    }

    /** Brings every collector in line with the current choices and access. Safe to call repeatedly. */
    suspend fun sync() = syncLock.withLock {
        val on = active().toSet()
        collectors.forEach { collector ->
            runCatching {
                if (collector in on) collector.start(context, repository) else collector.stop(context)
            }.onFailure { Log.w(TAG, "start/stop failed for ${collector.id.wire}", it) }
        }
    }

    /** Runs one pull for every active pulling collector. Returns the number of items written. */
    suspend fun pullAll(): Int = active().filter { it.pullsPeriodically }.sumOf { collector ->
        runCatching { collector.pull(context, repository) }
            .onFailure { Log.w(TAG, "pull failed for ${collector.id.wire}", it) }
            .getOrDefault(0)
    }

    private companion object {
        const val TAG = "CollectorRunner"
    }
}
