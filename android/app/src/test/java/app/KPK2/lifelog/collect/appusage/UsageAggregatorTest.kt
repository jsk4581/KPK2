package app.KPK2.lifelog.collect.appusage

import app.KPK2.lifelog.collect.appusage.UsageEvent.Kind.APP_BACKGROUND
import app.KPK2.lifelog.collect.appusage.UsageEvent.Kind.APP_FOREGROUND
import app.KPK2.lifelog.collect.appusage.UsageEvent.Kind.SCREEN_OFF
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDateTime
import java.time.ZoneId

class UsageAggregatorTest {

    private val zone = ZoneId.of("America/Chicago")

    // Fictional packages; the map stands in for the system's category lookup.
    private val categories = mapOf(
        "com.example.writer" to UsageCategory.PRODUCTIVITY,
        "com.example.sheets" to UsageCategory.PRODUCTIVITY,
        "com.example.chat" to UsageCategory.COMMUNICATION,
        "com.example.clips" to UsageCategory.VIDEO,
        "com.example.home" to UsageCategory.OTHER,
    )
    private val categoryOf: (String) -> UsageCategory = { categories[it] ?: UsageCategory.OTHER }

    private fun at(day: Int, hour: Int, minute: Int = 0, second: Int = 0): Long =
        LocalDateTime.of(2026, 10, day, hour, minute, second).atZone(zone).toInstant().toEpochMilli()

    private fun fg(t: Long, pkg: String) = UsageEvent(t, APP_FOREGROUND, pkg)
    private fun bg(t: Long, pkg: String) = UsageEvent(t, APP_BACKGROUND, pkg)
    private fun off(t: Long) = UsageEvent(t, SCREEN_OFF)
    private fun fg(t: Long, pkg: String, activity: String) = UsageEvent(t, APP_FOREGROUND, pkg, activity)
    private fun bg(t: Long, pkg: String, activity: String) = UsageEvent(t, APP_BACKGROUND, pkg, activity)

    private fun totals(
        events: List<UsageEvent>,
        from: Long = at(19, 0),
        until: Long = at(20, 23, 59),
        ignored: Set<String> = emptySet(),
    ) = UsageAggregator.totals(events, from, until, zone, categoryOf, ignored)
        .associate { (it.date to it.category) to it.minutes }

    @Test
    fun sumsMinutesPerCategoryAcrossApps() {
        val events = listOf(
            fg(at(20, 9, 0), "com.example.writer"), bg(at(20, 9, 30), "com.example.writer"),
            fg(at(20, 10, 0), "com.example.sheets"), bg(at(20, 10, 15), "com.example.sheets"),
            fg(at(20, 11, 0), "com.example.chat"), bg(at(20, 11, 12), "com.example.chat"),
        )
        assertEquals(
            mapOf(
                ("2026-10-20" to UsageCategory.PRODUCTIVITY) to 45L,
                ("2026-10-20" to UsageCategory.COMMUNICATION) to 12L,
            ),
            totals(events),
        )
    }

    @Test
    fun nextAppInFrontEndsThePreviousOneWithoutABackgroundEvent() {
        val events = listOf(
            fg(at(20, 9, 0), "com.example.writer"),
            fg(at(20, 9, 20), "com.example.clips"),
            bg(at(20, 9, 50), "com.example.clips"),
            // Late background event for the first app must not cut the second.
            bg(at(20, 9, 21), "com.example.writer"),
        )
        assertEquals(
            mapOf(
                ("2026-10-20" to UsageCategory.PRODUCTIVITY) to 20L,
                ("2026-10-20" to UsageCategory.VIDEO) to 30L,
            ),
            totals(events),
        )
    }

    @Test
    fun movingBetweenActivitiesOfOneAppKeepsOneStretch() {
        val events = listOf(
            fg(at(20, 14, 0), "com.example.writer"),
            fg(at(20, 14, 10), "com.example.writer"),
            bg(at(20, 14, 40), "com.example.writer"),
        )
        assertEquals(mapOf(("2026-10-20" to UsageCategory.PRODUCTIVITY) to 40L), totals(events))
    }

    @Test
    fun screenOffEndsTheAppInFront() {
        val events = listOf(fg(at(20, 8, 0), "com.example.chat"), off(at(20, 8, 5)), bg(at(20, 9, 0), "com.example.chat"))
        assertEquals(mapOf(("2026-10-20" to UsageCategory.COMMUNICATION) to 5L), totals(events))
    }

    @Test
    fun timeAcrossMidnightIsSplitIntoBothDays() {
        val events = listOf(fg(at(19, 23, 40), "com.example.clips"), bg(at(20, 0, 25), "com.example.clips"))
        assertEquals(
            mapOf(
                ("2026-10-19" to UsageCategory.VIDEO) to 20L,
                ("2026-10-20" to UsageCategory.VIDEO) to 25L,
            ),
            totals(events),
        )
    }

    @Test
    fun onlyTheWindowCountsAndAnOpenAppRunsToTheEnd() {
        val events = listOf(
            // Opened before the window: only the part after the window start counts.
            fg(at(18, 23, 30), "com.example.writer"), bg(at(19, 0, 10), "com.example.writer"),
            // Still in front at the end of the window.
            fg(at(20, 22, 0), "com.example.chat"),
            // After the window: ignored.
            fg(at(21, 1, 0), "com.example.clips"), bg(at(21, 2, 0), "com.example.clips"),
        )
        assertEquals(
            mapOf(
                ("2026-10-19" to UsageCategory.PRODUCTIVITY) to 10L,
                ("2026-10-20" to UsageCategory.COMMUNICATION) to 60L,
            ),
            totals(events, from = at(19, 0), until = at(20, 23, 0)),
        )
    }

