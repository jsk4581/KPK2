package app.KPK2.lifelog.collect.calendar

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import app.KPK2.lifelog.appGraph
import app.KPK2.lifelog.sources.SourceId
import app.KPK2.lifelog.sources.SourcePolicy
import java.util.concurrent.TimeUnit

/**
 * Pulls the calendar on its own 15-minute schedule (the shortest WorkManager allows), and once on
 * demand when the app comes to the foreground or the source is turned on. Checks the person's choice
 * and the permission on every run, so a pull never happens after the source is turned off or access
 * is revoked.
 */
class CalendarPullWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val graph = applicationContext.appGraph
        val collector = CalendarCollector()
        val choice = graph.sourceSettings.current()[SourceId.CALENDAR]
        if (SourcePolicy.isOn(collector, choice, collector.hasAccess(applicationContext))) {
            collector.pull(applicationContext, graph.repository)
        }
        return Result.success()
    }

    companion object {
        private const val PERIODIC_NAME = "calendar-pull"
        private const val NOW_NAME = "calendar-pull-now"
        private const val INTERVAL_MINUTES = 15L

        /** Keeps the 15-minute pull scheduled. Safe to call repeatedly. */
        fun schedule(context: Context) {
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                PERIODIC_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                PeriodicWorkRequestBuilder<CalendarPullWorker>(INTERVAL_MINUTES, TimeUnit.MINUTES).build(),
            )
        }

        /** Runs one pull soon; a request still waiting to run absorbs this one. */
        fun pullNow(context: Context) {
            WorkManager.getInstance(context).enqueueUniqueWork(
                NOW_NAME,
                ExistingWorkPolicy.KEEP,
                OneTimeWorkRequestBuilder<CalendarPullWorker>().build(),
            )
        }

        fun cancel(context: Context) {
            val work = WorkManager.getInstance(context)
            work.cancelUniqueWork(NOW_NAME)
            work.cancelUniqueWork(PERIODIC_NAME)
        }
    }
}
