package app.KPK2.lifelog.collect.health

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import app.KPK2.lifelog.data.LifelogItem
import java.time.LocalDate

/** Which days a pull reads, and which of the built items actually need writing. Pure. */
object HealthWindow {
    /** First pull: as far back as Health Connect usually lets a newly granted app read. */
    const val FIRST_PULL_DAYS = 30L

    /** Later pulls: recent days, so late syncs from a watch or a second app still land on their day. */
    const val REPEAT_PULL_DAYS = 7L

    /** Fingerprints older than this are forgotten; those days are never read again. */
    const val KEEP_FINGERPRINT_DAYS = 45L

    fun days(today: LocalDate, firstPull: Boolean): DayWindow {
        val span = if (firstPull) FIRST_PULL_DAYS else REPEAT_PULL_DAYS
        return DayWindow(today.minusDays(span - 1), today)
    }

    /** What an item says. Writing an item whose fingerprint did not change would only bump its recorded time. */
    fun fingerprint(item: LifelogItem): String =
        listOf(item.date, item.title, item.summary, item.tags.joinToString("\u001f"), item.url.orEmpty())
            .joinToString("\u001e")
            .hashCode()
            .toString(16)

    /** The items that are new or say something different from the last write. */
    fun changed(items: List<LifelogItem>, known: Map<String, String>): List<LifelogItem> =
        items.distinctBy { it.id }.filter { known[it.id] != fingerprint(it) }

    /** Drops fingerprints of days before [today] minus [KEEP_FINGERPRINT_DAYS]. Ids end in the item date. */
    fun prune(known: Map<String, String>, today: LocalDate): Map<String, String> {
        val oldest = today.minusDays(KEEP_FINGERPRINT_DAYS).toString()
        return known.filterKeys { id -> id.takeLast(10) >= oldest }
    }
}

/**
 * Small bookkeeping this source keeps in its own private preferences file: the fingerprints of the
 * items it wrote, whether it has pulled before, and the Health Connect permissions last seen granted.
 * It holds no health values; backup rules exclude app preferences.
 */
class HealthPullState(private val prefs: SharedPreferences) {

    constructor(context: Context) : this(context.getSharedPreferences(FILE_NAME, Context.MODE_PRIVATE))

    val hasPulled: Boolean get() = prefs.getBoolean(KEY_PULLED, false)

    fun fingerprints(): Map<String, String> =
        prefs.all.filterKeys { it.startsWith(FP_PREFIX) }
            .mapNotNull { (key, value) -> (value as? String)?.let { key.removePrefix(FP_PREFIX) to it } }
            .toMap()

    /**
     * Remembers what [written] says. [complete] is false when a granted type could not be read, so the
     * next pull still reads the longer first-pull window.
     */
    fun saveAfterPull(written: List<LifelogItem>, today: LocalDate, complete: Boolean) {
        val merged = fingerprints() + written.associate { it.id to HealthWindow.fingerprint(it) }
        val kept = HealthWindow.prune(merged, today)
        val stale = prefs.all.keys.filter { it.startsWith(FP_PREFIX) }
        prefs.edit {
            stale.forEach(::remove)
            kept.forEach { (id, fp) -> putString(FP_PREFIX + id, fp) }
            if (complete) putBoolean(KEY_PULLED, true)
        }
    }

    /** Granted permissions as last read from Health Connect; used where the platform cannot answer directly. */
    var grantedPermissions: Set<String>
        get() = prefs.getStringSet(KEY_GRANTED, emptySet()).orEmpty().toSet()
        set(value) {
            prefs.edit { putStringSet(KEY_GRANTED, value.toSet()) }
        }

    companion object {
        const val FILE_NAME = "health_source"
        private const val KEY_PULLED = "pulled_before"
        private const val KEY_GRANTED = "granted_permissions"
        private const val FP_PREFIX = "fp:"
    }
}
