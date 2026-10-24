package app.KPK2.lifelog.collect.location

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.CancellationSignal
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume

/** What one attempt to read the current place produced. */
sealed interface FixResult {
    data class Fix(val sample: PlaceSample) : FixResult

    /** Location is switched off in system settings, or no provider is enabled. */
    data object LocationOff : FixResult

    /** No reading arrived in time, or only a simulated one. */
    data object NoFix : FixResult

    /** A reading arrived but its accuracy radius is too wide to tell places apart. */
    data object Imprecise : FixResult
}

/** Reads the current place once. Tests pass a fake. */
fun interface FixReader {
    suspend fun read(context: Context): FixResult
}

/**
 * Reads one fix through the platform [LocationManager], so no extra location library is needed.
 * Only called while the app is in front, which is all a foreground location grant allows.
 */
object PlatformFixReader : FixReader {
    /** Wider accuracy radii than this cannot separate places [Stays.RADIUS_M] apart. */
    const val MAX_ACCURACY_M = 200f

    private const val TIMEOUT_MILLIS = 15_000L

    /** A last known fix this recent stands in when no fresh one arrives before the timeout. */
    private const val MAX_LAST_KNOWN_AGE_MILLIS = 2 * 60_000L

    /** Reading times further off than this from the phone clock are replaced with the current time. */
    private const val MAX_CLOCK_SKEW_MILLIS = 10 * 60_000L

    @SuppressLint("MissingPermission") // The collector only calls this with location access granted.
    override suspend fun read(context: Context): FixResult {
        val manager = context.getSystemService(LocationManager::class.java) ?: return FixResult.NoFix
        if (!LocationManagerCompat.isLocationEnabled(manager)) return FixResult.LocationOff
        val provider = chooseProvider(manager) ?: return FixResult.LocationOff

        val fresh = withTimeoutOrNull(TIMEOUT_MILLIS) {
            suspendCancellableCoroutine { cont ->
                val signal = CancellationSignal()
                cont.invokeOnCancellation { signal.cancel() }
                LocationManagerCompat.getCurrentLocation(
                    manager,
                    provider,
                    signal,
                    ContextCompat.getMainExecutor(context),
                ) { location: Location? -> if (cont.isActive) cont.resume(location) }
            }
        }
        val now = System.currentTimeMillis()
        val location = fresh ?: recentLastKnown(manager, now) ?: return FixResult.NoFix
        return toResult(location, now)
    }

    private fun toResult(location: Location, now: Long): FixResult {
        if (isSimulated(location)) return FixResult.NoFix
        if (location.hasAccuracy() && location.accuracy > MAX_ACCURACY_M) return FixResult.Imprecise
        val time = location.time.takeIf { kotlin.math.abs(now - it) <= MAX_CLOCK_SKEW_MILLIS } ?: now
        val accuracy = if (location.hasAccuracy()) location.accuracy else null
        return FixResult.Fix(PlaceSample(time, location.latitude, location.longitude, accuracy))
    }

    /** Fused when the phone has it, then network (fast indoors), then satellite. */
    private fun chooseProvider(manager: LocationManager): String? {
        val order = buildList {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) add(LocationManager.FUSED_PROVIDER)
            add(LocationManager.NETWORK_PROVIDER)
            add(LocationManager.GPS_PROVIDER)
        }
        return order.firstOrNull { provider ->
            runCatching {
                LocationManagerCompat.hasProvider(manager, provider) && manager.isProviderEnabled(provider)
            }.getOrDefault(false)
        }
    }

    @SuppressLint("MissingPermission")
    private fun recentLastKnown(manager: LocationManager, now: Long): Location? =
        listOf(LocationManager.NETWORK_PROVIDER, LocationManager.GPS_PROVIDER)
            .mapNotNull { runCatching { manager.getLastKnownLocation(it) }.getOrNull() }
            .filter { now - it.time in 0..MAX_LAST_KNOWN_AGE_MILLIS }
            .maxByOrNull { it.time }

    /** Readings injected by mock location apps or test tools are not places the person visited. */
    private fun isSimulated(location: Location): Boolean =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            location.isMock
        } else {
            @Suppress("DEPRECATION")
            location.isFromMockProvider
        }
}
