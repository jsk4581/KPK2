package app.KPK2.lifelog.collect.health

import androidx.health.connect.client.records.ExerciseSessionRecord
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class HealthDaysTest {
    private val zone = ZoneId.of("America/New_York")
    private val window = DayWindow(LocalDate.parse("2026-10-14"), LocalDate.parse("2026-10-20"))

    private fun at(local: String): Instant = LocalDateTime.parse(local).atZone(zone).toInstant()

    private fun sleep(from: String, to: String, asleep: Long) = SleepSpan(at(from), at(to), asleep)

    private fun workout(from: String, to: String, type: Int) = ExerciseSpan(at(from), at(to), type)

    @Test
    fun stepsMakeOneItemPerDayInsideTheWindowAndSkipEmptyDays() {
        val items = HealthDays.stepItems(
            mapOf(
                LocalDate.parse("2026-10-20") to 12_345L,
                LocalDate.parse("2026-10-19") to 0L,
                LocalDate.parse("2026-10-13") to 4_000L,
                LocalDate.parse("2026-10-15") to 812L,
            ),
            window,
        )

        assertEquals(listOf("health-steps-2026-10-15", "health-steps-2026-10-20"), items.map { it.id })
        val last = items.last()
        assertEquals("2026-10-20", last.date)
        assertEquals("health", last.source)
        assertEquals("12,345 steps", last.title)
        assertEquals("Walked 12,345 steps.", last.summary)
        assertEquals(listOf("steps"), last.tags)
        assertEquals(null, last.url)
    }

    @Test
    fun sleepCountsOnTheDayOfWakingUp() {
        val items = HealthDays.sleepItems(listOf(sleep("2026-10-19T23:10", "2026-10-20T06:40", 430)), window, zone)

        assertEquals(1, items.size)
        assertEquals("health-sleep-2026-10-20", items[0].id)
        assertEquals("Slept 7 h 10 min", items[0].title)
        assertEquals("Slept 7 h 10 min.", items[0].summary)
    }

    @Test
    fun overlappingSleepFromTwoAppsCountsOnceButANapAddsUp() {
        val items = HealthDays.sleepItems(
            listOf(
                sleep("2026-10-19T23:00", "2026-10-20T07:00", 420),
                // The same night as recorded by a second app.
                sleep("2026-10-19T23:20", "2026-10-20T06:50", 400),
                sleep("2026-10-20T14:00", "2026-10-20T14:30", 25),
            ),
            window,
            zone,
        )

        assertEquals(1, items.size)
        assertEquals("Slept 7 h 25 min", items[0].title)
        assertEquals("Slept 7 h 25 min in 2 sessions.", items[0].summary)
    }

    @Test
    fun sleepOutsideTheWindowOrWithoutSleepIsDropped() {
        val items = HealthDays.sleepItems(
            listOf(
                sleep("2026-10-12T23:00", "2026-10-13T07:00", 480),
                sleep("2026-10-16T23:00", "2026-10-17T07:00", 0),
                sleep("2026-10-17T23:00", "2026-10-17T22:00", 60),
            ),
            window,
            zone,
        )

        assertEquals(emptyList<String>(), items.map { it.id })
    }

    @Test
    fun oneExerciseSessionNamesItsKindAndMinutes() {
        val items = HealthDays.exerciseItems(
            listOf(workout("2026-10-18T07:00", "2026-10-18T07:32", ExerciseSessionRecord.EXERCISE_TYPE_RUNNING)),
            window,
            zone,
        )

        assertEquals("health-exercise-2026-10-18", items.single().id)
        assertEquals("Exercise: running 32 min", items.single().title)
        assertEquals("Running 32 min.", items.single().summary)
        assertEquals(listOf("exercise", "running"), items.single().tags)
    }

    @Test
    fun sameWorkoutFromTwoAppsIsKeptOnceAndShortSessionsAreDropped() {
        val items = HealthDays.exerciseItems(
            listOf(
                workout("2026-10-18T07:00", "2026-10-18T07:30", ExerciseSessionRecord.EXERCISE_TYPE_RUNNING),
                workout("2026-10-18T07:02", "2026-10-18T07:33", ExerciseSessionRecord.EXERCISE_TYPE_RUNNING),
                // A different kind at an overlapping time is its own session.
                workout("2026-10-18T07:20", "2026-10-18T07:50", ExerciseSessionRecord.EXERCISE_TYPE_YOGA),
                workout("2026-10-18T18:00", "2026-10-18T18:00:40", ExerciseSessionRecord.EXERCISE_TYPE_WALKING),
            ),
            window,
            zone,
        )

        val item = items.single()
        assertEquals("Exercise: 2 sessions, 61 min", item.title)
        assertEquals("Running 31 min, yoga 30 min.", item.summary)
        assertEquals(listOf("exercise", "running", "yoga"), item.tags)
    }

    @Test
    fun longExerciseListsAreTruncatedAndTagsCapped() {
        val types = listOf(
            ExerciseSessionRecord.EXERCISE_TYPE_WALKING,
            ExerciseSessionRecord.EXERCISE_TYPE_RUNNING,
            ExerciseSessionRecord.EXERCISE_TYPE_YOGA,
            ExerciseSessionRecord.EXERCISE_TYPE_BIKING,
            ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL,
            ExerciseSessionRecord.EXERCISE_TYPE_OTHER_WORKOUT,
        )
        val sessions = types.mapIndexed { i, type ->
            workout("2026-10-19T0${i + 1}:00", "2026-10-19T0${i + 1}:20", type)
        }

        val item = HealthDays.exerciseItems(sessions, window, zone).single()

        assertEquals("Exercise: 6 sessions, 120 min", item.title)
        assertEquals("Walking 20 min, running 20 min, yoga 20 min, cycling 20 min and 2 more.", item.summary)
        assertEquals(1 + HealthDays.MAX_KIND_TAGS, item.tags.size)
    }

    @Test
    fun exerciseIsGroupedByStartDayAndUnknownKindsReadAsWorkout() {
        val items = HealthDays.exerciseItems(
            listOf(
                workout("2026-10-16T23:40", "2026-10-17T00:20", ExerciseSessionRecord.EXERCISE_TYPE_OTHER_WORKOUT),
                workout("2026-10-17T12:00", "2026-10-17T12:45", ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING),
            ),
            window,
            zone,
        )

        assertEquals(listOf("2026-10-16", "2026-10-17"), items.map { it.date })
        assertEquals("Exercise: workout 40 min", items[0].title)
        assertTrue(items[1].tags.contains("strength-training"))
    }

    @Test
    fun durationsReadNaturally() {
        assertEquals("45 min", HealthDays.formatDuration(45))
        assertEquals("8 h", HealthDays.formatDuration(480))
        assertEquals("6 h 5 min", HealthDays.formatDuration(365))
    }
}
