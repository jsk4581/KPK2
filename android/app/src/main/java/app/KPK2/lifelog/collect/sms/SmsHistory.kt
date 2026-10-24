package app.KPK2.lifelog.collect.sms

import android.content.ContentResolver
import android.provider.Telephony

/** A message read from the phone's store, with the store's `date` so the reader can keep a cursor. */
data class StoredSms(val record: SmsRecord, val storedAtMillis: Long)

/** Reads received and sent text messages already on the phone. */
fun interface SmsHistory {
    /** Messages whose store `date` is after [fromExclusiveMillis], oldest first. */
    fun readSince(fromExclusiveMillis: Long): List<StoredSms>
}

/**
 * Reads the system message store. Only type, body and the two timestamps are queried: the address
 * column is never requested, so no sender or recipient reaches this app's memory from here.
 */
class ProviderSmsHistory(private val resolver: ContentResolver) : SmsHistory {
    override fun readSince(fromExclusiveMillis: Long): List<StoredSms> {
        val out = mutableListOf<StoredSms>()
        resolver.query(
            Telephony.Sms.CONTENT_URI,
            arrayOf(Telephony.Sms.TYPE, Telephony.Sms.BODY, Telephony.Sms.DATE, Telephony.Sms.DATE_SENT),
            "${Telephony.Sms.DATE} > ? AND ${Telephony.Sms.TYPE} IN (?, ?)",
            arrayOf(
                fromExclusiveMillis.toString(),
                Telephony.Sms.MESSAGE_TYPE_INBOX.toString(),
                Telephony.Sms.MESSAGE_TYPE_SENT.toString(),
            ),
            "${Telephony.Sms.DATE} ASC",
        )?.use { cursor ->
            while (cursor.moveToNext()) {
                val date = cursor.getLong(2)
                val dateSent = if (cursor.isNull(3)) 0L else cursor.getLong(3)
                val record = SmsItems.fromRow(cursor.getInt(0), cursor.getString(1), date, dateSent) ?: continue
                out += StoredSms(record, date)
            }
        }
        return out
    }
}
