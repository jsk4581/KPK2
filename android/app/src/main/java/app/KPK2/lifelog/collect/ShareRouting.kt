package app.KPK2.lifelog.collect

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.core.content.IntentCompat
import app.KPK2.lifelog.collect.savedlink.SharedLinkParser

/**
 * "Save link" and "Add as document" both accept text/plain, because a shared .txt file and shared
 * text carry the same type and an intent filter cannot tell them apart. Whichever target the person
 * picks, a share that only the other one can use is passed on to it instead of failing.
 */
object ShareRouting {
    /** The link target passes a share on when no link is in the text but a file came with it. */
    fun linkTargetForwards(text: String?, hasFile: Boolean): Boolean = hasFile && !hasLink(text)

    /** The document target passes a share on when no file came with it but the text holds a link. */
    fun documentTargetForwards(text: String?, hasFile: Boolean): Boolean = !hasFile && hasLink(text)

    private fun hasLink(text: String?): Boolean = !text.isNullOrBlank() && SharedLinkParser.firstLink(text) != null

    /** The shared text: the text extra, or the first clip item's text. */
    fun sharedText(share: Intent): String? =
        share.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()
            ?: share.clipData?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.text?.toString()

    /** The shared file, if the share carries one. */
    fun sharedFile(share: Intent): Uri? =
        if (share.action == Intent.ACTION_SEND) {
            IntentCompat.getParcelableExtra(share, Intent.EXTRA_STREAM, Uri::class.java)
        } else {
            null
        }

    /**
     * Hands [share] to [target] in this app and finishes [from]. Returns false when [target] cannot
     * take it (for example its source is off and the target is disabled), so [from] handles it.
     */
    fun forward(from: Activity, share: Intent, target: Class<out Activity>): Boolean {
        val handOff = Intent(Intent.ACTION_SEND)
            .setClass(from, target)
            .setType(share.type)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        share.extras?.let(handOff::putExtras)
        share.clipData?.let { handOff.clipData = it }
        return try {
            from.startActivity(handOff)
            from.finish()
            true
        } catch (e: ActivityNotFoundException) {
            Log.i(TAG, "share target ${target.simpleName} is off")
            false
        } catch (e: SecurityException) {
            Log.w(TAG, "could not pass the share to ${target.simpleName}", e)
            false
        }
    }

    private const val TAG = "ShareRouting"
}
