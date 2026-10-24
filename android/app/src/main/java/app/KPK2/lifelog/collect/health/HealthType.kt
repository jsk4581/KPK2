package app.KPK2.lifelog.collect.health

import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord

/**
 * The three Health Connect data types this source reads. Each one becomes at most one lifelog item per
 * day; [key] is part of that item's id, so it must never change once items exist on a phone.
 */
enum class HealthType(val key: String, val readPermission: String) {
    STEPS("steps", HealthPermission.getReadPermission(StepsRecord::class)),
    SLEEP("sleep", HealthPermission.getReadPermission(SleepSessionRecord::class)),
    EXERCISE("exercise", HealthPermission.getReadPermission(ExerciseSessionRecord::class));

    companion object {
        val readPermissions: Set<String> get() = entries.map { it.readPermission }.toSet()

        /** Lets reads continue from the hourly background pull; only asked where Health Connect supports it. */
        const val BACKGROUND_PERMISSION: String = HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND

        /** The types whose read permission is in [granted]. */
        fun grantedIn(granted: Set<String>): Set<HealthType> = entries.filter { it.readPermission in granted }.toSet()
    }
}
