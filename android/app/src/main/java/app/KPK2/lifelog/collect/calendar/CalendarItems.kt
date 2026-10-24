package app.KPK2.lifelog.collect.calendar

import app.KPK2.lifelog.data.LifelogItem
import app.KPK2.lifelog.sources.SourceId
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset

/** One calendar instance as read from the phone, held in memory until it becomes a lifelog item. */
data class CalendarInstance(
    val eventId: Long,
    /** Start in epoch millis as the provider reports it (UTC midnight for all-day instances). */
    val beginMs: Long,
    val endMs: Long,
    val title: String?,
    val allDay: Boolean,
    /** True when the event repeats, so one event id stands for many instances. */
    val recurring: Boolean,
    val calendarName: String?,
    val canceled: Boolean = false,
    val declinedBySelf: Boolean = false,
    /** People on the invite other than the calendar owner. */
    val otherAttendees: Int = 0,
)

/** Turns calendar instances into lifelog items. Pure, so the mapping and dedup rules are unit tested. */
object CalendarItems {
    const val LOOKBACK_DAYS = 14L
    const val LOOKAHEAD_DAYS = 1L
    const val MAX_TITLE_LENGTH = 120
    const val MAX_TAG_LENGTH = 40
    const val UNTITLED = "Untitled event"

    private const val DAY_MS = 86_400_000L
    private val NON_SLUG = Regex("""[^\p{L}\p{N}]+""")
    private val SPACES = Regex("""\s+""")

    /** The read window around [nowMs]: the last 14 days through one day ahead. */
    fun window(nowMs: Long): LongRange = (nowMs - LOOKBACK_DAYS * DAY_MS)..(nowMs + LOOKAHEAD_DAYS * DAY_MS)

    /**
     * The stable item id of an instance. The provider's own instance row ids are rebuilt whenever it
     * re-expands recurrences, so they cannot be used across pulls. A one-off event is its own instance,
     * keyed by event id alone so a moved meeting updates in place; a repeating event's instance is
     * the event id plus its start.
     */
    fun itemId(instance: CalendarInstance): String {
        val prefix = "${SourceId.CALENDAR.wire}-${instance.eventId}"
        return if (instance.recurring) "$prefix-${instance.beginMs}" else prefix
    }

    /**
     * Items for [instances], skipping canceled events and ones the person declined, with one item per
     * instance id even if the provider returned an instance twice.
     */
    fun toItems(instances: List<CalendarInstance>, zone: ZoneId = ZoneId.systemDefault()): List<LifelogItem> =
        instances
            .asSequence()
            .filterNot { it.canceled || it.declinedBySelf }
            .distinctBy(::itemId)
            .map { toItem(it, zone) }
            .toList()

    fun toItem(instance: CalendarInstance, zone: ZoneId = ZoneId.systemDefault()): LifelogItem = LifelogItem(
        id = itemId(instance),
        date = dateOf(instance, zone),
        source = SourceId.CALENDAR.wire,
        title = titleOf(instance.title),
        summary = summaryOf(instance),
        tags = listOfNotNull(tagOf(instance.calendarName)),
        url = null,
        raw = buildJsonObject {
            put("eventId", instance.eventId)
            put("begin", instance.beginMs)
            put("end", instance.endMs)
            put("allDay", instance.allDay)
            put("calendar", instance.calendarName)
            put("otherAttendees", instance.otherAttendees)
        }.toString(),
    )

    /** All-day instances are stored at UTC midnight, so their day is read in UTC, not in [zone]. */
    fun dateOf(instance: CalendarInstance, zone: ZoneId): String =
        if (instance.allDay) {
            Instant.ofEpochMilli(instance.beginMs).atOffset(ZoneOffset.UTC).toLocalDate().toString()
        } else {
            LifelogItem.dateOf(instance.beginMs, zone)
        }

    fun titleOf(raw: String?): String {
        val clean = raw.orEmpty().replace(SPACES, " ").trim()
        if (clean.isEmpty()) return UNTITLED
        return if (clean.length <= MAX_TITLE_LENGTH) clean else clean.take(MAX_TITLE_LENGTH - 1).trimEnd() + "…"
    }

    /** For example "45-minute event with 2 other attendees." or "All-day event, no other attendees." */
    fun summaryOf(instance: CalendarInstance): String {
        val length = durationPhrase(instance)
        val people = when (val n = instance.otherAttendees) {
            0 -> ", no other attendees."
            1 -> " with 1 other attendee."
            else -> " with $n other attendees."
        }
        return length + people
    }

    fun durationPhrase(instance: CalendarInstance): String {
        val spanMs = (instance.endMs - instance.beginMs).coerceAtLeast(0)
        if (instance.allDay) {
            val days = ((spanMs + DAY_MS / 2) / DAY_MS).coerceAtLeast(1)
            return if (days == 1L) "All-day event" else "$days-day event"
        }
        val minutes = spanMs / 60_000
        val hours = minutes / 60
        val rest = minutes % 60
        return when {
            minutes == 0L -> "Event with no set length"
            hours == 0L -> "$minutes-minute event"
            rest == 0L -> "$hours-hour event"
            else -> "$hours h $rest min event"
        }
    }

    /**
     * A tag from the calendar's name, for example "Client work" becomes "client-work". Calendars named
     * after an account address get no tag, so an email never leaves the phone in an export.
     */
    fun tagOf(calendarName: String?): String? {
        val name = calendarName?.trim().orEmpty()
        if (name.isEmpty() || '@' in name) return null
        val slug = name.lowercase().replace(NON_SLUG, "-").trim('-').take(MAX_TAG_LENGTH).trim('-')
        return slug.ifEmpty { null }
    }

    /**
     * People per event other than its calendar owner, from attendee rows of (event id, email).
     * The same address listed twice counts once; rows without an address each count.
     */
    fun countOtherAttendees(rows: List<Pair<Long, String?>>, ownerByEvent: Map<Long, String?>): Map<Long, Int> =
        rows.groupBy({ it.first }, { it.second?.trim()?.lowercase() })
            .mapValues { (eventId, emails) ->
                val owner = ownerByEvent[eventId]?.trim()?.lowercase()
                val others = emails.filterNot { it != null && it == owner }
                others.filterNotNull().filter { it.isNotEmpty() }.toSet().size + others.count { it.isNullOrEmpty() }
            }
            .filterValues { it > 0 }
}
