package app.KPK2.lifelog.collect.note

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import app.KPK2.lifelog.data.LifelogDatabase
import app.KPK2.lifelog.data.LifelogRepository
import app.KPK2.lifelog.sources.FakeCollector
import app.KPK2.lifelog.sources.SourceId
import app.KPK2.lifelog.sources.SourcePolicy
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.time.ZoneId
import java.time.ZonedDateTime

@RunWith(RobolectricTestRunner::class)
class NoteCollectorTest {

    private lateinit var db: LifelogDatabase
    private lateinit var repo: LifelogRepository

    private val newYork = ZoneId.of("America/New_York")

    // 2026-10-18 23:30 in New York is already 2026-10-19 in UTC.
    private val lateEvening = ZonedDateTime.of(2026, 10, 18, 23, 30, 0, 0, newYork).toInstant().toEpochMilli()

    @Before
    fun open() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        db = Room.inMemoryDatabaseBuilder(context, LifelogDatabase::class.java).allowMainThreadQueries().build()
        repo = LifelogRepository(db.lifelogDao())
    }

    @After
    fun close() = db.close()

    @Test
    fun noteItemFollowsTheSharedSchema() {
        val item = NoteCollector.itemFor("Things that gave me energy\nWorkshop questions. #workshop", lateEvening, newYork)!!
        assertEquals("note", item.source)
        assertEquals("2026-10-18", item.date)
        assertEquals("Things that gave me energy", item.title)
        assertEquals("Workshop questions. #workshop", item.summary)
        assertEquals(listOf("workshop"), item.tags)
        assertNull(item.url)
        assertEquals(lateEvening, item.recordedAt)
        assertTrue(item.id.matches(Regex("note-[0-9a-f]{16}")))
    }

    @Test
    fun idIsStableForTheSameMomentAndTextAndHidesTheText() {
        val a = NoteCollector.itemFor("Same note", lateEvening, newYork)!!
        val b = NoteCollector.itemFor("Same note", lateEvening, newYork)!!
        val later = NoteCollector.itemFor("Same note", lateEvening + 1, newYork)!!
        assertEquals(a.id, b.id)
        assertNotEquals(a.id, later.id)
        assertFalse(a.id.contains("Same", ignoreCase = true))
    }

    @Test
    fun blankTextSavesNothing() = runTest {
        assertNull(NoteCollector.save(repo, "  \n ", lateEvening, newYork))
        assertEquals(0, repo.count.first())
    }

    @Test
    fun savedNoteAppearsOnceAndKeepsFullTextOnThePhone() = runTest {
        val saved = NoteCollector.save(repo, "Rate note\nPolish only, lower fee.", lateEvening, newYork)!!
        NoteCollector.save(repo, "Rate note\nPolish only, lower fee.", lateEvening, newYork)
        val items = repo.items.first()
        assertEquals(listOf(saved.id), items.map { it.id })
        assertEquals("Rate note\nPolish only, lower fee.", items.single().raw)
    }

    @Test
    fun deletedNoteIsNotWrittenAgain() = runTest {
        val saved = NoteCollector.save(repo, "Draft idea", lateEvening, newYork)!!
        repo.delete(saved.id)
        assertNull(NoteCollector.save(repo, "Draft idea", lateEvening, newYork))
        assertEquals(0, repo.count.first())
    }

    @Test
    fun collectorNeedsNoPermissionDoesNotPullAndStartsOn() {
        val collector = NoteCollector()
        assertEquals(SourceId.NOTE, collector.id)
        assertTrue(collector.requiredPermissions.isEmpty())
        assertFalse(collector.pullsPeriodically)
        assertTrue(SourcePolicy.startsOn(collector))
    }

    @Test
    fun composerShowsOnlyWhileNotesAreRegisteredAndOn() {
        val note = FakeCollector(SourceId.NOTE)
        assertTrue(composerShown(note, choice = null))
        assertTrue(composerShown(note, choice = true))
        assertFalse(composerShown(note, choice = false))
        assertFalse(composerShown(null, choice = true))
    }
}
