package app.KPK2.lifelog.collect.savedlink

import app.KPK2.lifelog.sources.SourceId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.UUID

class SavedLinkItemsTest {
    private val zone = ZoneId.of("America/Chicago")
    private val link = SharedLink("https://example.com/guides/workshops", "Short workshops", "Saved for the Tuesday call")

    @Test
    fun itemCarriesTheLinkTheSenderAndTheLocalDay() {
        // 23:30 local on Oct 20 is already Oct 21 in UTC; the item keeps the local day.
        val at = ZonedDateTime.of(2026, 10, 20, 23, 30, 0, 0, zone).toInstant().toEpochMilli()
        val item = SavedLinkItems.build(link, "com.example.reader", "Saved for the Tuesday call https://example.com/guides/workshops", at, zone)

        assertEquals("2026-10-20", item.date)
        assertEquals("saved_link", item.source)
        assertEquals("Short workshops", item.title)
        assertEquals("Saved for the Tuesday call", item.summary)
        assertEquals(listOf("com.example.reader"), item.tags)
        assertEquals("https://example.com/guides/workshops", item.url)
        assertEquals(at, item.recordedAt)
        assertTrue(item.id.startsWith("saved_link-$at-"))
    }

    @Test
    fun unknownSenderMeansNoTags() {
        assertEquals(emptyList<String>(), SavedLinkItems.build(link, null, null, 0L, zone).tags)
    }

    @Test
    fun sharingTheSameLinkAgainMakesANewItem() {
        val first = SavedLinkItems.build(link, null, null, 1_000L, zone)
        val again = SavedLinkItems.build(link, null, null, 1_000L, zone)
        assertNotEquals(first.id, again.id)
        assertEquals(first.url, again.url)
        assertEquals(
            "saved_link-5-00000000-0000-0001-0000-000000000002",
            SavedLinkItems.newId(5L, UUID(1L, 2L)),
        )
    }

    @Test
    fun rawTextIsCappedForOnDeviceReview() {
        val item = SavedLinkItems.build(link, null, "y".repeat(10_000), 0L, zone)
        assertEquals(SavedLinkItems.MAX_RAW, item.raw!!.length)
    }

    @Test
    fun anOffSourceRecordsNothingEvenWithALink() {
        assertEquals(ShareOutcome.SourceOff, ShareOutcome.before(sourceOn = false, link = link))
        assertEquals(ShareOutcome.SourceOff, ShareOutcome.before(sourceOn = false, link = null))
        assertEquals(ShareOutcome.NoLink, ShareOutcome.before(sourceOn = true, link = null))
        assertEquals(ShareOutcome.Saved(link), ShareOutcome.before(sourceOn = true, link = link))
    }

    @Test
    fun collectorIsTheSavedLinkSourceAndNeedsNoPermission() {
        val collector = SavedLinkCollector()
        assertEquals(SourceId.SAVED_LINK, collector.id)
        assertEquals(emptyList<String>(), collector.requiredPermissions)
        assertEquals(false, collector.pullsPeriodically)
        assertTrue(collector.defaultEnabled)
    }
}
