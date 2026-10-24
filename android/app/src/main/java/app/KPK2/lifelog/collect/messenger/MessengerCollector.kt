package app.KPK2.lifelog.collect.messenger

import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.service.notification.NotificationListenerService
import androidx.core.app.NotificationManagerCompat
import app.KPK2.lifelog.data.LifelogRepository
import app.KPK2.lifelog.sources.Collector
import app.KPK2.lifelog.sources.SourceId

/**
 * Messages from messaging apps, read from their notifications by [MessengerListener]. Off until the
 * person turns it on and grants notification access. Items keep the app name and a short excerpt of
 * the text; sender names are never stored.
 */
class MessengerCollector : Collector {
    override val id: SourceId = SourceId.MESSENGER

    override fun hasAccess(context: Context): Boolean =
        context.packageName in NotificationManagerCompat.getEnabledListenerPackages(context)

    /** Opens this app's notification access page (Android 11+), or the list of listeners before that. */
    override fun accessSettingsIntent(context: Context): Intent {
        val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS).putExtra(
                Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
                MessengerListener.componentName(context).flattenToString(),
            )
        } else {
            Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        }
        return intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }

    /** The listener records on its own; make sure the system has it bound when the source turns on. */
    override fun start(context: Context, repository: LifelogRepository) {
        runCatching { NotificationListenerService.requestRebind(MessengerListener.componentName(context)) }
    }
}
