package app.KPK2.lifelog.collect.savedlink

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import app.KPK2.lifelog.data.LifelogItem
import app.KPK2.lifelog.data.LifelogRepository
import app.KPK2.lifelog.sources.Collector
import app.KPK2.lifelog.sources.SourceId
import java.time.ZoneId
import java.util.UUID

/**
 * Saved links arrive through the share sheet ([ShareLinkActivity]), so there is nothing to pull and
 * no permission to ask for. Turning the source on or off shows or hides the share target, so a person
 * who turned saved links off does not see Second Draft offered for links at all.
 */
class SavedLinkCollector : Collector {
    override val id: SourceId = SourceId.SAVED_LINK

    override fun start(context: Context, repository: LifelogRepository) = setShareTarget(context, enabled = true)

    override fun stop(context: Context) = setShareTarget(context, enabled = false)

    private fun setShareTarget(context: Context, enabled: Boolean) {
        val component = ComponentName(context, ShareLinkActivity::class.java)
        val wanted = if (enabled) {
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED
        } else {
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED
        }
        val packageManager = context.packageManager
        if (packageManager.getComponentEnabledSetting(component) != wanted) {
            packageManager.setComponentEnabledSetting(component, wanted, PackageManager.DONT_KILL_APP)
        }
    }
}

/** Builds the lifelog item for one share. Pure apart from the defaults, so it is unit tested. */
object SavedLinkItems {
    /** Longest shared text kept on the phone for the person to review; it is never exported. */
    const val MAX_RAW = 4000

    /**
     * Every share is its own event, so sharing the same link twice records it twice: the id comes from
     * the share time and a random part, never from the link or the text.
     */
    fun newId(recordedAt: Long, random: UUID = UUID.randomUUID()): String =
        "${SourceId.SAVED_LINK.wire}-$recordedAt-$random"

    fun build(
        link: SharedLink,
        sender: String?,
        rawText: String?,
        recordedAt: Long = System.currentTimeMillis(),
        zone: ZoneId = ZoneId.systemDefault(),
        id: String = newId(recordedAt),
    ): LifelogItem = LifelogItem(
        id = id,
        date = LifelogItem.dateOf(recordedAt, zone),
        source = SourceId.SAVED_LINK.wire,
        title = link.title,
        summary = link.summary,
        tags = listOfNotNull(sender),
        url = link.url,
        recordedAt = recordedAt,
        raw = rawText?.let { SharedLinkParser.ellipsize(it, MAX_RAW) },
    )
}
