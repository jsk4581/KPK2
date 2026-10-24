package app.KPK2.lifelog.collect.health

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.annotation.StringRes
import androidx.core.content.ContextCompat
import app.KPK2.lifelog.data.LifelogItem
import app.KPK2.lifelog.data.LifelogRepository
import app.KPK2.lifelog.sources.Collector
import app.KPK2.lifelog.sources.SourceId
import java.time.Clock
import java.time.LocalDateTime
import kotlin.coroutines.cancellation.CancellationException

/**
 * Health Connect: daily step totals, sleep duration and exercise sessions, one item per day per type.
 *
 * Access is not a plain runtime permission: Health Connect has its own permission screen, so
 * [accessSettingsIntent] opens [HealthAccessActivity], which asks for the read permissions or explains
 * that Health Connect is missing. Reading runs on its own hourly [HealthPullWorker] and once each time
 * the collector starts (app open, source turned on), so [pullsPeriodically] stays false and the shared
 * periodic pull does not read health data a second time.
 */
class HealthCollector(
    private val readerFor: (Context) -> HealthReader? = { context ->
        HealthConnectAccess.clientOrNull(context)?.let(::HealthConnectReader)
    },
    private val clock: Clock = Clock.systemDefaultZone(),
) : Collector {

    override val id: SourceId = SourceId.HEALTH

    /** Health permissions go through Health Connect's own screen, never the generic permission dialog. */
    override val requiredPermissions: List<String> get() = emptyList()

    override fun hasAccess(context: Context): Boolean =
        HealthConnectAccess.status(context) == HealthConnectStatus.AVAILABLE && grantedTypes(context).isNotEmpty()

    /** One line for the Sources screen saying whether Health Connect is missing, not allowed, or reading. */
    @StringRes
    fun statusNote(context: Context): Int = HealthStatus.note(HealthConnectAccess.status(context), grantedTypes(context))

    override fun accessSettingsIntent(context: Context): Intent = HealthAccessActivity.intent(context)

    override fun start(context: Context, repository: LifelogRepository) {
        HealthPullWorker.schedule(context)
        HealthPullWorker.pullSoon(context)
    }

    override fun stop(context: Context) {
        HealthPullWorker.cancel(context)
    }

    override suspend fun pull(context: Context, repository: LifelogRepository): Int {
        val reader = readerFor(context) ?: return 0
        return pullWith(reader, repository, HealthPullState(context))
    }

    /** One pull against [reader]. Expected failures (revoked access, Health Connect busy) write nothing. */
    suspend fun pullWith(reader: HealthReader, repository: LifelogRepository, state: HealthPullState): Int {
        val granted = guarded("permissions") { reader.grantedPermissions() } ?: return 0
        state.grantedPermissions = granted
        val types = HealthType.grantedIn(granted)
        if (types.isEmpty()) return 0

        val zone = clock.zone
        val now = clock.instant()
        val today = LocalDateTime.ofInstant(now, zone).toLocalDate()
        val days = HealthWindow.days(today, firstPull = !state.hasPulled)
        // A night that ends on the first day of the window starts the evening before.
        val readFrom = days.first.minusDays(1).atStartOfDay(zone).toInstant()

        val items = mutableListOf<LifelogItem>()
        var complete = true
        suspend fun <T> readType(type: HealthType, read: suspend () -> T, build: (T) -> List<LifelogItem>) {
            if (type !in types) return
            val result = guarded(type.key, read)
            if (result == null) complete = false else items += build(result)
        }
        readType(HealthType.STEPS, { reader.dailySteps(days.first, LocalDateTime.ofInstant(now, zone)) }) {
            HealthDays.stepItems(it, days)
        }
        readType(HealthType.SLEEP, { reader.sleepSessions(readFrom, now) }) { HealthDays.sleepItems(it, days, zone) }
        readType(HealthType.EXERCISE, { reader.exerciseSessions(readFrom, now) }) {
            HealthDays.exerciseItems(it, days, zone)
        }

        val changed = HealthWindow.changed(items, state.fingerprints())
        val written = if (changed.isEmpty()) 0 else repository.record(changed)
        state.saveAfterPull(changed, today, complete)
        return written
    }

    /**
     * Read types the person granted. Android 14 and later answer directly; older phones keep Health
     * Connect as an app, so the answer last read from it is used.
     */
    fun grantedTypes(context: Context): Set<HealthType> {
        val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            HealthType.readPermissions.filter {
                ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
            }.toSet()
        } else {
            HealthPullState(context).grantedPermissions
        }
        return HealthType.grantedIn(granted)
    }

    private suspend fun <T> guarded(what: String, block: suspend () -> T): T? = try {
        block()
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        // SecurityException when access was revoked or a background read is not allowed,
        // IllegalStateException or RemoteException when Health Connect is busy or rate limited.
        Log.w(TAG, "health $what read skipped: ${e.javaClass.simpleName}")
        null
    }

    private companion object {
        const val TAG = "HealthCollector"
    }
}
