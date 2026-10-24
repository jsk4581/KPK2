package app.KPK2.lifelog.collect.health

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import app.KPK2.lifelog.appGraph
import app.KPK2.lifelog.sources.CollectorRegistry
import app.KPK2.lifelog.sources.SourceId
import app.KPK2.lifelog.sources.SourcePolicy
import java.util.concurrent.TimeUnit

/** Reads Health Connect every hour, and once right away when the health source starts. */
class HealthPullWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val graph = applicationContext.appGraph
        val collector = CollectorRegistry.forSource(SourceId.HEALTH) ?: return Result.success()
        val choice = graph.sourceSettings.current()[SourceId.HEALTH]
        // The person may have turned the source off, or revoked access, since this run was queued.
        if (!SourcePolicy.isOn(collector, choice, collector.hasAccess(applicationContext))) return Result.success()
        collector.pull(applicationContext, graph.repository)
        return Result.success()
    }

    companion object {
        private const val PERIODIC = "health-pull-hourly"
        private const val NOW = "health-pull-now"
        private const val INTERVAL_MINUTES = 60L

        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<HealthPullWorker>(INTERVAL_MINUTES, TimeUnit.MINUTES).build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, request)
        }

        /** Queues one pull now. While one is already waiting, the waiting one is kept. */
        fun pullSoon(context: Context) {
            val request = OneTimeWorkRequestBuilder<HealthPullWorker>().build()
            WorkManager.getInstance(context).enqueueUniqueWork(NOW, ExistingWorkPolicy.KEEP, request)
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).apply {
                cancelUniqueWork(PERIODIC)
                cancelUniqueWork(NOW)
            }
        }
    }
}
