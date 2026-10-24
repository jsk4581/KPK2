package app.KPK2.lifelog.collect.health

import androidx.annotation.StringRes
import app.KPK2.lifelog.R

/** What the Health source can do right now, as one line for the Sources screen. Pure. */
object HealthStatus {

    @StringRes
    fun note(connect: HealthConnectStatus, granted: Set<HealthType>): Int = when (connect) {
        HealthConnectStatus.UNAVAILABLE -> R.string.health_status_unavailable
        HealthConnectStatus.NEEDS_INSTALL_OR_UPDATE -> R.string.health_status_needs_install
        HealthConnectStatus.AVAILABLE ->
            if (granted.isEmpty()) R.string.health_status_needs_permission else R.string.health_status_ok
    }

    /** "steps", "steps and sleep", "steps, sleep and exercise", in [HealthType] order. */
    fun typeList(types: Set<HealthType>): String {
        val names = HealthType.entries.filter { it in types }.map { it.key }
        return when (names.size) {
            0 -> ""
            1 -> names[0]
            else -> names.dropLast(1).joinToString(", ") + " and " + names.last()
        }
    }
}
