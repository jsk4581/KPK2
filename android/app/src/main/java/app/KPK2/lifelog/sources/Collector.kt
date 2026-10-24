package app.KPK2.lifelog.sources

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import app.KPK2.lifelog.data.LifelogRepository

/**
 * Records one source into the lifelog. A collector only reads what the phone already has and writes
 * [app.KPK2.lifelog.data.LifelogItem]s; it never judges, scores or sends anything off the device.
 *
 * The app calls [start] and [pull] only while the person has the source on and access is granted,
 * and calls [stop] when the source is turned off. Item ids must be stable (built from on-device row
 * ids or hashes, prefixed with the source wire name) so that pulling twice updates instead of
 * duplicating, and so that items the person deleted stay deleted.
 */
interface Collector {
    val id: SourceId

    /** Runtime permissions requested from the Sources screen before the source can turn on. */
    val requiredPermissions: List<String> get() = emptyList()

    /**
     * Whether this source is on before the person chooses. It only takes effect when [SourceId.startsOn]
     * allows it, so a collector cannot switch on a source the privacy rules keep off.
     */
    val defaultEnabled: Boolean get() = id.startsOn

    /** True when the periodic background pull should call [pull]. */
    val pullsPeriodically: Boolean get() = false

    /** Whether the phone lets this collector read its source. Override for special access. */
    fun hasAccess(context: Context): Boolean = requiredPermissions.all {
        ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * A system settings screen for access that is not a runtime permission (usage access,
     * notification access, Health Connect), or null when [requiredPermissions] are enough.
     */
    fun accessSettingsIntent(context: Context): Intent? = null

    /**
     * Push sources: register listeners or receivers that write items as events happen. Called again
     * whenever choices are re-applied, so it must do nothing when already started.
     */
    fun start(context: Context, repository: LifelogRepository) {}

    /** Undo [start]; also called when never started. Items already recorded stay until the person deletes them. */
    fun stop(context: Context) {}

    /**
     * Pull sources: read what happened since the last pull and record it. Must not throw for
     * expected failures (missing provider, revoked access). Returns the number of items written.
     */
    suspend fun pull(context: Context, repository: LifelogRepository): Int = 0
}
