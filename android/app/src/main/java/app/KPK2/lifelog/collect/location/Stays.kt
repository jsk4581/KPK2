package app.KPK2.lifelog.collect.location

import app.KPK2.lifelog.data.LifelogItem
import app.KPK2.lifelog.sources.SourceId
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.ZoneId
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

/** One location reading taken on this phone. Raw coordinates; they stay on the device. */
data class PlaceSample(
    val timeMillis: Long,
    val lat: Double,
    val lon: Double,
    /** Horizontal accuracy radius in meters, when the provider reported one. */
    val accuracyM: Float? = null,
)

/** Consecutive samples taken at one place. Never empty, ordered by time. */
data class Stay(val samples: List<PlaceSample>) {
    init {
        require(samples.isNotEmpty()) { "a stay needs at least one sample" }
    }

    val startMillis: Long get() = samples.first().timeMillis
    val endMillis: Long get() = samples.last().timeMillis

    /** Whole minutes between the first and the last sample. A single sample is a 0 minute stay. */
    val durationMinutes: Long get() = (endMillis - startMillis) / 60_000L

    val centerLat: Double get() = samples.sumOf { it.lat } / samples.size
    val centerLon: Double get() = samples.sumOf { it.lon } / samples.size
}

/** Pure stay logic: grouping samples, rounding for export, and turning a stay into a lifelog item. */
object Stays {
    /** A sample joins the current stay when it is at most this far from the stay's center. */
    const val RADIUS_M = 150.0

    /**
     * A sample also starts a new stay when the previous sample is older than this. Samples are taken
     * when the app opens, so a long silence says nothing about where the person was in between.
     */
    const val MAX_GAP_MILLIS = 4 * 60 * 60 * 1000L

    /** Exported coordinates keep this many decimals: about 1 km. */
    const val EXPORT_DECIMALS = 2

    const val TITLE = "Stay"
    const val TAG = "stay"
    private const val ID_PREFIX = "location-stay-"
    private const val EARTH_RADIUS_M = 6_371_008.8

    /** Groups [samples] (any order) into stays of consecutive samples within [RADIUS_M] of each other's center. */
    fun group(samples: List<PlaceSample>): List<Stay> {
        val stays = mutableListOf<Stay>()
        samples.sortedBy { it.timeMillis }.forEach { sample ->
            val current = stays.lastOrNull()
            if (current != null && joins(current, sample)) {
                stays[stays.lastIndex] = Stay(current.samples + sample)
            } else {
                stays += Stay(listOf(sample))
            }
        }
        return stays
    }

    /** True when [sample] continues [stay]: not earlier than its end, within the gap, and within the radius. */
    fun joins(stay: Stay, sample: PlaceSample): Boolean {
        val gap = sample.timeMillis - stay.endMillis
        return gap in 0..MAX_GAP_MILLIS &&
            distanceMeters(stay.centerLat, stay.centerLon, sample.lat, sample.lon) <= RADIUS_M
    }

    /** Great-circle distance in meters. */
    fun distanceMeters(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val h = sin(dLat / 2).pow(2) + cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLon / 2).pow(2)
        return 2 * EARTH_RADIUS_M * asin(sqrt(h.coerceIn(0.0, 1.0)))
    }

    /** A coordinate rounded half up to [EXPORT_DECIMALS] decimals, as text. Never prints "-0.00". */
    fun roundForExport(value: Double): String =
        BigDecimal.valueOf(value).setScale(EXPORT_DECIMALS, RoundingMode.HALF_UP).toPlainString()

    /** The exported summary: duration and the rounded center, never the raw samples. */
    fun summary(stay: Stay): String =
        "${stay.durationMinutes} min at ${roundForExport(stay.centerLat)}, ${roundForExport(stay.centerLon)}"

    /** Stable id: a stay keeps the time of its first sample while it grows. */
    fun itemId(stay: Stay): String = ID_PREFIX + stay.startMillis

    /** The lifelog item for [stay]. Raw samples go only into the device-only [LifelogItem.raw] field. */
    fun toItem(stay: Stay, zone: ZoneId = ZoneId.systemDefault()): LifelogItem = LifelogItem(
        id = itemId(stay),
        date = LifelogItem.dateOf(stay.startMillis, zone),
        source = SourceId.LOCATION.wire,
        title = TITLE,
        summary = summary(stay),
        tags = listOf(TAG),
        url = null,
        raw = SampleCodec.encode(stay.samples),
    )
}
