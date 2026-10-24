package app.KPK2.lifelog.collect.calendar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.ZoneOffset

class CalendarItemsTest {
    private val zone = ZoneId.of("America/Chicago")
    private val minute = 60_000L

    private fun at(text: String): Long = LocalDateTime.parse(text).atZone(zone).toInstant().toEpochMilli()

    private fun utcMidnight(date: String): Long =
        LocalDateTime.parse("${date}T00:00").toInstant(ZoneOffset.UTC).toEpochMilli()

    private fun instance(
        eventId: Long = 7,
        begin: Long = at("2026-10-20T10:00"),
        minutes: Long = 45,
        title: String? = "Discovery call: bakery rebrand",
        allDay: Boolean = false,
        recurring: Boolean = false,
        calendar: String? = "Client work",
        attendees: Int = 0,
        canceled: Boolean = false,
        declined: Boolean = false,
    ) = CalendarInstance(
        eventId = eventId,
        beginMs = begin,
        endMs = begin + minutes * minute,
        title = title,
        allDay = allDay,
        recurring = recurring,
        calendarName = calendar,
        canceled = canceled,
        declinedBySelf = declined,
        otherAttendees = attendees,
    )

    @Test
    fun mapsAnEventToTheSharedSchema() {
        val item = CalendarItems.toItem(instance(attendees = 2), zone)

        assertEquals("calendar-7", item.id)
        assertEquals("2026-10-20", item.date)
        assertEquals("calendar", item.source)
        assertEquals("Discovery call: bakery rebrand", item.title)
        assertEquals("45-minute event with 2 other attendees.", item.summary)
        assertEquals(listOf("client-work"), item.tags)
        assertNull(item.url)
        assertTrue(item.raw!!.contains("\"otherAttendees\":2"))
    }

    @Test
    fun dateUsesTheLocalDayForTimedEvents() {
        // 23:30 in Chicago is already the next day in UTC.
        val item = CalendarItems.toItem(instance(begin = at("2026-10-20T23:30")), zone)
        assertEquals("2026-10-20", item.date)
    }

    @Test
    fun allDayEventsKeepTheirCalendarDateInAnyZone() {
        val allDay = instance(begin = utcMidnight("2026-10-22"), minutes = 24 * 60, allDay = true)
        assertEquals("2026-10-22", CalendarItems.toItem(allDay, zone).date)
        assertEquals("2026-10-22", CalendarItems.toItem(allDay, ZoneId.of("Asia/Tokyo")).date)
        assertEquals("All-day event, no other attendees.", CalendarItems.summaryOf(allDay))
    }

    @Test
    fun describesDurations() {
        assertEquals("30-minute event", CalendarItems.durationPhrase(instance(minutes = 30)))
        assertEquals("2-hour event", CalendarItems.durationPhrase(instance(minutes = 120)))
        assertEquals("1 h 30 min event", CalendarItems.durationPhrase(instance(minutes = 90)))
        assertEquals("Event with no set length", CalendarItems.durationPhrase(instance(minutes = 0)))
        assertEquals("Event with no set length", CalendarItems.durationPhrase(instance(minutes = -5)))
        assertEquals(
            "3-day event",
            CalendarItems.durationPhrase(instance(begin = utcMidnight("2026-10-12"), minutes = 3 * 24 * 60, allDay = true)),
        )
    }

    @Test
    fun describesAttendees() {
        assertEquals("1-hour event with 1 other attendee.", CalendarItems.summaryOf(instance(minutes = 60, attendees = 1)))
        assertEquals("1-hour event, no other attendees.", CalendarItems.summaryOf(instance(minutes = 60)))
    }

    @Test
    fun cleansAndTruncatesTitles() {
        assertEquals(CalendarItems.UNTITLED, CalendarItems.titleOf(null))
        assertEquals(CalendarItems.UNTITLED, CalendarItems.titleOf("   "))
        assertEquals("Portfolio review", CalendarItems.titleOf("  Portfolio\n  review "))

        val long = CalendarItems.titleOf("Workshop ".repeat(40))
        assertEquals(CalendarItems.MAX_TITLE_LENGTH, long.length)
        assertTrue(long.endsWith("…"))
    }

    @Test
    fun tagsComeFromTheCalendarName() {
        assertEquals("client-work", CalendarItems.tagOf("  Client   Work "))
        assertEquals("side-projects-2026", CalendarItems.tagOf("Side projects (2026)"))
        assertEquals("업무", CalendarItems.tagOf("업무"))
        assertNull(CalendarItems.tagOf(null))
        assertNull(CalendarItems.tagOf("  "))
        assertNull(CalendarItems.tagOf("***"))
        assertEquals(CalendarItems.MAX_TAG_LENGTH, CalendarItems.tagOf("a".repeat(80))!!.length)
    }

    @Test
    fun calendarsNamedAfterAnEmailGetNoTag() {
        assertNull(CalendarItems.tagOf("freelancer@example.com"))
        assertEquals(emptyList<String>(), CalendarItems.toItem(instance(calendar = "freelancer@example.com"), zone).tags)
    }

    @Test
    fun repeatingEventsGetOneIdPerInstance() {
        val monday = instance(eventId = 3, begin = at("2026-10-19T09:00"), recurring = true)
        val tuesday = instance(eventId = 3, begin = at("2026-10-20T09:00"), recurring = true)
        val ids = CalendarItems.toItems(listOf(monday, tuesday), zone).map { it.id }
        assertEquals(listOf("calendar-3-${monday.beginMs}", "calendar-3-${tuesday.beginMs}"), ids)
    }

    @Test
    fun aMovedOneOffEventKeepsItsId() {
        val before = CalendarItems.toItem(instance(begin = at("2026-10-20T10:00")), zone)
        val after = CalendarItems.toItem(instance(begin = at("2026-10-21T15:00")), zone)
        assertEquals(before.id, after.id)
        assertEquals("2026-10-21", after.date)
    }

    @Test
    fun dropsDuplicateInstancesCanceledAndDeclinedEvents() {
        val items = CalendarItems.toItems(
            listOf(
                instance(eventId = 1),
                instance(eventId = 1),
                instance(eventId = 2, canceled = true),
                instance(eventId = 3, declined = true),
                instance(eventId = 4),
            ),
            zone,
        )
        assertEquals(listOf("calendar-1", "calendar-4"), items.map { it.id })
    }

    @Test
    fun windowCoversTheLastFourteenDaysThroughTomorrow() {
        val now = at("2026-10-24T12:00")
        val window = CalendarItems.window(now)
        assertEquals(at("2026-10-10T12:00"), window.first)
        assertEquals(at("2026-10-25T12:00"), window.last)
    }

    @Test
    fun countsAttendeesOtherThanTheOwner() {
        val rows = listOf(
            1L to "owner@example.com",
            1L to "client@example.com",
            1L to "CLIENT@example.com",
            1L to null,
            2L to "Owner@Example.com",
            3L to "designer@example.com",
        )
        val owners = mapOf(1L to "owner@example.com", 2L to "owner@example.com", 3L to null)

        val counts = CalendarItems.countOtherAttendees(rows, owners)

        assertEquals(mapOf(1L to 2, 3L to 1), counts)
    }
}
