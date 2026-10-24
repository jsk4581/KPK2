package app.KPK2.lifelog.collect.location

import android.content.Context
import androidx.core.content.edit
import app.KPK2.lifelog.data.LifelogItem
import app.KPK2.lifelog.data.LifelogRepository
import java.time.ZoneId

/**
 * Remembers which stay item new samples may extend. Only the item id is kept (it carries a time,
 * no coordinates), so a stay the person deleted is never silently brought back or stretched.
 */
interface OpenStayMarker {
    fun get(): String?
    fun set(id: String)
}

/** [OpenStayMarker] in the app's private preferences, which backup rules exclude. */
class PrefsOpenStayMarker(context: Context) : OpenStayMarker {
    private val prefs = context.getSharedPreferences(FILE_NAME, Context.MODE_PRIVATE)

    override fun get(): String? = prefs.getString(KEY, null)

    override fun set(id: String) {
        prefs.edit { putString(KEY, id) }
    }

    private companion object {
        const val FILE_NAME = "location_collector"
        const val KEY = "open_stay_id"
    }
}

/**
 * Adds one sample to the lifelog: it extends the open stay when it [Stays.joins] it, otherwise it
 * starts a new stay. Not thread safe; the collector serializes calls.
 */
class StayRecorder(
    private val repository: LifelogRepository,
    private val marker: OpenStayMarker,
    private val zone: () -> ZoneId = ZoneId::systemDefault,
) {
    /** Returns the item written, or null when the store refused it (a deleted id). */
    suspend fun add(sample: PlaceSample): LifelogItem? {
        val open = openStay()
        val stay = if (open != null && Stays.joins(open, sample)) Stay(open.samples + sample) else Stay(listOf(sample))
        val item = Stays.toItem(stay, zone())
        val written = repository.record(item)
        if (written == 0) return null
        marker.set(item.id)
        return item
    }

    /** The stay the marker points at, if its item still exists and its samples are readable. */
    private suspend fun openStay(): Stay? {
        val id = marker.get() ?: return null
        val item = repository.snapshot().firstOrNull { it.id == id } ?: return null
        return SampleCodec.decode(item.raw)?.let { Stay(it.sortedBy { s -> s.timeMillis }) }
    }
}
