package app.KPK2.lifelog.collect.appusage

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

/**
 * Reads app usage every 15 minutes (the shortest period WorkManager allows) while the source is on.
 * It checks the person's choice and usage access again on every run, so turning the source off or
 * withdrawing access in system settings stops recording even before the app is opened again.
 */
class AppUsagePullWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val graph = applicationContext.appGraph
        val collector = CollectorRegistry.forSource(SourceId.APP_USAGE) ?: AppUsageCollector()
        val choice = graph.sourceSettings.current()[SourceId.APP_USAGE]
        if (!SourcePolicy.isOn(collector, choice, collector.hasAccess(applicationContext))) return Result.success()
        collector.pull(applicationContext, graph.repository)
        return Result.success()
    }

    companion object {
        private const val PERIODIC_NAME = "lifelog-app-usage"
        private const val NOW_NAME = "lifelog-app-usage-now"
        private const val INTERVAL_MINUTES = 15L

        /** Keeps the 15-minute pull scheduled and runs one pull right away. Safe to call repeatedly. */
        fun schedule(context: Context) {
            val work = WorkManager.getInstance(context)
            val periodic = PeriodicWorkRequestBuilder<AppUsagePullWorker>(INTERVAL_MINUTES, TimeUnit.MINUTES).build()
            work.enqueueUniquePeriodicWork(PERIODIC_NAME, ExistingPeriodicWorkPolicy.KEEP, periodic)
            work.enqueueUniqueWork(NOW_NAME, ExistingWorkPolicy.KEEP, OneTimeWorkRequestBuilder<AppUsagePullWorker>().build())
        }

        fun cancel(context: Context) {
            val work = WorkManager.getInstance(context)
            work.cancelUniqueWork(PERIODIC_NAME)
            work.cancelUniqueWork(NOW_NAME)
        }
    }
}
