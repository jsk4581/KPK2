package app.KPK2.lifelog.collect.note

import app.KPK2.lifelog.data.LifelogItem
import app.KPK2.lifelog.data.LifelogRepository
import app.KPK2.lifelog.sources.Collector
import app.KPK2.lifelog.sources.SourceId
import java.security.MessageDigest
import java.time.ZoneId

/**
 * Quick notes the person writes on the Timeline. Nothing is read from the phone and no permission is
 * needed: an item exists only because the person typed it and pressed Save. There is nothing to
 * start, stop or pull, so the [Collector] defaults apply; turning the source off hides the composer.
 */
class NoteCollector : Collector {
    override val id: SourceId = SourceId.NOTE

    companion object {
        /**
         * Builds the item for [text] written at [writtenAt], or null when the text is blank.
         * The id is a hash of the moment and the text, so it is stable and carries no note content.
         * The full normalized text stays on the phone in [LifelogItem.raw]; only title, summary and
         * tags are exported.
         */
        fun itemFor(text: String, writtenAt: Long, zone: ZoneId = ZoneId.systemDefault()): LifelogItem? {
            val note = NoteText.parse(text) ?: return null
            return LifelogItem(
                id = idFor(note.text, writtenAt),
                date = LifelogItem.dateOf(writtenAt, zone),
                source = SourceId.NOTE.wire,
                title = note.title,
                summary = note.summary,
                tags = note.tags,
                url = null,
                recordedAt = writtenAt,
                raw = note.text,
            )
        }

        /** Saves [text] as a note item. Returns the saved item, or null when nothing was saved. */
        suspend fun save(
            repository: LifelogRepository,
            text: String,
            writtenAt: Long = System.currentTimeMillis(),
            zone: ZoneId = ZoneId.systemDefault(),
        ): LifelogItem? {
            val item = itemFor(text, writtenAt, zone) ?: return null
            return if (repository.record(item) == 1) item else null
        }

        internal fun idFor(text: String, writtenAt: Long): String {
            val digest = MessageDigest.getInstance("SHA-256").digest("$writtenAt\n$text".toByteArray(Charsets.UTF_8))
            val hex = digest.take(8).joinToString("") { "%02x".format(it) }
            return "${SourceId.NOTE.wire}-$hex"
        }
    }
}