    @Test
    fun ignoredPackagesAndUnorderedEventsAreHandled() {
        val events = listOf(
            bg(at(20, 10, 30), "com.example.writer"),
            fg(at(20, 10, 0), "com.example.writer"),
            fg(at(20, 9, 0), "com.example.home"),
            bg(at(20, 9, 50), "com.example.home"),
        )
        assertEquals(
            mapOf(("2026-10-20" to UsageCategory.PRODUCTIVITY) to 30L),
            totals(events, ignored = setOf("com.example.home")),
        )
    }

    @Test
    fun emptyOrInvertedWindowGivesNothing() {
        assertTrue(totals(emptyList()).isEmpty())
        assertTrue(totals(listOf(fg(at(20, 9), "com.example.chat")), from = at(20, 10), until = at(20, 9)).isEmpty())
    }

    @Test
    fun minutesRoundToTheNearestMinute() {
        assertEquals(2L, CategoryDayTotal("2026-10-20", UsageCategory.OTHER, 90_000L).minutes)
        assertEquals(1L, CategoryDayTotal("2026-10-20", UsageCategory.OTHER, 89_999L).minutes)
        assertEquals(0L, CategoryDayTotal("2026-10-20", UsageCategory.OTHER, 29_999L).minutes)
    }

    @Test
    fun itemsCarryCategoryAndMinutesButNoPackageNames() {
        val events = listOf(
            fg(at(20, 9, 0), "com.example.writer"), bg(at(20, 9, 42), "com.example.writer"),
            fg(at(20, 12, 0), "com.example.chat"), bg(at(20, 12, 0, 20), "com.example.chat"),
            fg(at(20, 13, 0), "com.example.clips"), bg(at(20, 13, 1), "com.example.clips"),
        )
        val items = UsageAggregator.toItems(UsageAggregator.totals(events, at(19, 0), at(20, 23), zone, categoryOf))

        // Twenty seconds of chat rounds to zero minutes and is left out.
        assertEquals(listOf("app_usage-2026-10-20-productivity", "app_usage-2026-10-20-video"), items.map { it.id })
        val writing = items.first()
        assertEquals("2026-10-20", writing.date)
        assertEquals("app_usage", writing.source)
        assertEquals("productivity", writing.title)
        assertEquals("42 minutes in productivity apps.", writing.summary)
        assertEquals(listOf("productivity"), writing.tags)
        assertEquals(null, writing.url)
        assertEquals("1 minute in video apps.", items[1].summary)
        items.forEach { item ->
            listOf(item.id, item.title, item.summary, item.raw.orEmpty(), item.tags.joinToString()).forEach {
                assertFalse("package name leaked into $it", it.contains("example"))
            }
        }
    }

    @Test
    fun aLaterPullUpdatesTheSameItemIds() {
        val morning = listOf(fg(at(20, 9, 0), "com.example.writer"), bg(at(20, 9, 10), "com.example.writer"))
        val evening = morning + listOf(fg(at(20, 18, 0), "com.example.writer"), bg(at(20, 18, 30), "com.example.writer"))
        val first = UsageAggregator.toItems(UsageAggregator.totals(morning, at(20, 0), at(20, 12), zone, categoryOf))
        val second = UsageAggregator.toItems(UsageAggregator.totals(evening, at(20, 0), at(20, 20), zone, categoryOf))
        assertEquals(first.map { it.id }, second.map { it.id })
        assertEquals("10 minutes in productivity apps.", first.single().summary)
        assertEquals("40 minutes in productivity apps.", second.single().summary)
    }

    @Test
    fun windowStartsAtLocalMidnightOfYesterday() {
        assertEquals(at(19, 0), AppUsageCollector.startOfYesterday(at(20, 14, 30), zone))
        assertEquals(at(19, 0), AppUsageCollector.startOfYesterday(at(20, 0, 0), zone))
    }

    @Test
    fun aLateStopOfTheAppsPreviousScreenDoesNotEndTheNewScreen() {
        // Paused, resumed, stopped: the order Android reports when an app moves to another of its screens.
        val events = listOf(
            fg(at(20, 9, 0), "com.example.chat", ".Main"),
            bg(at(20, 9, 1), "com.example.chat", ".Main"),
            fg(at(20, 9, 1), "com.example.chat", ".SignIn"),
            bg(at(20, 9, 1, 1), "com.example.chat", ".Main"),
            bg(at(20, 9, 21), "com.example.chat", ".SignIn"),
            fg(at(20, 10, 0), "com.example.clips", ".Launcher"),
            bg(at(20, 10, 0, 1), "com.example.clips", ".Launcher"),
            fg(at(20, 10, 0, 1), "com.example.clips", ".Player"),
            bg(at(20, 10, 0, 2), "com.example.clips", ".Launcher"),
            bg(at(20, 10, 10), "com.example.clips", ".Player"),
        )
        assertEquals(
            mapOf(
                ("2026-10-20" to UsageCategory.COMMUNICATION) to 21L,
                ("2026-10-20" to UsageCategory.VIDEO) to 10L,
            ),
            totals(events),
        )
    }
}
