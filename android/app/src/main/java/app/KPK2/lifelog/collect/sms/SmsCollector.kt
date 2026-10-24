package app.KPK2.lifelog.collect.sms

import android.Manifest
import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import android.util.Log
import app.KPK2.lifelog.data.LifelogRepository
import app.KPK2.lifelog.sources.Collector
import app.KPK2.lifelog.sources.SourceId
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.security.SecureRandom
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Text messages, opt-in and off by default. New incoming messages arrive through
 * [SmsReceivedReceiver]; when the source turns on, the last [SmsItems.BACKFILL_DAYS] days of
 * received and sent messages are read once, and the periodic pull then picks up what came after
 * (sent messages have no broadcast, so the pull is how they are recorded).
 *
 * Each message becomes one item titled "Message received" or "Message sent" with the start of the
 * body as its summary. No sender or recipient name or number is read, stored or exported.
 */
class SmsCollector(
    private val history: (Context) -> SmsHistory = { ProviderSmsHistory(it.contentResolver) },
    private val clock: () -> Long = System::currentTimeMillis,
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO),
) : Collector {
    override val id: SourceId = SourceId.SMS

    override val requiredPermissions: List<String> =
        listOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS)

    override val pullsPeriodically: Boolean = true

    private val readLock = Mutex()
    private val initialReadQueued = AtomicBoolean(false)

    /** Queues the first read of recent history right away instead of waiting for the periodic pull. */
    override fun start(context: Context, repository: LifelogRepository) {
        val app = context.applicationContext
        if (cursor(app) != null || !initialReadQueued.compareAndSet(false, true)) return
        scope.launch {
            try {
                pull(app, repository)
            } finally {
                initialReadQueued.set(false)
            }
        }
    }

    /** Forgets the read position, so turning the source on again re-reads the recent window. */
    override fun stop(context: Context) {
        prefs(context.applicationContext).edit().remove(KEY_CURSOR).apply()
    }

    override suspend fun pull(context: Context, repository: LifelogRepository): Int = readLock.withLock {
        val app = context.applicationContext
        val now = clock()
        val from = SmsItems.readFrom(cursor(app), now)
        val stored = try {
            history(app).readSince(from)
        } catch (e: SecurityException) {
            Log.w(TAG, "message store not readable", e)
            return@withLock 0
        } catch (e: RuntimeException) {
            Log.w(TAG, "message store query failed", e)
            return@withLock 0
        }
        val salt = idSalt(app)
        val written = repository.record(stored.map { SmsItems.toItem(it.record, salt) })
        val next = stored.maxOfOrNull { it.storedAtMillis } ?: from
        prefs(app).edit().putLong(KEY_CURSOR, maxOf(next, from)).apply()
        written
    }

    /** Records messages that just arrived. Called by [SmsReceivedReceiver] only while the source is on. */
    suspend fun recordReceived(context: Context, repository: LifelogRepository, records: List<SmsRecord>): Int {
        if (records.isEmpty()) return 0
        val salt = idSalt(context.applicationContext)
        return repository.record(records.map { SmsItems.toItem(it, salt) })
    }

    private fun cursor(context: Context): Long? =
        prefs(context).let { if (it.contains(KEY_CURSOR)) it.getLong(KEY_CURSOR, 0L) else null }

    /** A random per-install key for item ids, created on first use and kept in private storage. */
    @Synchronized
    private fun idSalt(context: Context): ByteArray {
        val prefs = prefs(context)
        prefs.getString(KEY_SALT, null)?.let { return Base64.decode(it, Base64.NO_WRAP) }
        val salt = ByteArray(SALT_BYTES).also { SecureRandom().nextBytes(it) }
        prefs.edit().putString(KEY_SALT, Base64.encodeToString(salt, Base64.NO_WRAP)).commit()
        return salt
    }

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE)

    companion object {
        /** Private shared preferences for the read position and id key; backup rules exclude them. */
        const val PREFS_FILE = "collect_sms"
        private const val KEY_CURSOR = "read_after_millis"
        private const val KEY_SALT = "id_salt"
        private const val SALT_BYTES = 32
        private const val TAG = "SmsCollector"
    }
}
