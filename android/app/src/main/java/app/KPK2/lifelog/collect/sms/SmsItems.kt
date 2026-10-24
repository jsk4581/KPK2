package app.KPK2.lifelog.collect.sms

import app.KPK2.lifelog.data.LifelogItem
import app.KPK2.lifelog.sources.SourceId
import java.time.ZoneId
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/** Which way a text message went. */
enum class SmsDirection(val title: String) {
    RECEIVED("Message received"),
    SENT("Message sent"),
}

/**
 * One text message as the collector sees it, in memory only. There is deliberately no sender or
 * recipient field: the address is never read into this type, so it cannot be stored or exported.
 *
 * [timestampMillis] is the time both paths agree on for the same message: the sender's timestamp
 * for a received message (what the network stamped, also kept by the inbox as `date_sent`) and the
 * send time for a sent one.
 */
data class SmsRecord(
    val direction: SmsDirection,
    val timestampMillis: Long,
    val body: String,
)

/** One piece of a received broadcast. Long messages arrive split into several parts. */
data class SmsPart(val address: String?, val body: String?, val timestampMillis: Long)

/** Pure mapping from text messages to lifelog items. No Android types, so it is unit tested on the JVM. */
object SmsItems {
    const val SUMMARY_LIMIT = 120
    const val ELLIPSIS = "…"
    const val BACKFILL_DAYS = 14L
    private const val DAY_MILLIS = 24L * 60 * 60 * 1000

    /** Telephony.Sms.MESSAGE_TYPE_INBOX and MESSAGE_TYPE_SENT, kept here so this file stays Android-free. */
    const val TYPE_INBOX = 1
    const val TYPE_SENT = 2

    /**
     * The start of [body] for an item summary: whitespace collapsed to single spaces, then cut to at
     * most [limit] characters at the last word boundary, with an ellipsis when anything was dropped.
     * A single word longer than [limit] is cut mid-word. Never splits a surrogate pair.
     */
    fun summary(body: String, limit: Int = SUMMARY_LIMIT): String {
        val text = body.trim().replace(WHITESPACE, " ")
        if (text.length <= limit) return text

        var cut = limit
        // If the character right after the limit is a space, the first `limit` characters end on a whole word.
        if (text[limit] != ' ') {
            val lastSpace = text.lastIndexOf(' ', startIndex = limit - 1)
            if (lastSpace > 0) cut = lastSpace
        }
        if (Character.isHighSurrogate(text[cut - 1])) cut--
        val kept = text.substring(0, cut).trimEnd().trimEnd(*TRAILING_PUNCTUATION)
        return kept + ELLIPSIS
    }

    /**
     * A stable item id for [record]: an HMAC of direction, timestamp and body under a per-install
     * [salt]. The receiver and the inbox read derive the same id for the same message, so it is
     * recorded once. The salt keeps the id from being matched against guessed message texts.
     */
    fun itemId(record: SmsRecord, salt: ByteArray): String {
        require(salt.isNotEmpty()) { "salt must not be empty" }
        val mac = Mac.getInstance(HMAC).apply { init(SecretKeySpec(salt, HMAC)) }
        val digest = mac.doFinal("${record.direction.name}|${record.timestampMillis}|${record.body}".toByteArray())
        return SourceId.SMS.wire + "-" + digest.take(ID_BYTES).joinToString("") { "%02x".format(it) }
    }

    /** The lifelog item for one message. Only direction, day and the summary leave this function. */
    fun toItem(record: SmsRecord, salt: ByteArray, zone: ZoneId = ZoneId.systemDefault()): LifelogItem =
        LifelogItem(
            id = itemId(record, salt),
            date = LifelogItem.dateOf(record.timestampMillis, zone),
            source = SourceId.SMS.wire,
            title = record.direction.title,
            summary = summary(record.body),
            tags = emptyList(),
            url = null,
        )

    /**
     * Joins the parts of one received broadcast into whole messages. Parts are grouped by their
     * originating address only to put a long message back together; the address is dropped here.
     * Each message takes the timestamp of its first part, or [fallbackMillis] when the part has none.
     */
    fun joinParts(parts: List<SmsPart>, fallbackMillis: Long): List<SmsRecord> =
        parts.groupBy { it.address.orEmpty() }.values.map { group ->
            val stamp = group.first().timestampMillis
            SmsRecord(
                direction = SmsDirection.RECEIVED,
                timestampMillis = if (stamp > 0) stamp else fallbackMillis,
                body = group.joinToString("") { it.body.orEmpty() },
            )
        }

    /**
     * One row of the phone's message store to a record, or null for drafts, outbox and failed rows.
     * A received row uses its sender timestamp when present, matching what the receiver saw.
     */
    fun fromRow(type: Int, body: String?, dateMillis: Long, dateSentMillis: Long): SmsRecord? = when (type) {
        TYPE_INBOX -> SmsRecord(SmsDirection.RECEIVED, if (dateSentMillis > 0) dateSentMillis else dateMillis, body.orEmpty())
        TYPE_SENT -> SmsRecord(SmsDirection.SENT, dateMillis, body.orEmpty())
        else -> null
    }

    /**
     * Where the next read of the message store starts (exclusive, on the store's `date` column):
     * after [cursor], or [BACKFILL_DAYS] back from [nowMillis] on the first read. A cursor in the
     * future (the clock moved back) restarts the window so new messages are not skipped.
     */
    fun readFrom(cursor: Long?, nowMillis: Long): Long =
        if (cursor == null || cursor > nowMillis) nowMillis - BACKFILL_DAYS * DAY_MILLIS else cursor

    private val WHITESPACE = Regex("""\s+""")
    private val TRAILING_PUNCTUATION = charArrayOf(',', ';', ':', '-', '(')
    private const val HMAC = "HmacSHA256"
    private const val ID_BYTES = 12
}
