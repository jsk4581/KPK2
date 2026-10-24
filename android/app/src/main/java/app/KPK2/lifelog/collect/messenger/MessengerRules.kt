package app.KPK2.lifelog.collect.messenger

import android.app.Notification
import app.KPK2.lifelog.data.LifelogItem
import app.KPK2.lifelog.sources.SourceId
import java.security.MessageDigest
import java.time.ZoneId

/** Which notifications count as messages, and how one becomes a lifelog item. Pure, so it is unit tested. */
object MessengerRules {

    /** Common messaging apps whose notifications count even without MessagingStyle, with display names. */
    val MESSAGING_APPS: Map<String, String> = mapOf(
        "com.whatsapp" to "WhatsApp",
        "com.whatsapp.w4b" to "WhatsApp Business",
        "org.telegram.messenger" to "Telegram",
        "org.thoughtcrime.securesms" to "Signal",
        "com.facebook.orca" to "Messenger",
        "com.Slack" to "Slack",
        "com.discord" to "Discord",
        "com.microsoft.teams" to "Microsoft Teams",
        "com.google.android.apps.dynamite" to "Google Chat",
        "jp.naver.line.android" to "LINE",
        "com.viber.voip" to "Viber",
        "com.kakao.talk" to "KakaoTalk",
        "com.tencent.mm" to "WeChat",
    )

    /**
     * Text message apps. Their notifications belong to the separate "sms" source, which has its own
     * consent, so the messenger source never records them. The phone's default SMS app is added at runtime.
     */
    val SMS_APPS: Set<String> = setOf(
        "com.google.android.apps.messaging",
        "com.samsung.android.messaging",
        "com.android.mms",
        "com.android.messaging",
    )

    /** Housekeeping categories that are never a message, even from a messaging app. */
    private val NOT_A_MESSAGE = setOf(
        Notification.CATEGORY_PROGRESS,
        Notification.CATEGORY_SERVICE,
        Notification.CATEGORY_STATUS,
        Notification.CATEGORY_SYSTEM,
        Notification.CATEGORY_ERROR,
        Notification.CATEGORY_CALL,
        Notification.CATEGORY_MISSED_CALL,
        Notification.CATEGORY_TRANSPORT,
        Notification.CATEGORY_ALARM,
    )

    const val SUMMARY_LIMIT = 120
    const val ELLIPSIS = "…"
    const val UNKNOWN_APP = "a messaging app"

    /**
     * A message from an allowlisted app, or any app that marks it as MessagingStyle or the message
     * category. Group summaries, ongoing notifications, this app, text message apps and empty text are skipped.
     */
    fun isMessage(notice: MessengerNotice, ownPackage: String, smsPackages: Set<String> = SMS_APPS): Boolean {
        if (notice.packageName == ownPackage || notice.packageName in smsPackages) return false
        if (notice.groupSummary || notice.ongoing) return false
        if (notice.text.isNullOrBlank()) return false
        if (notice.category in NOT_A_MESSAGE) return false
        return notice.packageName in MESSAGING_APPS ||
            notice.messagingStyle ||
            notice.category == Notification.CATEGORY_MESSAGE
    }

    /**
     * The first [SUMMARY_LIMIT] characters of the message, cut at a word boundary and ended with an
     * ellipsis when shortened. A leading "Speaker: " is removed so no sender name is kept. Null when
     * nothing is left.
     */
    fun summaryOf(text: String?, speakers: List<String> = emptyList()): String? {
        var body = text?.replace(WHITESPACE, " ")?.trim() ?: return null
        speakers.firstOrNull { it.isNotBlank() && body.startsWith("$it:") }?.let { speaker ->
            body = body.removePrefix("$speaker:").trim()
        }
        if (body.isEmpty()) return null
        if (body.length <= SUMMARY_LIMIT) return body
        val head = body.take(SUMMARY_LIMIT)
        val cut = if (body[SUMMARY_LIMIT].isWhitespace()) head else head.substringBeforeLast(' ', head)
        return cut.trimEnd().trimEnd(',', ';', ':', '-') + ELLIPSIS
    }

    fun titleFor(appLabel: String): String = "Message in $appLabel"

    /** Stable id from the notification key and post time; never from message text. */
    fun itemId(key: String, postedAt: Long): String {
        val digest = MessageDigest.getInstance("SHA-256").digest("$key|$postedAt".toByteArray())
        return SourceId.MESSENGER.wire + "-" + digest.take(8).joinToString("") { "%02x".format(it) }
    }

    /** The item for an accepted notice. Only the package name is kept as on-device detail. */
    fun toItem(
        notice: MessengerNotice,
        appLabel: String,
        summary: String,
        zone: ZoneId = ZoneId.systemDefault(),
    ): LifelogItem = LifelogItem(
        id = itemId(notice.key, notice.postedAt),
        date = LifelogItem.dateOf(notice.postedAt, zone),
        source = SourceId.MESSENGER.wire,
        title = titleFor(appLabel),
        summary = summary,
        tags = emptyList(),
        url = null,
        raw = notice.packageName,
    )

    private val WHITESPACE = Regex("""\s+""")
}
