package app.KPK2.lifelog.collect.calendar

import android.content.ContentResolver
import android.content.ContentUris
import android.provider.CalendarContract.Attendees
import android.provider.CalendarContract.Events
import android.provider.CalendarContract.Instances

/**
 * Reads calendar instances from the phone's calendar provider. Only titles, times, calendar names and
 * attendee counts are kept; descriptions, locations and attendee names are never read into items.
 */
class CalendarReader(private val resolver: ContentResolver) {

    /** Instances of visible calendars that overlap [window], with their other-attendee counts. */
    fun read(window: LongRange): List<CalendarInstance> {
        val uri = Instances.CONTENT_URI.buildUpon().also {
            ContentUris.appendId(it, window.first)
            ContentUris.appendId(it, window.last)
        }.build()

        val found = mutableListOf<CalendarInstance>()
        val ownerByEvent = HashMap<Long, String?>()
        resolver.query(uri, PROJECTION, "${Instances.VISIBLE} = 1", null, "${Instances.BEGIN} ASC")?.use { c ->
            val eventId = c.getColumnIndexOrThrow(Instances.EVENT_ID)
            val begin = c.getColumnIndexOrThrow(Instances.BEGIN)
            val end = c.getColumnIndexOrThrow(Instances.END)
            val title = c.getColumnIndexOrThrow(Instances.TITLE)
            val allDay = c.getColumnIndexOrThrow(Instances.ALL_DAY)
            val rrule = c.getColumnIndexOrThrow(Instances.RRULE)
            val rdate = c.getColumnIndexOrThrow(Instances.RDATE)
            val calendar = c.getColumnIndexOrThrow(Instances.CALENDAR_DISPLAY_NAME)
            val owner = c.getColumnIndexOrThrow(Instances.OWNER_ACCOUNT)
            val status = c.getColumnIndexOrThrow(Instances.STATUS)
            val selfStatus = c.getColumnIndexOrThrow(Instances.SELF_ATTENDEE_STATUS)
            while (c.moveToNext()) {
                val id = c.getLong(eventId)
                ownerByEvent[id] = c.getString(owner)
                found += CalendarInstance(
                    eventId = id,
                    beginMs = c.getLong(begin),
                    endMs = c.getLong(end),
                    title = c.getString(title),
                    allDay = c.getInt(allDay) == 1,
                    recurring = !c.getString(rrule).isNullOrBlank() || !c.getString(rdate).isNullOrBlank(),
                    calendarName = c.getString(calendar),
                    canceled = !c.isNull(status) && c.getInt(status) == Events.STATUS_CANCELED,
                    declinedBySelf = !c.isNull(selfStatus) && c.getInt(selfStatus) == Attendees.ATTENDEE_STATUS_DECLINED,
                )
            }
        }
        if (found.isEmpty()) return found

        val counts = CalendarItems.countOtherAttendees(attendeeRows(ownerByEvent.keys), ownerByEvent)
        return found.map { it.copy(otherAttendees = counts[it.eventId] ?: 0) }
    }

    /** (event id, email) for every attendee row of [eventIds], queried in chunks under SQLite's argument limit. */
    private fun attendeeRows(eventIds: Collection<Long>): List<Pair<Long, String?>> =
        eventIds.chunked(MAX_SQL_ARGS).flatMap { chunk ->
            val rows = mutableListOf<Pair<Long, String?>>()
            val selection = "${Attendees.EVENT_ID} IN (${chunk.joinToString(",") { "?" }})"
            resolver.query(
                Attendees.CONTENT_URI,
                arrayOf(Attendees.EVENT_ID, Attendees.ATTENDEE_EMAIL),
                selection,
                chunk.map(Long::toString).toTypedArray(),
                null,
            )?.use { c ->
                while (c.moveToNext()) rows += c.getLong(0) to c.getString(1)
            }
            rows
        }

    private companion object {
        const val MAX_SQL_ARGS = 900

        val PROJECTION = arrayOf(
            Instances.EVENT_ID,
            Instances.BEGIN,
            Instances.END,
            Instances.TITLE,
            Instances.ALL_DAY,
            Instances.RRULE,
            Instances.RDATE,
            Instances.CALENDAR_DISPLAY_NAME,
            Instances.OWNER_ACCOUNT,
            Instances.STATUS,
            Instances.SELF_ATTENDEE_STATUS,
        )
    }
}
