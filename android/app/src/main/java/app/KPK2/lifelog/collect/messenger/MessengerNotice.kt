package app.KPK2.lifelog.collect.messenger

import android.app.Notification
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat

/**
 * The parts of a posted notification the messenger source looks at, read once on the listener thread.
 * [speakers] holds names that may prefix the text ("Name: hello"); they are used only to strip that
 * prefix and are never stored.
 */
data class MessengerNotice(
    val packageName: String,
    /** The system notification key; stays the same while an app updates one notification. */
    val key: String,
    val postedAt: Long,
    val category: String?,
    val messagingStyle: Boolean,
    val groupSummary: Boolean,
    val ongoing: Boolean,
    val text: String?,
    val speakers: List<String> = emptyList(),
) {
    companion object {
        fun from(sbn: StatusBarNotification): MessengerNotice =
            from(sbn.packageName, sbn.key, sbn.postTime, sbn.notification)

        /**
         * Reads the newest message of a MessagingStyle notification, or the big text or text of any other
         * notification. The notification title is read only as a speaker name to strip.
         */
        fun from(packageName: String, key: String, postedAt: Long, notification: Notification): MessengerNotice {
            val extras = notification.extras
            val style = runCatching {
                NotificationCompat.MessagingStyle.extractMessagingStyleFromNotification(notification)
            }.getOrNull()
            val newest = style?.messages?.lastOrNull { !it.text.isNullOrBlank() }
            val plainText = extras?.getCharSequence(Notification.EXTRA_BIG_TEXT)
                ?: extras?.getCharSequence(Notification.EXTRA_TEXT)
            val speakers = listOfNotNull(
                newest?.person?.name?.toString(),
                extras?.getCharSequence(Notification.EXTRA_TITLE)?.toString(),
            ).filter { it.isNotBlank() }.distinct()
            return MessengerNotice(
                packageName = packageName,
                key = key,
                postedAt = postedAt,
                category = notification.category,
                messagingStyle = style != null,
                groupSummary = notification.flags and Notification.FLAG_GROUP_SUMMARY != 0,
                ongoing = notification.flags and
                    (Notification.FLAG_ONGOING_EVENT or Notification.FLAG_FOREGROUND_SERVICE) != 0,
                text = (newest?.text ?: plainText)?.toString(),
                speakers = speakers,
            )
        }
    }
}
