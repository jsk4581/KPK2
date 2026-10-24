package app.KPK2.lifelog.collect.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import app.KPK2.lifelog.appGraph
import app.KPK2.lifelog.sources.CollectorRegistry
import app.KPK2.lifelog.sources.SourceId
import app.KPK2.lifelog.sources.SourcePolicy
import kotlinx.coroutines.launch

/**
 * Turns each incoming text message into a lifelog item while the SMS source is on. The broadcast
 * is checked against the person's choice and the granted permissions before anything is read, and
 * the sender address is used only to put multipart messages back together, then dropped.
 */
class SmsReceivedReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        try {
            val collector = CollectorRegistry.forSource(SourceId.SMS) as? SmsCollector ?: return
            val graph = context.appGraph
            val choice = graph.sourceSettings.current()[SourceId.SMS]
            if (!SourcePolicy.isOn(collector, choice, collector.hasAccess(context))) return

            val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent).orEmpty().filterNotNull().map {
                SmsPart(it.originatingAddress, it.messageBody, it.timestampMillis)
            }
            val records = SmsItems.joinParts(parts, fallbackMillis = System.currentTimeMillis())
            if (records.isEmpty()) return

            val pending = goAsync()
            graph.appScope.launch {
                try {
                    collector.recordReceived(context.applicationContext, graph.repository, records)
                } catch (e: Exception) {
                    Log.w(TAG, "could not record incoming message", e)
                } finally {
                    pending.finish()
                }
            }
        } catch (e: Exception) {
            // A malformed broadcast must never crash the app.
            Log.w(TAG, "ignored incoming message broadcast", e)
        }
    }

    private companion object {
        const val TAG = "SmsReceivedReceiver"
    }
}
