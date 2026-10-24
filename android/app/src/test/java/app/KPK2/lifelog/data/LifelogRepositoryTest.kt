package app.KPK2.lifelog.data

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class LifelogRepositoryTest {

    private lateinit var db: LifelogDatabase
    private lateinit var repo: LifelogRepository

    @Before
    fun open() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        db = Room.inMemoryDatabaseBuilder(context, LifelogDatabase::class.java).allowMainThreadQueries().build()
        repo = LifelogRepository(db.lifelogDao())
    }

    @After
    fun close() = db.close()

    private fun item(id: String, date: String, recordedAt: Long = 0, title: String = "Item $id") =
        LifelogItem(id = id, date = date, source = "note", title = title, summary = "", recordedAt = recordedAt)

    @Test
    fun listsNewestDayFirstThenMostRecentlyRecorded() = runTest {
        repo.record(
            listOf(
                item("a", "2026-10-09", recordedAt = 1),
                item("b", "2026-10-11", recordedAt = 1),
                item("c", "2026-10-10", recordedAt = 5),
                item("d", "2026-10-10", recordedAt = 9),
            ),
        )
        assertEquals(listOf("b", "d", "c", "a"), repo.items.first().map { it.id })
        assertEquals(4, repo.count.first())
    }

    @Test
    fun recordingTheSameIdUpdatesInsteadOfDuplicating() = runTest {
        repo.record(item("a", "2026-10-09", title = "First"))
        repo.record(item("a", "2026-10-09", title = "Renamed"))
        assertEquals(listOf("Renamed"), repo.snapshot().map { it.title })
    }

    @Test
    fun tagsAndNullUrlSurviveTheRoundTrip() = runTest {
        repo.record(item("a", "2026-10-09").copy(tags = listOf("pricing", "with \"quotes\""), url = null))
        val stored = repo.snapshot().single()
        assertEquals(listOf("pricing", "with \"quotes\""), stored.tags)
        assertEquals(null, stored.url)
    }

    @Test
    fun deletedItemStaysDeletedWhenRecordedAgain() = runTest {
        repo.record(listOf(item("a", "2026-10-09"), item("b", "2026-10-10")))
        repo.delete("a")
        assertEquals(listOf("b"), repo.snapshot().map { it.id })

        val written = repo.record(listOf(item("a", "2026-10-09"), item("c", "2026-10-11")))
        assertEquals(1, written)
        assertEquals(listOf("c", "b"), repo.snapshot().map { it.id })
    }

    @Test
    fun deleteAllEmptiesTheStoreAndKeepsThoseItemsOut() = runTest {
        repo.record(listOf(item("a", "2026-10-09"), item("b", "2026-10-10")))
        repo.deleteAll()
        assertEquals(0, repo.count.first())

        repo.record(listOf(item("a", "2026-10-09"), item("new", "2026-10-12")))
        assertEquals(listOf("new"), repo.snapshot().map { it.id })
    }

    @Test
    fun sourceStatsCountItemsAndKeepTheNewestRecordedTime() = runTest {
        repo.record(
            listOf(
                item("n1", "2026-10-09", recordedAt = 100),
                item("n2", "2026-10-10", recordedAt = 300),
                item("c1", "2026-10-10", recordedAt = 200).copy(source = "calendar"),
            ),
        )
        val stats = repo.sourceStats.first()
        assertEquals(setOf("note", "calendar"), stats.keys)
        assertEquals(2 to 300L, stats.getValue("note").let { it.count to it.lastRecordedAt })
        assertEquals(1 to 200L, stats.getValue("calendar").let { it.count to it.lastRecordedAt })
    }
}
