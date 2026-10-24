package app.KPK2.lifelog.data

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import java.time.Instant
import java.time.ZoneId

/**
 * One recorded life event. The first seven fields are the shared lifelog schema the career brain reads;
 * [recordedAt] and [raw] stay on the device and are never exported.
 */
@Entity(
    tableName = "lifelog_item",
    indices = [Index("date"), Index("source")],
)
data class LifelogItem(
    /** Stable and unique. Collectors derive it from on-device row ids or hashes, never from message text. */
    @PrimaryKey val id: String,
    /** Local calendar day of the event, YYYY-MM-DD. */
    val date: String,
    /** Wire name of the source, for example "calendar" or "saved_link". */
    val source: String,
    val title: String,
    val summary: String,
    val tags: List<String> = emptyList(),
    val url: String? = null,
    /** Epoch millis when the item was written to the store. */
    @ColumnInfo(name = "recorded_at") val recordedAt: Long = System.currentTimeMillis(),
    /** Optional source-specific detail kept for the person to review on this phone only. */
    val raw: String? = null,
) {
    init {
        require(id.isNotBlank()) { "id must not be blank" }
        require(DATE_PATTERN.matches(date)) { "date must be YYYY-MM-DD, was '$date'" }
    }

    companion object {
        private val DATE_PATTERN = Regex("""\d{4}-\d{2}-\d{2}""")

        /** The local calendar day of [epochMillis] in [zone], in the schema's YYYY-MM-DD form. */
        fun dateOf(epochMillis: Long, zone: ZoneId = ZoneId.systemDefault()): String =
            Instant.ofEpochMilli(epochMillis).atZone(zone).toLocalDate().toString()
    }
}

/**
 * The id of an item the person deleted. Collectors that pull again later must not bring it back,
 * so the store keeps only the id after the item itself is gone.
 */
@Entity(tableName = "deleted_item")
data class DeletedItem(@PrimaryKey val id: String)
