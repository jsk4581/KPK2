package app.KPK2.lifelog.sources

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.conflate

/** The person's explicit on or off choice per source. A missing entry means they never chose. */
class SourceSettings(private val prefs: SharedPreferences) {

    constructor(context: Context) : this(context.getSharedPreferences(FILE_NAME, Context.MODE_PRIVATE))

    /** Emits the current choices, then again after every change. */
    val choices: Flow<Map<SourceId, Boolean>> = callbackFlow {
        val listener = SharedPreferences.OnSharedPreferenceChangeListener { _, _ -> trySend(current()) }
        prefs.registerOnSharedPreferenceChangeListener(listener)
        trySend(current())
        awaitClose { prefs.unregisterOnSharedPreferenceChangeListener(listener) }
    }.conflate()

    fun current(): Map<SourceId, Boolean> =
        SourceId.entries.filter { prefs.contains(key(it)) }.associateWith { prefs.getBoolean(key(it), false) }

    /** Writes synchronously so a following [CollectorRunner.sync] sees the new choice. */
    fun choose(id: SourceId, on: Boolean) {
        prefs.edit().putBoolean(key(id), on).commit()
    }

    private fun key(id: SourceId) = "source_on_${id.wire}"

    companion object {
        /** Shared preferences file in the app's private storage; backup rules exclude it. */
        const val FILE_NAME = "source_choices"
    }
}
