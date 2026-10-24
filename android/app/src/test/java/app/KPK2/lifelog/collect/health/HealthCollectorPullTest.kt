package app.KPK2.lifelog.collect.health

import android.content.Context
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import app.KPK2.lifelog.data.LifelogDatabase
import app.KPK2.lifelog.data.LifelogRepository
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
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
class HealthCollectorPullTest {
    private val zone = ZoneId.of("America/Chicago")
    private val now = LocalDateTime.parse("2026-10-20T21:00").atZone(zone).toInstant()
    private val collector = HealthCollector(readerFor = { null }, clock = Clock.fixed(now, zone))

    private lateinit var db: LifelogDatabase
    private lateinit var repo: LifelogRepository
    private lateinit var state: HealthPullState
    private val context: Context get() = ApplicationProvider.getApplicationContext()

    private fun at(local: String): Instant = LocalDateTime.parse(local).atZone(zone).toInstant()

    /** Fictional readings; records the windows it was asked for. */
    private class FakeReader(
        var granted: Set<String> = HealthType.readPermissions,
        var steps: Map<LocalDate, Long> = emptyMap(),
        var sleep: List<SleepSpan> = emptyList(),
        var exercise: List<ExerciseSpan> = emptyList(),
        var sleepFails: Boolean = false,
    ) : HealthReader {
        val stepsFrom = mutableListOf<LocalDate>()

        override suspend fun grantedPermissions() = granted

        override suspend fun dailySteps(from: LocalDate, until: LocalDateTime): Map<LocalDate, Long> {
            stepsFrom += from
            return steps
        }

        override suspend fun sleepSessions(from: Instant, until: Instant): List<SleepSpan> {
            if (sleepFails) throw SecurityException("background read not allowed")
            return sleep.filter { it.end > from && it.start < until }
        }

        override suspend fun exerciseSessions(from: Instant, until: Instant) =
            exercise.filter { it.end > from && it.start < until }
    }

    @Before
    fun open() {
        db = Room.inMemoryDatabaseBuilder(context, LifelogDatabase::class.java).allowMainThreadQueries().build()
        repo = LifelogRepository(db.lifelogDao())
        context.getSharedPreferences(HealthPullState.FILE_NAME, Context.MODE_PRIVATE).edit().clear().commit()
        state = HealthPullState(context)
    }

    @After
    fun close() = db.close()

    private fun dayReader() = FakeReader(
        steps = mapOf(LocalDate.parse("2026-10-19") to 9_120L, LocalDate.parse("2026-10-20") to 3_480L),
        sleep = listOf(SleepSpan(at("2026-10-19T23:30"), at("2026-10-20T06:30"), 400)),
        exercise = listOf(
            ExerciseSpan(at("2026-10-20T07:00"), at("2026-10-20T07:45"), ExerciseSessionRecord.EXERCISE_TYPE_BIKING),
        ),
    )

    @Test
    fun firstPullWritesOneItemPerDayAndTypeThenRepeatPullsWriteNothingNew() = runTest {
        val reader = dayReader()

        assertEquals(4, collector.pullWith(reader, repo, state))
        assertEquals(
            listOf(
                "health-exercise-2026-10-20",
                "health-sleep-2026-10-20",
                "health-steps-2026-10-19",
                "health-steps-2026-10-20",
            ),
            repo.snapshot().map { it.id }.sorted(),
        )
        assertTrue(repo.snapshot().all { it.source == "health" })

        assertEquals(0, collector.pullWith(reader, repo, state))
        assertEquals(4, repo.snapshot().size)
        assertEquals(listOf(LocalDate.parse("2026-09-21"), LocalDate.parse("2026-10-14")), reader.stepsFrom)
    }

    @Test
    fun aDayThatChangedUpdatesItsItemInPlace() = runTest {
        val reader = dayReader()
        collector.pullWith(reader, repo, state)

        reader.steps = reader.steps + (LocalDate.parse("2026-10-20") to 6_010L)

        assertEquals(1, collector.pullWith(reader, repo, state))
        val today = repo.snapshot().filter { it.id == "health-steps-2026-10-20" }
        assertEquals(listOf("6,010 steps"), today.map { it.title })
    }

    @Test
    fun onlyGrantedTypesAreReadAndNoGrantWritesNothing() = runTest {
        val reader = dayReader().apply { granted = setOf(HealthType.SLEEP.readPermission) }
        assertEquals(1, collector.pullWith(reader, repo, state))
        assertEquals(listOf("health-sleep-2026-10-20"), repo.snapshot().map { it.id })
        assertEquals(emptyList<LocalDate>(), reader.stepsFrom)

        val none = dayReader().apply { granted = emptySet() }
        assertEquals(0, collector.pullWith(none, repo, state))
        assertEquals(emptySet<String>(), state.grantedPermissions)
    }

    @Test
    fun aFailedReadKeepsTheOtherTypesAndRetriesTheLongWindow() = runTest {
        val reader = dayReader().apply { sleepFails = true }

        assertEquals(3, collector.pullWith(reader, repo, state))
        assertFalse(state.hasPulled)

        reader.sleepFails = false
        assertEquals(1, collector.pullWith(reader, repo, state))
        assertTrue(state.hasPulled)
        assertEquals(LocalDate.parse("2026-09-21"), reader.stepsFrom.last())
    }

    @Test
    fun deletedDaysStayDeleted() = runTest {
        val reader = dayReader()
        collector.pullWith(reader, repo, state)
        repo.delete("health-steps-2026-10-20")

        reader.steps = reader.steps + (LocalDate.parse("2026-10-20") to 7_777L)
        assertEquals(0, collector.pullWith(reader, repo, state))
        assertFalse(repo.snapshot().any { it.id == "health-steps-2026-10-20" })
    }
}
