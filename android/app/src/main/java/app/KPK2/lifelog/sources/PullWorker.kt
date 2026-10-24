package app.KPK2.lifelog.sources

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import app.KPK2.lifelog.appGraph
import java.util.concurrent.TimeUnit

/** Periodic background pull for collectors that read history instead of listening for events. */
class PullWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        applicationContext.appGraph.runner.pullAll()
        return Result.success()
    }

    companion object {
        private const val WORK_NAME = "lifelog-pull"
        private const val INTERVAL_HOURS = 3L

        /** Keeps the periodic pull scheduled only while some registered collector needs it. */
        fun schedule(context: Context, collectors: List<Collector> = CollectorRegistry.all) {
            val work = WorkManager.getInstance(context)
            if (collectors.any { it.pullsPeriodically }) {
                val request = PeriodicWorkRequestBuilder<PullWorker>(INTERVAL_HOURS, TimeUnit.HOURS).build()
                work.enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.KEEP, request)
            } else {
                work.cancelUniqueWork(WORK_NAME)
            }
        }
    }
}
