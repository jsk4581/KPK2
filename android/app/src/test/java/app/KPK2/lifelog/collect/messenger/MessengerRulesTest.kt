package app.KPK2.lifelog.collect.messenger

import android.app.Notification
import app.KPK2.lifelog.export.LifelogExporter
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MessengerRulesTest {
    private val own = "app.KPK2.lifelog"

    private fun notice(
        pkg: String = "org.telegram.messenger",
        key: String = "0|org.telegram.messenger|7|null|10123",
        category: String? = null,
        messagingStyle: Boolean = false,
        groupSummary: Boolean = false,
        ongoing: Boolean = false,
        text: String? = "Can you send the revised brief by Friday?",
        speakers: List<String> = emptyList(),
        postedAt: Long = 1_792_000_000_000L,
    ) = MessengerNotice(pkg, key, postedAt, category, messagingStyle, groupSummary, ongoing, text, speakers)

    @Test
    fun allowlistedAppsCountWithoutMessagingStyle() {
        assertTrue(MessengerRules.isMessage(notice(), own))
        assertTrue(MessengerRules.isMessage(notice(pkg = "com.Slack"), own))
    }

    @Test
    fun otherAppsCountOnlyWithMessagingStyleOrTheMessageCategory() {
        val other = "com.example.chat"
        assertFalse(MessengerRules.isMessage(notice(pkg = other), own))
        assertTrue(MessengerRules.isMessage(notice(pkg = other, messagingStyle = true), own))
        assertTrue(MessengerRules.isMessage(notice(pkg = other, category = Notification.CATEGORY_MESSAGE), own))
        assertFalse(MessengerRules.isMessage(notice(pkg = other, category = Notification.CATEGORY_EMAIL), own))
    }

    @Test
    fun summariesOngoingHousekeepingOwnAndTextMessageAppsAreSkipped() {
        assertFalse(MessengerRules.isMessage(notice(groupSummary = true), own))
        assertFalse(MessengerRules.isMessage(notice(ongoing = true), own))
        assertFalse(MessengerRules.isMessage(notice(category = Notification.CATEGORY_PROGRESS), own))
        assertFalse(MessengerRules.isMessage(notice(pkg = own, messagingStyle = true), own))
        assertFalse(MessengerRules.isMessage(notice(pkg = "com.google.android.apps.messaging", messagingStyle = true), own))
        val defaultSms = MessengerRules.SMS_APPS + "com.example.sms"
        assertFalse(MessengerRules.isMessage(notice(pkg = "com.example.sms", messagingStyle = true), own, defaultSms))
    }

    @Test
    fun emptyTextIsSkipped() {
        assertFalse(MessengerRules.isMessage(notice(text = null), own))
        assertFalse(MessengerRules.isMessage(notice(text = "   "), own))
    }

    @Test
    fun shortTextIsKeptWithWhitespaceCollapsed() {
        assertEquals("See you at 3pm. Bring the deck.", MessengerRules.summaryOf("See you at 3pm.\n\nBring   the deck."))
        assertNull(MessengerRules.summaryOf("  \n "))
        assertNull(MessengerRules.summaryOf(null))
    }

    @Test
    fun longTextIsCutAtAWordBoundaryWithAnEllipsis() {
        val words = (1..40).joinToString(" ") { "word$it" }
        val summary = MessengerRules.summaryOf(words)!!
        assertTrue(summary.endsWith(MessengerRules.ELLIPSIS))
        val body = summary.removeSuffix(MessengerRules.ELLIPSIS)
        assertTrue(body.length <= MessengerRules.SUMMARY_LIMIT)
        assertTrue(words.startsWith(body))
        assertTrue("cut must fall between words", words[body.length] == ' ')
    }

    @Test
    fun textOfExactlyTheLimitIsNotShortened() {
        val exact = "a".repeat(MessengerRules.SUMMARY_LIMIT)
        assertEquals(exact, MessengerRules.summaryOf(exact))
    }

    @Test
    fun aSingleLongWordIsCutAtTheLimit() {
        val summary = MessengerRules.summaryOf("x".repeat(300))!!
        assertEquals("x".repeat(MessengerRules.SUMMARY_LIMIT) + MessengerRules.ELLIPSIS, summary)
    }

    @Test
    fun cutEndingInPunctuationDropsTheDanglingMark() {
        val text = "a".repeat(110) + " bbbbbbb, " + "c".repeat(40)
        assertEquals("a".repeat(110) + " bbbbbbb" + MessengerRules.ELLIPSIS, MessengerRules.summaryOf(text))
    }

    @Test
    fun aLeadingSpeakerNameIsRemoved() {
        assertEquals("Running ten minutes late", MessengerRules.summaryOf("Riley Sample: Running ten minutes late", listOf("Riley Sample")))
        assertEquals("Note: rates go up in May", MessengerRules.summaryOf("Note: rates go up in May", listOf("Riley Sample")))
    }

    @Test
    fun itemCarriesAppLabelAndExcerptButNoSenderOrKey() {
        val n = notice(text = "Riley Sample: Loved the draft, call me", speakers = listOf("Riley Sample"))
        val summary = MessengerRules.summaryOf(n.text, n.speakers)!!
        val item = MessengerRules.toItem(n, "Telegram", summary, ZoneId.of("America/New_York"))

        assertEquals("messenger", item.source)
        assertEquals("Message in Telegram", item.title)
        assertEquals("Loved the draft, call me", item.summary)
        assertEquals("2026-10-14", item.date)
        assertEquals(emptyList<String>(), item.tags)
        assertNull(item.url)
        assertTrue(item.id.matches(Regex("messenger-[0-9a-f]{16}")))

        val exported = LifelogExporter.toJson(listOf(item))
        assertFalse(exported.contains("Riley"))
        assertFalse(exported.contains("10123"))
        assertFalse(exported.contains("org.telegram.messenger"))
    }

    @Test
    fun itemIdIsStablePerKeyAndPostTime() {
        assertEquals(MessengerRules.itemId("k1", 1000L), MessengerRules.itemId("k1", 1000L))
        assertNotEquals(MessengerRules.itemId("k1", 1000L), MessengerRules.itemId("k1", 61_000L))
        assertNotEquals(MessengerRules.itemId("k1", 1000L), MessengerRules.itemId("k2", 1000L))
    }
}
