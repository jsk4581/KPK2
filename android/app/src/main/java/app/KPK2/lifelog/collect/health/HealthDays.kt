package app.KPK2.lifelog.collect.health

import app.KPK2.lifelog.data.LifelogItem
import app.KPK2.lifelog.sources.SourceId
import java.text.NumberFormat
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.Locale

/** The local days a pull covers, both ends included. */
data class DayWindow(val first: LocalDate, val last: LocalDate) {
    init {
        require(!last.isBefore(first)) { "window ends before it starts" }
    }

    operator fun contains(day: LocalDate): Boolean = !day.isBefore(first) && !day.isAfter(last)
}

/** One sleep session as read from Health Connect, reduced to what the lifelog needs. */
data class SleepSpan(val start: Instant, val end: Instant, val asleepMinutes: Long)

/** One exercise session. [exerciseType] is a Health Connect `ExerciseSessionRecord.EXERCISE_TYPE_*` value. */
data class ExerciseSpan(val start: Instant, val end: Instant, val exerciseType: Int) {
    val minutes: Long get() = (end.toEpochMilli() - start.toEpochMilli()).coerceAtLeast(0) / 60_000L
}

/**
 * Turns Health Connect readings into lifelog items: at most one item per local day for each [HealthType].
 * Pure, so the grouping, the duplicate handling between apps that write the same night or workout, and
 * the wording are unit tested. Item ids are `health-<type>-<date>`, so a later pull of the same day
 * updates that day's item instead of adding a second one.
 */
object HealthDays {
    /** Exercise sessions named in one item's summary; the rest are counted. */
    const val MAX_LISTED_SESSIONS = 4

    /** Distinct exercise kinds added as tags, after the fixed "exercise" tag. */
    const val MAX_KIND_TAGS = 3

    fun itemId(type: HealthType, date: LocalDate): String = "${SourceId.HEALTH.wire}-${type.key}-$date"

    /** Steps per local day, already totalled by Health Connect. Days outside [days] or with no steps give no item. */
    fun stepItems(totals: Map<LocalDate, Long>, days: DayWindow): List<LifelogItem> =
        totals.filter { (day, steps) -> day in days && steps > 0 }
            .toSortedMap()
            .map { (day, steps) ->
                val count = formatCount(steps)
                item(
                    type = HealthType.STEPS,
                    day = day,
                    title = "$count steps",
                    summary = "Walked $count steps.",
                    tags = listOf("steps"),
                )
            }

    /**
     * Sleep per local day of waking up. Sessions that overlap are one night recorded by several apps, so
     * only the longest of them counts; separate sessions on the same day (a night and a nap) add up.
     */
    fun sleepItems(sessions: List<SleepSpan>, days: DayWindow, zone: ZoneId): List<LifelogItem> =
        mergeOverlapping(sessions.filter { it.end > it.start && it.asleepMinutes > 0 })
            .groupBy { it.end.atZone(zone).toLocalDate() }
            .filterKeys { it in days }
            .toSortedMap()
            .map { (day, nights) ->
                val minutes = nights.sumOf { it.asleepMinutes }
                val duration = formatDuration(minutes)
                val summary = if (nights.size == 1) "Slept $duration." else "Slept $duration in ${nights.size} sessions."
                item(HealthType.SLEEP, day, title = "Slept $duration", summary = summary, tags = listOf("sleep"))
            }

    /**
     * Exercise per local day of the session start, listing each session with its kind and minutes.
     * The same kind of session overlapping in time is one workout recorded by several apps; the longer
     * copy is kept. Sessions under a minute are dropped.
     */
    fun exerciseItems(sessions: List<ExerciseSpan>, days: DayWindow, zone: ZoneId): List<LifelogItem> =
        dedupeWorkouts(sessions.filter { it.minutes >= 1 })
            .groupBy { it.start.atZone(zone).toLocalDate() }
            .filterKeys { it in days }
            .toSortedMap()
            .map { (day, workouts) ->
                val ordered = workouts.sortedBy { it.start }
                val total = ordered.sumOf { it.minutes }
                val title = if (ordered.size == 1) {
                    "Exercise: ${ExerciseKinds.label(ordered[0].exerciseType)} ${ordered[0].minutes} min"
                } else {
                    "Exercise: ${ordered.size} sessions, $total min"
                }
                val kinds = ordered.map { ExerciseKinds.label(it.exerciseType) }.distinct()
                item(
                    type = HealthType.EXERCISE,
                    day = day,
                    title = title,
                    summary = sessionList(ordered),
                    tags = listOf("exercise") + kinds.take(MAX_KIND_TAGS).map(::tagOf),
                )
            }

    /** "Running 30 min, yoga 45 min.", naming at most [MAX_LISTED_SESSIONS] sessions. */
    fun sessionList(ordered: List<ExerciseSpan>): String {
        val named = ordered.take(MAX_LISTED_SESSIONS).map { "${ExerciseKinds.label(it.exerciseType)} ${it.minutes} min" }
        val rest = ordered.size - named.size
        val text = named.joinToString(", ") + if (rest > 0) " and $rest more" else ""
        return text.replaceFirstChar { it.uppercase(Locale.US) } + "."
    }

    /** Groups sessions whose times overlap and keeps the one with the most sleep from each group. */
    internal fun mergeOverlapping(sessions: List<SleepSpan>): List<SleepSpan> {
        val kept = mutableListOf<SleepSpan>()
        var group = mutableListOf<SleepSpan>()
        var groupEnd = Instant.MIN
        for (session in sessions.sortedBy { it.start }) {
            if (group.isNotEmpty() && session.start >= groupEnd) {
                kept += group.maxBy { it.asleepMinutes }
                group = mutableListOf()
            }
            groupEnd = if (group.isEmpty()) session.end else maxOf(groupEnd, session.end)
            group += session
        }
        if (group.isNotEmpty()) kept += group.maxBy { it.asleepMinutes }
        return kept
    }

    /** Collapses same-kind sessions that overlap in time, keeping the longest copy. */
    internal fun dedupeWorkouts(sessions: List<ExerciseSpan>): List<ExerciseSpan> =
        sessions.groupBy { it.exerciseType }.values.flatMap { sameKind ->
            val kept = mutableListOf<ExerciseSpan>()
            for (session in sameKind.sortedByDescending { it.minutes }) {
                if (kept.none { it.start < session.end && session.start < it.end }) kept += session
            }
            kept
        }

    /** "7 h 20 min", "45 min", "8 h". */
    fun formatDuration(minutes: Long): String {
        val hours = minutes / 60
        val rest = minutes % 60
        return when {
            hours == 0L -> "$rest min"
            rest == 0L -> "$hours h"
            else -> "$hours h $rest min"
        }
    }

    private fun formatCount(value: Long): String = NumberFormat.getIntegerInstance(Locale.US).format(value)

    private fun tagOf(label: String): String = label.lowercase(Locale.US).replace(' ', '-')

    private fun item(type: HealthType, day: LocalDate, title: String, summary: String, tags: List<String>) =
        LifelogItem(
            id = itemId(type, day),
            date = day.toString(),
            source = SourceId.HEALTH.wire,
            title = title,
            summary = summary,
            tags = tags,
            url = null,
        )
}
