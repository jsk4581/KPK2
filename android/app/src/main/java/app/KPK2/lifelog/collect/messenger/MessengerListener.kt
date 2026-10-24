package app.KPK2.lifelog.collect.messenger

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.provider.Telephony
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import app.KPK2.lifelog.LifelogApp
import app.KPK2.lifelog.sources.CollectorRegistry
import app.KPK2.lifelog.sources.SourceId
import app.KPK2.lifelog.sources.SourcePolicy
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Receives posted notifications once the person grants notification access. It writes an item only
 * while the messenger source is switched on; otherwise every notification is ignored without being read.
 */
class MessengerListener : NotificationListenerService() {

    private val recorder by lazy {
        MessengerRecorder(
            ownPackage = packageName,
            smsPackages = { MessengerRules.SMS_APPS + listOfNotNull(defaultSmsPackage(this)) },
            appLabel = { pkg -> labelOf(this, pkg) },
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val graph = (applicationContext as? LifelogApp)?.graph ?: return
        try {
            val choice = graph.sourceSettings.current()[SourceId.MESSENGER]
            // Reaching this callback means access is granted; the person's choice decides the rest.
            if (!SourcePolicy.isOn(CollectorRegistry.forSource(SourceId.MESSENGER), choice, accessGranted = true)) return
            val item = recorder.itemFor(MessengerNotice.from(sbn)) ?: return
            graph.appScope.launch(Dispatchers.IO) {
                runCatching { graph.repository.record(item) }.onFailure { Log.w(TAG, "could not record message", it) }
            }
        } catch (e: RuntimeException) {
            // One malformed notification must not stop the listener.
            Log.w(TAG, "skipped a notification", e)
        }
    }

    override fun onListenerDisconnected() {
        // The system can unbind a listener under memory pressure; ask to be bound again.
        runCatching { requestRebind(componentName(this)) }
    }

    companion object {
        private const val TAG = "MessengerListener"

        fun componentName(context: Context) = ComponentName(context, MessengerListener::class.java)

        private fun defaultSmsPackage(context: Context): String? =
            runCatching { Telephony.Sms.getDefaultSmsPackage(context) }.getOrNull()

        /** The installed app's label, or null when it is not visible to this app. */
        private fun labelOf(context: Context, packageName: String): String? = try {
            val pm = context.packageManager
            pm.getApplicationLabel(pm.getApplicationInfo(packageName, 0)).toString()
        } catch (e: PackageManager.NameNotFoundException) {
            null
        }
    }
}
