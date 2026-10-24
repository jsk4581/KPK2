package app.KPK2.lifelog.collect.appusage

import android.Manifest
import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Process
import android.provider.Settings
import android.util.Log
import app.KPK2.lifelog.data.LifelogRepository
import app.KPK2.lifelog.sources.Collector
import app.KPK2.lifelog.sources.SourceId
import java.time.Instant
import java.time.ZoneId

/**
 * Minutes per app category per day, read from the phone's usage history. Needs usage access, which
 * the person grants on a system settings screen. Package names are only used to look up a category
 * in memory; items carry the category and the minutes, nothing else.
 */
class AppUsageCollector(
    private val clock: () -> Long = System::currentTimeMillis,
    private val zone: () -> ZoneId = ZoneId::systemDefault,
) : Collector {

    override val id: SourceId = SourceId.APP_USAGE

    /** Background reads come from [AppUsagePullWorker], which runs every 15 minutes while this source is on. */
    override val pullsPeriodically: Boolean get() = false

    override fun hasAccess(context: Context): Boolean {
        val ops = context.getSystemService(AppOpsManager::class.java) ?: return false
        val mode = ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
        // Some builds leave the op at its default and grant through the permission instead.
        return if (mode == AppOpsManager.MODE_DEFAULT) {
            context.checkSelfPermission(Manifest.permission.PACKAGE_USAGE_STATS) == PackageManager.PERMISSION_GRANTED
        } else {
            mode == AppOpsManager.MODE_ALLOWED
        }
    }

    /** Opens usage access for this app directly where the phone supports it, else the full list. */
    override fun accessSettingsIntent(context: Context): Intent {
        val direct = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
            .setData(Uri.fromParts("package", context.packageName, null))
        val usable = runCatching { direct.resolveActivity(context.packageManager) != null }.getOrDefault(false)
        return if (usable) direct else Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
    }

    override fun start(context: Context, repository: LifelogRepository) {
        AppUsagePullWorker.schedule(context)
    }

    override fun stop(context: Context) {
        AppUsagePullWorker.cancel(context)
    }

    /**
     * Recomputes yesterday and today from the start of yesterday. Starting at a local midnight, not 24
     * hours back, keeps yesterday's total complete, so an update never replaces it with a partial sum.
     */
    override suspend fun pull(context: Context, repository: LifelogRepository): Int {
        if (!hasAccess(context)) return 0
        val usage = context.getSystemService(UsageStatsManager::class.java) ?: return 0
        val zone = zone()
        val now = clock()
        val from = startOfYesterday(now, zone)
        val events = try {
            readEvents(usage, from - OPEN_APP_LOOKBACK_MILLIS, now)
        } catch (e: SecurityException) {
            Log.w(TAG, "usage access was withdrawn", e)
            return 0
        }
        val categories = HashMap<String, UsageCategory>()
        val totals = UsageAggregator.totals(
            events = events,
            fromMillis = from,
            untilMillis = now,
            zone = zone,
            categoryOf = { pkg -> categories.getOrPut(pkg) { categoryOf(context.packageManager, pkg) } },
            ignored = ignoredPackages(context),
        )
        return repository.record(UsageAggregator.toItems(totals))
    }

    private fun readEvents(usage: UsageStatsManager, from: Long, until: Long): List<UsageEvent> {
        // Returns null while the phone is still locked after a restart.
        val stream = usage.queryEvents(from, until) ?: return emptyList()
        val out = ArrayList<UsageEvent>()
        val event = UsageEvents.Event()
        while (stream.hasNextEvent()) {
            stream.getNextEvent(event)
            val kind = when (event.eventType) {
                UsageEvents.Event.ACTIVITY_RESUMED -> UsageEvent.Kind.APP_FOREGROUND
                UsageEvents.Event.ACTIVITY_PAUSED,
                UsageEvents.Event.ACTIVITY_STOPPED -> UsageEvent.Kind.APP_BACKGROUND
                UsageEvents.Event.SCREEN_NON_INTERACTIVE,
                UsageEvents.Event.KEYGUARD_SHOWN,
                UsageEvents.Event.DEVICE_SHUTDOWN -> UsageEvent.Kind.SCREEN_OFF
                else -> null
            } ?: continue
            out += UsageEvent(event.timeStamp, kind, event.packageName, event.className)
        }
        return out
    }

    /**
     * Apps outside the launcher query in the manifest are not visible on Android 11 and later; they
     * fall back to the built-in list or [UsageCategory.OTHER].
     */
    private fun categoryOf(pm: PackageManager, pkg: String): UsageCategory {
        val declared = try {
            pm.getApplicationInfo(pkg, 0).category
        } catch (e: PackageManager.NameNotFoundException) {
            ApplicationInfo.CATEGORY_UNDEFINED
        }
        return UsageCategories.of(pkg, declared)
    }

    /** Time on the home screen, in system UI or in this app is not counted as using an app. */
    private fun ignoredPackages(context: Context): Set<String> {
        val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        val launchers = runCatching {
            homeScreenPackages(
                context.packageManager.queryIntentActivities(home, PackageManager.MATCH_DEFAULT_ONLY)
                    .map { it.activityInfo?.packageName to it.priority },
            )
        }.getOrDefault(emptySet())
        return launchers + context.packageName + SYSTEM_UI_PACKAGE
    }

    internal companion object {
        /** Local midnight at the start of the day before the day that contains [nowMillis]. */
        fun startOfYesterday(nowMillis: Long, zone: ZoneId): Long =
            Instant.ofEpochMilli(nowMillis).atZone(zone).toLocalDate()
                .minusDays(1).atStartOfDay(zone).toInstant().toEpochMilli()

        /**
         * Packages of real home screens among HOME activities given as (package, filter priority).
         * Settings declares a placeholder home (FallbackHome, priority -1000) that only shows while the
         * phone starts; counting it as a launcher would drop every minute spent in Settings.
         */
        fun homeScreenPackages(candidates: List<Pair<String?, Int>>): Set<String> =
            candidates.filter { (_, priority) -> priority >= 0 }.mapNotNull { it.first }.toSet()

        private const val TAG = "AppUsageCollector"
        private const val SYSTEM_UI_PACKAGE = "com.android.systemui"

        /** Reads a little before the window so an app already in front at its start is counted from the start. */
        private const val OPEN_APP_LOOKBACK_MILLIS = 60 * 60_000L
    }
}
