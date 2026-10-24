package app.KPK2.lifelog.collect.sms

import java.time.ZoneId
import java.time.ZoneOffset
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SmsItemsTest {
    private val salt = ByteArray(32) { it.toByte() }
    private val utc: ZoneId = ZoneOffset.UTC

    // 2026-10-20T15:30:00Z
    private val oct20 = 1_792_510_200_000L

    @Test
    fun shortBodyIsKeptWhole() {
        assertEquals("Can we move the call to 3pm?", SmsItems.summary("  Can we move the call to 3pm?  "))
    }

    @Test
    fun whitespaceAndLineBreaksCollapse() {
        assertEquals("Draft is in. Notes below.", SmsItems.summary("Draft is in.\n\n  Notes\tbelow."))
    }

    @Test
    fun bodyOfExactlyTheLimitHasNoEllipsis() {
        val body = "a".repeat(SmsItems.SUMMARY_LIMIT)
        assertEquals(body, SmsItems.summary(body))
    }

    @Test
    fun longBodyIsCutAtTheLastWordBoundaryWithAnEllipsis() {
        val body = "Hi, this is the studio. We loved the landing page copy and want to talk about a longer " +
            "retainer for the spring launch, including two product pages and an email series."
        val summary = SmsItems.summary(body)
        assertTrue(summary.endsWith(SmsItems.ELLIPSIS))
        val kept = summary.removeSuffix(SmsItems.ELLIPSIS)
        assertTrue(kept.length <= SmsItems.SUMMARY_LIMIT)
        assertTrue(body.startsWith(kept))
        assertFalse("cut mid-word: '$kept'", body[kept.length].isLetterOrDigit())
        assertEquals(
            "Hi, this is the studio. We loved the landing page copy and want to talk about a longer retainer " +
                "for the spring launch…",
            summary,
        )
    }

    @Test
    fun cutThatEndsOnAWholeWordKeepsIt() {
        val first = "word ".repeat(24).trimEnd() // 119 characters
        val body = "${first}s more text follows here"
        assertEquals(120, "${first}s".length)
        assertEquals("${first}s${SmsItems.ELLIPSIS}", SmsItems.summary(body))
    }

    @Test
    fun trailingPunctuationIsDroppedBeforeTheEllipsis() {
        val body = "x".repeat(110) + " yes, " + "y".repeat(30)
        assertEquals("x".repeat(110) + " yes" + SmsItems.ELLIPSIS, SmsItems.summary(body))
    }

    @Test
    fun singleLongWordIsCutAtTheLimit() {
        val body = "https://example.com/" + "z".repeat(200)
        val summary = SmsItems.summary(body)
        assertEquals(SmsItems.SUMMARY_LIMIT + 1, summary.length)
        assertTrue(summary.endsWith(SmsItems.ELLIPSIS))
    }

    @Test
    fun surrogatePairIsNeverSplit() {
        val body = "q".repeat(SmsItems.SUMMARY_LIMIT - 1) + "😀" + "tail"
        val summary = SmsItems.summary(body)
        assertEquals("q".repeat(SmsItems.SUMMARY_LIMIT - 1) + SmsItems.ELLIPSIS, summary)
    }

    @Test
    fun emptyBodyGivesAnEmptySummary() {
        assertEquals("", SmsItems.summary("   "))
    }

    @Test
    fun itemCarriesDirectionDaySummaryAndNoContactDetails() {
        val record = SmsRecord(SmsDirection.RECEIVED, oct20, "Invoice 0142 is paid, thanks!")
        val item = SmsItems.toItem(record, salt, utc)
        assertEquals("2026-10-20", item.date)
        assertEquals("sms", item.source)
        assertEquals("Message received", item.title)
        assertEquals("Invoice 0142 is paid, thanks!", item.summary)
        assertEquals(emptyList<String>(), item.tags)
        assertNull(item.url)
        assertNull(item.raw)
        assertTrue(item.id.startsWith("sms-"))

        val sent = SmsItems.toItem(record.copy(direction = SmsDirection.SENT), salt, utc)
        assertEquals("Message sent", sent.title)
    }

    @Test
    fun dayFollowsTheLocalZone() {
        val record = SmsRecord(SmsDirection.SENT, oct20, "Running late")
        assertEquals("2026-10-21", SmsItems.toItem(record, salt, ZoneId.of("Pacific/Auckland")).date)
    }

    @Test
    fun idIsStableAndDistinguishesMessages() {
        val record = SmsRecord(SmsDirection.RECEIVED, oct20, "See you at 10")
        val id = SmsItems.itemId(record, salt)
        assertEquals(id, SmsItems.itemId(record.copy(), salt))
        assertNotEquals(id, SmsItems.itemId(record.copy(direction = SmsDirection.SENT), salt))
        assertNotEquals(id, SmsItems.itemId(record.copy(timestampMillis = oct20 + 1000), salt))
        assertNotEquals(id, SmsItems.itemId(record.copy(body = "See you at 11"), salt))
        assertNotEquals(id, SmsItems.itemId(record, ByteArray(32) { 7 }))
        assertTrue(!id.contains("See"))
    }

    @Test
    fun multipartPartsJoinPerSenderAndDropTheAddress() {
        val parts = listOf(
            SmsPart("+1 555 0101", "Hello from the agency. ", oct20),
            SmsPart("+1 555 0101", "Here is part two.", oct20 + 5),
            SmsPart("+1 555 0102", "Separate note", oct20 + 9),
        )
        val records = SmsItems.joinParts(parts, fallbackMillis = 1L)
        assertEquals(
            listOf(
                SmsRecord(SmsDirection.RECEIVED, oct20, "Hello from the agency. Here is part two."),
                SmsRecord(SmsDirection.RECEIVED, oct20 + 9, "Separate note"),
            ),
            records,
        )
        assertTrue(records.none { it.toString().contains("555") })
    }

    @Test
    fun partWithoutTimestampUsesTheFallback() {
        val records = SmsItems.joinParts(listOf(SmsPart(null, null, 0L)), fallbackMillis = oct20)
        assertEquals(listOf(SmsRecord(SmsDirection.RECEIVED, oct20, "")), records)
    }

    @Test
    fun storeRowsMapToTheSameRecordTheReceiverSees() {
        val received = SmsItems.fromRow(SmsItems.TYPE_INBOX, "Ping", dateMillis = oct20 + 4000, dateSentMillis = oct20)
        assertEquals(SmsRecord(SmsDirection.RECEIVED, oct20, "Ping"), received)
        val noSentStamp = SmsItems.fromRow(SmsItems.TYPE_INBOX, "Ping", dateMillis = oct20 + 4000, dateSentMillis = 0)
        assertEquals(oct20 + 4000, noSentStamp?.timestampMillis)
        assertEquals(SmsRecord(SmsDirection.SENT, oct20, ""), SmsItems.fromRow(SmsItems.TYPE_SENT, null, oct20, 0))
        assertNull(SmsItems.fromRow(3, "draft", oct20, 0))

        val fromReceiver = SmsItems.joinParts(listOf(SmsPart("+1 555 0103", "Ping", oct20)), 0L).single()
        assertEquals(SmsItems.itemId(fromReceiver, salt), SmsItems.itemId(received!!, salt))
    }

    @Test
    fun firstReadGoesBackFourteenDaysThenFollowsTheCursor() {
        val day = 24L * 60 * 60 * 1000
        assertEquals(oct20 - 14 * day, SmsItems.readFrom(cursor = null, nowMillis = oct20))
        assertEquals(oct20 - day, SmsItems.readFrom(cursor = oct20 - day, nowMillis = oct20))
        assertEquals(oct20 - 14 * day, SmsItems.readFrom(cursor = oct20 + day, nowMillis = oct20))
    }
}
