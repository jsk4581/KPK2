package app.KPK2.lifelog.collect.calendar

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import app.KPK2.lifelog.data.LifelogDatabase
import app.KPK2.lifelog.data.LifelogRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.time.ZoneId

/** Recording the same pull twice must not double count, and deleted events stay deleted. */
@RunWith(RobolectricTestRunner::class)
class CalendarDedupTest {
    private lateinit var db: LifelogDatabase
    private lateinit var repo: LifelogRepository
    private val context: Context get() = ApplicationProvider.getApplicationContext()
    private val zone = ZoneId.of("America/New_York")

    private val pull = listOf(
        CalendarInstance(11, 1_792_000_000_000, 1_792_002_700_000, "Rate review", false, false, "Client work"),
        CalendarInstance(12, 1_792_090_000_000, 1_792_093_600_000, "Weekly standup", false, true, "Studio", otherAttendees = 4),
        CalendarInstance(12, 1_792_694_800_000, 1_792_698_400_000, "Weekly standup", false, true, "Studio", otherAttendees = 4),
    )

    @Before
    fun open() {
        db = Room.inMemoryDatabaseBuilder(context, LifelogDatabase::class.java).allowMainThreadQueries().build()
        repo = LifelogRepository(db.lifelogDao())
    }

    @After
    fun close() = db.close()

    @Test
    fun repeatedPullsUpdateInsteadOfDuplicating() = runTest {
        repo.record(CalendarItems.toItems(pull, zone))
        repo.record(CalendarItems.toItems(pull, zone))
        assertEquals(3, repo.count.first())

        val renamed = pull.map { if (it.eventId == 11L) it.copy(title = "Rate review, moved") else it }
        repo.record(CalendarItems.toItems(renamed, zone))
        assertEquals(3, repo.count.first())
        assertEquals("Rate review, moved", repo.snapshot().single { it.id == "calendar-11" }.title)
    }

    @Test
    fun deletedEventsAreNotPulledBack() = runTest {
        repo.record(CalendarItems.toItems(pull, zone))
        repo.delete("calendar-11")

        val written = repo.record(CalendarItems.toItems(pull, zone))

        assertEquals(2, written)
        assertEquals(2, repo.count.first())
    }
}
