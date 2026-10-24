package app.KPK2.lifelog.collect.sms

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import app.KPK2.lifelog.data.LifelogDatabase
import app.KPK2.lifelog.data.LifelogRepository
import app.KPK2.lifelog.sources.SourceId
import app.KPK2.lifelog.sources.SourcePolicy
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class SmsCollectorTest {
    private lateinit var db: LifelogDatabase
    private lateinit var repo: LifelogRepository
    private val context: Context get() = ApplicationProvider.getApplicationContext()

    private val day = 24L * 60 * 60 * 1000
    private val now = 1_792_510_200_000L // 2026-10-20T15:30:00Z

    /** Fake message store: returns rows after the requested point and remembers each request. */
    private class FakeHistory(var rows: List<StoredSms>) : SmsHistory {
        val requests = mutableListOf<Long>()
        override fun readSince(fromExclusiveMillis: Long): List<StoredSms> {
            requests += fromExclusiveMillis
            return rows.filter { it.storedAtMillis > fromExclusiveMillis }
        }
    }

    private fun stored(direction: SmsDirection, at: Long, body: String) = StoredSms(SmsRecord(direction, at, body), at)

    @Before
    fun open() {
        db = Room.inMemoryDatabaseBuilder(context, LifelogDatabase::class.java).allowMainThreadQueries().build()
        repo = LifelogRepository(db.lifelogDao())
        context.getSharedPreferences(SmsCollector.PREFS_FILE, Context.MODE_PRIVATE).edit().clear().commit()
    }

    @After
    fun close() = db.close()

    @Test
    fun offByDefaultAndAsksForBothSmsPermissions() {
        val collector = SmsCollector(history = { FakeHistory(emptyList()) })
        assertEquals(SourceId.SMS, collector.id)
        assertFalse(SourcePolicy.startsOn(collector))
        assertFalse(SourcePolicy.isOn(collector, choice = null, accessGranted = true))
        assertTrue(SourcePolicy.isOn(collector, choice = true, accessGranted = true))
        assertEquals(
            setOf("android.permission.RECEIVE_SMS", "android.permission.READ_SMS"),
            collector.requiredPermissions.toSet(),
        )
    }

    @Test
    fun firstPullReadsFourteenDaysThenOnlyNewMessages() = runTest {
        val history = FakeHistory(
            listOf(
                stored(SmsDirection.RECEIVED, now - 3 * day, "Are you free for a quick call Thursday?"),
                stored(SmsDirection.SENT, now - 3 * day + 60_000, "Yes, 2pm works."),
            ),
        )
        var clock = now
        val collector = SmsCollector(history = { history }, clock = { clock })

        assertEquals(2, collector.pull(context, repo))
        assertEquals(now - 14 * day, history.requests.single())
        val items = repo.snapshot()
        assertEquals(setOf("Message received", "Message sent"), items.map { it.title }.toSet())
        assertTrue(items.all { it.source == "sms" })

        history.rows = history.rows + stored(SmsDirection.RECEIVED, now + day, "Contract attached, see example.com/terms")
        clock = now + 2 * day
        assertEquals(1, collector.pull(context, repo))
        assertEquals(now - 3 * day + 60_000, history.requests.last())
        assertEquals(3, repo.snapshot().size)
    }

    @Test
    fun receivedMessageIsNotDuplicatedByTheLaterRead() = runTest {
        val body = "Your proofs are ready to review."
        val history = FakeHistory(listOf(StoredSms(SmsRecord(SmsDirection.RECEIVED, now, body), now + 2_000)))
        val collector = SmsCollector(history = { history }, clock = { now + 10_000 })

        val incoming = SmsItems.joinParts(listOf(SmsPart("555-0104", body, now)), fallbackMillis = 0L)
        assertEquals(1, collector.recordReceived(context, repo, incoming))
        collector.pull(context, repo)

        assertEquals(1, repo.snapshot().size)
    }

    @Test
    fun deletedMessageStaysDeletedAfterTheSourceIsTurnedOffAndOn() = runTest {
        val history = FakeHistory(listOf(stored(SmsDirection.RECEIVED, now - day, "Reminder: workshop tomorrow at 9")))
        val collector = SmsCollector(history = { history }, clock = { now })

        collector.pull(context, repo)
        repo.delete(repo.snapshot().single().id)

        collector.stop(context)
        assertEquals(0, collector.pull(context, repo))
        assertEquals(now - 14 * day, history.requests.last())
        assertTrue(repo.snapshot().isEmpty())
    }

    @Test
    fun unreadableStoreRecordsNothingAndDoesNotThrow() = runTest {
        val collector = SmsCollector(history = { SmsHistory { throw SecurityException("no READ_SMS") } }, clock = { now })
        assertEquals(0, collector.pull(context, repo))
        assertTrue(repo.snapshot().isEmpty())
    }

    @Test
    fun exportedFieldsHoldNoSenderDetails() = runTest {
        val history = FakeHistory(listOf(stored(SmsDirection.RECEIVED, now, "Call me back at 555-0105 when you can")))
        SmsCollector(history = { history }, clock = { now }).pull(context, repo)
        val item = repo.snapshot().single()
        assertEquals("Message received", item.title)
        // The body is the only text kept; the item has no field for an address.
        assertEquals("Call me back at 555-0105 when you can", item.summary)
        assertEquals(null, item.raw)
    }
}
