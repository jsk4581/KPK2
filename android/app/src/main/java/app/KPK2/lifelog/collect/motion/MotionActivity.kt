package app.KPK2.lifelog.collect.motion

import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.DetectedActivity

/**
 * The activities the motion source records. [title] is written into exported items, so it stays plain
 * English and does not follow the phone's language. [tag] is the item tag in the schema's kebab-case form.
 */
enum class MotionActivity(val tag: String, val title: String, val detectedType: Int) {
    WALKING("walking", "Walking", DetectedActivity.WALKING),
    RUNNING("running", "Running", DetectedActivity.RUNNING),
    CYCLING("cycling", "Cycling", DetectedActivity.ON_BICYCLE),
    IN_VEHICLE("in-vehicle", "In a vehicle", DetectedActivity.IN_VEHICLE),
    STILL("still", "Still", DetectedActivity.STILL);

    companion object {
        /** Maps an Activity Recognition type; types the source does not record (tilting, unknown) give null. */
        fun ofDetectedType(type: Int): MotionActivity? = entries.firstOrNull { it.detectedType == type }

        fun ofTag(tag: String?): MotionActivity? = entries.firstOrNull { it.tag == tag }
    }
}

/** One activity change reported by the phone, already placed on the wall clock. */
data class MotionTransition(val activity: MotionActivity, val entered: Boolean, val atMillis: Long) {
    companion object {
        /** Builds a transition from Activity Recognition values, or null for activities the source ignores. */
        fun of(detectedType: Int, transitionType: Int, atMillis: Long): MotionTransition? {
            val activity = MotionActivity.ofDetectedType(detectedType) ?: return null
            val entered = when (transitionType) {
                ActivityTransition.ACTIVITY_TRANSITION_ENTER -> true
                ActivityTransition.ACTIVITY_TRANSITION_EXIT -> false
                else -> return null
            }
            return MotionTransition(activity, entered, atMillis)
        }

        /**
         * Event times arrive as elapsed-realtime nanos since boot. Moves one onto the wall clock using a
         * pair of readings ([nowWallMillis], [nowElapsedNanos]) taken together when the result arrived.
         * An event stamped after "now" is treated as happening now.
         */
        fun wallClockOf(eventElapsedNanos: Long, nowWallMillis: Long, nowElapsedNanos: Long): Long {
            val agoMillis = ((nowElapsedNanos - eventElapsedNanos) / 1_000_000L).coerceAtLeast(0L)
            return nowWallMillis - agoMillis
        }
    }
}
