package app.KPK2.lifelog.collect.motion

import android.content.Context
import androidx.annotation.StringRes
import app.KPK2.lifelog.R
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability

/** Whether this phone can deliver activity transitions, as shown under the Movement source. */
enum class MotionStatus(@param:StringRes val message: Int?) {
    READY(null),
    PLAY_SERVICES_MISSING(R.string.motion_status_play_services_missing),
    PLAY_SERVICES_OUTDATED(R.string.motion_status_play_services_outdated),
    PLAY_SERVICES_DISABLED(R.string.motion_status_play_services_disabled),
    REGISTRATION_FAILED(R.string.motion_status_registration_failed);

    companion object {
        /** Maps a Google Play services availability code. Any code that is not success means no motion. */
        fun ofPlayServicesCode(code: Int): MotionStatus = when (code) {
            ConnectionResult.SUCCESS -> READY
            ConnectionResult.SERVICE_VERSION_UPDATE_REQUIRED, ConnectionResult.SERVICE_UPDATING -> PLAY_SERVICES_OUTDATED
            ConnectionResult.SERVICE_DISABLED -> PLAY_SERVICES_DISABLED
            else -> PLAY_SERVICES_MISSING
        }

        fun playServices(context: Context): MotionStatus = ofPlayServicesCode(
            runCatching { GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context) }
                .getOrDefault(ConnectionResult.SERVICE_MISSING),
        )

        /** Play services first; when they are fine, whether the last registration attempt failed. */
        fun current(context: Context): MotionStatus {
            val services = playServices(context)
            if (services != READY) return services
            return if (MotionStateStore(context).registrationFailed) REGISTRATION_FAILED else READY
        }
    }
}
