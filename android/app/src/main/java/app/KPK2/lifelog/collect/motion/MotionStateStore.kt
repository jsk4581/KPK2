package app.KPK2.lifelog.collect.motion

import android.content.Context
import android.content.SharedPreferences

/**
 * Keeps the motion source's small working state in the app's private storage (backup rules exclude it):
 * the bout in progress, so a bout survives the app process ending between two transitions, and whether
 * transition updates are registered with Play services.
 */
class MotionStateStore(private val prefs: SharedPreferences) {

    constructor(context: Context) : this(context.getSharedPreferences(FILE_NAME, Context.MODE_PRIVATE))

    fun load(): BoutState {
        val activity = MotionActivity.ofTag(prefs.getString(KEY_OPEN_ACTIVITY, null))
        val open = if (activity != null && prefs.contains(KEY_OPEN_START)) {
            OpenBout(activity, prefs.getLong(KEY_OPEN_START, 0L))
        } else {
            null
        }
        return BoutState(open, prefs.getLong(KEY_LAST_EVENT, Long.MIN_VALUE))
    }

    fun save(state: BoutState) {
        prefs.edit().apply {
            val open = state.open
            if (open == null) {
                remove(KEY_OPEN_ACTIVITY)
                remove(KEY_OPEN_START)
            } else {
                putString(KEY_OPEN_ACTIVITY, open.activity.tag)
                putLong(KEY_OPEN_START, open.startMillis)
            }
            putLong(KEY_LAST_EVENT, state.lastEventMillis)
        }.commit()
    }

    /** Forgets the bout in progress, for example when the person turns the source off. */
    fun clearBout() {
        prefs.edit().remove(KEY_OPEN_ACTIVITY).remove(KEY_OPEN_START).remove(KEY_LAST_EVENT).commit()
    }

    var registered: Boolean
        get() = prefs.getBoolean(KEY_REGISTERED, false)
        set(value) {
            prefs.edit().putBoolean(KEY_REGISTERED, value).apply()
        }

    var registrationFailed: Boolean
        get() = prefs.getBoolean(KEY_REGISTRATION_FAILED, false)
        set(value) {
            prefs.edit().putBoolean(KEY_REGISTRATION_FAILED, value).apply()
        }

    private companion object {
        const val FILE_NAME = "motion_state"
        const val KEY_OPEN_ACTIVITY = "open_activity"
        const val KEY_OPEN_START = "open_start"
        const val KEY_LAST_EVENT = "last_event"
        const val KEY_REGISTERED = "registered"
        const val KEY_REGISTRATION_FAILED = "registration_failed"
    }
}
