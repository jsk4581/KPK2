package app.KPK2.lifelog.collect.messenger

import app.KPK2.lifelog.data.LifelogItem
import java.time.ZoneId

/**
 * Decides, per posted notification, whether the messenger source writes an item, and builds it.
 * Platform lookups (app labels, the default SMS app) are passed in so the decision stays testable.
 */
class MessengerRecorder(
    private val ownPackage: String,
    private val smsPackages: () -> Set<String> = { MessengerRules.SMS_APPS },
    private val appLabel: (String) -> String? = { null },
    private val guard: RepeatGuard = RepeatGuard(),
    private val zone: () -> ZoneId = { ZoneId.systemDefault() },
) {
    /** The item to record, or null when the notice is not a message, has no text, or repeats a recent key. */
    fun itemFor(notice: MessengerNotice): LifelogItem? {
        if (!MessengerRules.isMessage(notice, ownPackage, smsPackages())) return null
        val summary = MessengerRules.summaryOf(notice.text, notice.speakers) ?: return null
        if (!guard.admit(notice.key, notice.postedAt)) return null
        return MessengerRules.toItem(notice, labelOf(notice.packageName), summary, zone())
    }

    private fun labelOf(packageName: String): String =
        MessengerRules.MESSAGING_APPS[packageName]
            ?: appLabel(packageName)?.takeIf { it.isNotBlank() && it != packageName }
            ?: MessengerRules.UNKNOWN_APP
}
