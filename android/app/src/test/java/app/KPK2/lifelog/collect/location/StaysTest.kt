package app.KPK2.lifelog.collect.location

import app.KPK2.lifelog.export.LifelogExporter
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.ZoneOffset

/** Fictional coordinates around an arbitrary point; 0.001 degrees of latitude is about 111 m. */
class StaysTest {
    private val baseLat = 40.123456
    private val baseLon = -75.654321
    private val t0 = 1_790_000_000_000L
    private val minute = 60_000L

    private fun at(minutes: Long, northMeters: Double = 0.0, lon: Double = baseLon) =
        PlaceSample(t0 + minutes * minute, baseLat + northMeters / 111_195.0, lon, accuracyM = 20f)

    @Test
    fun consecutiveSamplesWithin150mFormOneStay() {
        val stays = Stays.group(listOf(at(0), at(20, 60.0), at(45, -40.0)))
        assertEquals(1, stays.size)
        assertEquals(3, stays.single().samples.size)
        assertEquals(45L, stays.single().durationMinutes)
    }

    @Test
    fun sampleBeyond150mFromCenterStartsANewStay() {
        val stays = Stays.group(listOf(at(0), at(10), at(30, 160.0)))
        assertEquals(listOf(2, 1), stays.map { it.samples.size })
    }

    @Test
    fun radiusBoundaryIsInclusiveAt140AndExclusiveAt160() {
        val stay = Stay(listOf(at(0)))
        assertTrue(Stays.joins(stay, at(5, 140.0)))
        assertFalse(Stays.joins(stay, at(5, 160.0)))
    }

    @Test
    fun returningToAnEarlierPlaceIsANewStayBecauseOnlyConsecutiveSamplesGroup() {
        val stays = Stays.group(listOf(at(0), at(30, 2_000.0), at(60)))
        assertEquals(3, stays.size)
        assertEquals(stays[0].centerLat, stays[2].centerLat, 1e-9)
    }

    @Test
    fun aLongSilenceSplitsTheSamePlaceIntoTwoStays() {
        val gapMinutes = Stays.MAX_GAP_MILLIS / minute
        assertEquals(1, Stays.group(listOf(at(0), at(gapMinutes))).size)
        assertEquals(2, Stays.group(listOf(at(0), at(gapMinutes + 1))).size)
    }

    @Test
    fun samplesAreGroupedInTimeOrderWhateverTheInputOrder() {
        val stays = Stays.group(listOf(at(40), at(0, 2_000.0), at(20)))
        assertEquals(listOf(t0, t0 + 20 * minute), stays.map { it.startMillis })
    }

    @Test
    fun anEarlierSampleNeverExtendsAStay() {
        assertFalse(Stays.joins(Stay(listOf(at(30))), at(10)))
    }

    @Test
    fun exportRoundingIsHalfUpToTwoDecimals() {
        assertEquals("40.12", Stays.roundForExport(40.123456))
        assertEquals("37.78", Stays.roundForExport(37.775))
        assertEquals("-75.65", Stays.roundForExport(-75.654321))
        assertEquals("-122.42", Stays.roundForExport(-122.415))
        assertEquals("10.00", Stays.roundForExport(9.999))
        assertEquals("0.00", Stays.roundForExport(-0.004))
    }

    @Test
    fun stayItemCarriesDurationAndRoundedCenterOnly() {
        val stay = Stays.group(listOf(at(0), at(95, 30.0))).single()
        val item = Stays.toItem(stay, ZoneOffset.UTC)

        assertEquals("location-stay-$t0", item.id)
        assertEquals("2026-09-21", item.date)
        assertEquals("location", item.source)
        assertEquals("Stay", item.title)
        assertEquals("95 min at 40.12, -75.65", item.summary)
        assertEquals(listOf("stay"), item.tags)
        assertNull(item.url)
        assertEquals(stay.samples, SampleCodec.decode(item.raw))
    }

    @Test
    fun exportNeverContainsRawCoordinates() {
        val item = Stays.toItem(Stays.group(listOf(at(0), at(15))).single(), ZoneOffset.UTC)
        val exported = LifelogExporter.toJson(listOf(item))

        assertTrue(item.raw!!.contains("40.123456"))
        assertFalse(exported.contains("40.123"))
        assertFalse(exported.contains("75.654"))
        assertTrue(exported.contains("15 min at 40.12, -75.65"))
    }

    @Test
    fun distanceMatchesAKnownSpan() {
        val oneKmNorth = Stays.distanceMeters(baseLat, baseLon, baseLat + 1_000.0 / 111_195.0, baseLon)
        assertEquals(1_000.0, oneKmNorth, 1.0)
    }

    @Test
    fun codecRejectsMissingOrMalformedRaw() {
        assertNull(SampleCodec.decode(null))
        assertNull(SampleCodec.decode("not json"))
        assertNull(SampleCodec.decode("""{"samples":[]}"""))
        val noAccuracy = listOf(PlaceSample(t0, 1.5, -2.5, null))
        assertEquals(noAccuracy, SampleCodec.decode(SampleCodec.encode(noAccuracy)))
    }
}
