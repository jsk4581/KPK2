package app.KPK2.lifelog.collect.appusage

import app.KPK2.lifelog.data.LifelogItem
import app.KPK2.lifelog.sources.SourceId
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/** What happened at one instant, reduced to what the aggregation needs. In memory only. */
data class UsageEvent(
    val atMillis: Long,
    val kind: Kind,
    val packageName: String? = null,
    /** The activity within [packageName], when known; tells a late event from an earlier screen apart. */
    val className: String? = null,
) {
    enum class Kind {
        /** An activity of [packageName] came to the front. */
        APP_FOREGROUND,

        /** An activity of [packageName] left the front (paused or stopped). */
        APP_BACKGROUND,

        /** Nobody is looking: screen off, lock screen shown, or shutdown. Ends whatever app was in front. */
        SCREEN_OFF,
    }
}

/** Time in front for one category on one local day. */
data class CategoryDayTotal(val date: String, val category: UsageCategory, val millis: Long) {
    /** Whole minutes, rounded to the nearest minute. */
    val minutes: Long get() = (millis + MINUTE_MILLIS / 2) / MINUTE_MILLIS
}

private const val MINUTE_MILLIS = 60_000L

/**
 * Turns raw foreground events into minutes per app category per day, and those into lifelog items.
 * Pure: the Android side supplies the events, the category lookup and the packages to ignore.
 */
object UsageAggregator {

    private data class Span(val packageName: String, val start: Long, val end: Long)

    /**
     * Sums the time each category spent in front between [fromMillis] and [untilMillis], split at local
     * midnight in [zone]. Events before [fromMillis] may still open an app that is in front at
     * [fromMillis]; only the part inside the window counts. An app still in front at [untilMillis]
     * counts up to [untilMillis].
     *
     * @param ignored packages whose time is not app use (this app, the home screen, system UI).
     */
    fun totals(
        events: List<UsageEvent>,
        fromMillis: Long,
        untilMillis: Long,
        zone: ZoneId,
        categoryOf: (String) -> UsageCategory,
        ignored: Set<String> = emptySet(),
    ): List<CategoryDayTotal> {
        if (untilMillis <= fromMillis) return emptyList()
        val sums = LinkedHashMap<Pair<String, UsageCategory>, Long>()
        for (span in spans(events, untilMillis)) {
            if (span.packageName in ignored) continue
            val start = maxOf(span.start, fromMillis)
            val end = minOf(span.end, untilMillis)
            if (end <= start) continue
            val category = categoryOf(span.packageName)
            splitByDay(start, end, zone) { date, millis ->
                val key = date to category
                sums[key] = (sums[key] ?: 0L) + millis
            }
        }
        return sums.map { (key, millis) -> CategoryDayTotal(key.first, key.second, millis) }
            .sortedWith(compareBy({ it.date }, { it.category.ordinal }))
    }

    /**
     * One item per day and category with at least one minute. The id depends only on the day and the
     * category, so a later pull updates the same item and a deleted one stays deleted.
     */
    fun toItems(totals: List<CategoryDayTotal>): List<LifelogItem> = totals
        .filter { it.minutes >= 1 }
        .map { total ->
            LifelogItem(
                id = itemId(total.date, total.category),
                date = total.date,
                source = SourceId.APP_USAGE.wire,
                title = total.category.wire,
                summary = summaryOf(total),
                tags = listOf(total.category.wire),
                url = null,
            )
        }

    fun itemId(date: String, category: UsageCategory): String = "${SourceId.APP_USAGE.wire}-$date-${category.wire}"

    internal fun summaryOf(total: CategoryDayTotal): String {
        val unit = if (total.minutes == 1L) "minute" else "minutes"
        return "${total.minutes} $unit in ${total.category.wire} apps."
    }

    /**
     * Rebuilds the stretches during which one app was in front. Moving between two activities of the
     * same app keeps one stretch; another app coming to the front ends the previous one, because the
     * system does not always report the previous app leaving before the next one arrives.
     *
     * Within one app the system reports A paused, B resumed, then A stopped. Only the activity in front
     * can end the stretch, so the late "A stopped" does not cut B's time.
     */
    private fun spans(events: List<UsageEvent>, untilMillis: Long): List<Span> {
        val out = mutableListOf<Span>()
        var openPackage: String? = null
        var openClass: String? = null
        var openSince = 0L
        fun close(at: Long) {
            openPackage?.let { if (at > openSince) out += Span(it, openSince, at) }
            openPackage = null
            openClass = null
        }
        for (event in events.sortedBy { it.atMillis }) {
            if (event.atMillis > untilMillis) break
            when (event.kind) {
                UsageEvent.Kind.APP_FOREGROUND -> {
                    val pkg = event.packageName ?: continue
                    if (pkg != openPackage) {
                        close(event.atMillis)
                        openPackage = pkg
                        openSince = event.atMillis
                    }
                    openClass = event.className
                }
                UsageEvent.Kind.APP_BACKGROUND -> {
                    val inFront = event.className == null || openClass == null || event.className == openClass
                    if (event.packageName == openPackage && inFront) close(event.atMillis)
                }
                UsageEvent.Kind.SCREEN_OFF -> close(event.atMillis)
            }
        }
        close(untilMillis)
        return out
    }

    private inline fun splitByDay(start: Long, end: Long, zone: ZoneId, add: (String, Long) -> Unit) {
        var cursor = start
        while (cursor < end) {
            val day: LocalDate = Instant.ofEpochMilli(cursor).atZone(zone).toLocalDate()
            val nextMidnight = day.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli()
            val pieceEnd = minOf(end, nextMidnight)
            add(day.toString(), pieceEnd - cursor)
            cursor = pieceEnd
        }
    }
}
