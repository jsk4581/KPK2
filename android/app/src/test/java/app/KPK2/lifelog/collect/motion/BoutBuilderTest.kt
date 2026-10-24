package app.KPK2.lifelog.collect.motion

import app.KPK2.lifelog.collect.motion.MotionActivity.CYCLING
import app.KPK2.lifelog.collect.motion.MotionActivity.IN_VEHICLE
import app.KPK2.lifelog.collect.motion.MotionActivity.RUNNING
import app.KPK2.lifelog.collect.motion.MotionActivity.STILL
import app.KPK2.lifelog.collect.motion.MotionActivity.WALKING
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.DetectedActivity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDateTime
import java.time.ZoneId

class BoutBuilderTest {
    private val zone = ZoneId.of("America/Chicago")

    /** Wall-clock millis for a fictional local time on 2026-10-20 in [zone]. */
    private fun at(hour: Int, minute: Int, second: Int = 0, day: Int = 20): Long =
        LocalDateTime.of(2026, 10, day, hour, minute, second).atZone(zone).toInstant().toEpochMilli()

    private fun enter(a: MotionActivity, t: Long) = MotionTransition(a, entered = true, atMillis = t)
    private fun exit(a: MotionActivity, t: Long) = MotionTransition(a, entered = false, atMillis = t)

    private fun bouts(vararg transitions: MotionTransition, state: BoutState = BoutState()) =
        BoutBuilder.advance(state, transitions.toList()).bouts

    @Test
    fun enterThenExitOfTheSameActivityMakesOneBout() {
        val result = bouts(enter(WALKING, at(8, 0)), exit(WALKING, at(8, 12)))
        assertEquals(listOf(MotionBout(WALKING, at(8, 0), at(8, 12))), result)
        assertEquals(12L, result.single().minutes)
    }

    @Test
    fun boutsOfFiveMinutesOrLessAreDropped() {
        assertEquals(emptyList<MotionBout>(), bouts(enter(RUNNING, at(7, 0)), exit(RUNNING, at(7, 4))))
        assertEquals(emptyList<MotionBout>(), bouts(enter(RUNNING, at(7, 0)), exit(RUNNING, at(7, 5))))
        assertEquals(1, bouts(enter(RUNNING, at(7, 0)), exit(RUNNING, at(7, 5, 1))).size)
    }

    @Test
    fun enterOfAnotherActivityEndsTheBoutWhenTheExitNeverCame() {
        val result = bouts(enter(STILL, at(9, 0)), enter(IN_VEHICLE, at(9, 30)), exit(IN_VEHICLE, at(9, 55)))
        assertEquals(
            listOf(MotionBout(STILL, at(9, 0), at(9, 30)), MotionBout(IN_VEHICLE, at(9, 30), at(9, 55))),
            result,
        )
    }

    @Test
    fun aRepeatedEnterKeepsTheEarlierStart() {
        val result = bouts(enter(CYCLING, at(17, 0)), enter(CYCLING, at(17, 10)), exit(CYCLING, at(17, 40)))
        assertEquals(listOf(MotionBout(CYCLING, at(17, 0), at(17, 40))), result)
    }

    @Test
    fun anExitWithoutAMatchingBoutIsIgnored() {
        assertEquals(emptyList<MotionBout>(), bouts(exit(WALKING, at(10, 0))))
        val step = BoutBuilder.advance(BoutState(), listOf(enter(STILL, at(10, 0)), exit(WALKING, at(10, 20))))
        assertEquals(emptyList<MotionBout>(), step.bouts)
        assertEquals(OpenBout(STILL, at(10, 0)), step.state.open)
    }

    @Test
    fun aBoutInProgressCarriesOverToTheNextBatch() {
        val first = BoutBuilder.advance(BoutState(), listOf(exit(STILL, at(12, 0)), enter(WALKING, at(12, 0))))
        assertEquals(emptyList<MotionBout>(), first.bouts)
        assertEquals(OpenBout(WALKING, at(12, 0)), first.state.open)

        val second = BoutBuilder.advance(first.state, listOf(exit(WALKING, at(12, 25)), enter(STILL, at(12, 25))))
        assertEquals(listOf(MotionBout(WALKING, at(12, 0), at(12, 25))), second.bouts)
        assertEquals(OpenBout(STILL, at(12, 25)), second.state.open)
    }

    @Test
    fun aBatchIsReadInTimeOrderWithExitBeforeEnterAtTheSameInstant() {
        val result = bouts(
            exit(WALKING, at(14, 30)),
            enter(STILL, at(14, 30)),
            enter(WALKING, at(14, 0)),
            exit(STILL, at(15, 0)),
        )
        assertEquals(listOf(MotionBout(WALKING, at(14, 0), at(14, 30)), MotionBout(STILL, at(14, 30), at(15, 0))), result)
    }

    @Test
    fun transitionsOlderThanTheLastOneHandledAreIgnored() {
        val state = BoutState(open = OpenBout(STILL, at(16, 0)), lastEventMillis = at(16, 0))
        val step = BoutBuilder.advance(state, listOf(enter(WALKING, at(15, 0)), exit(STILL, at(15, 30))))
        assertEquals(emptyList<MotionBout>(), step.bouts)
        assertEquals(state, step.state)
    }

    @Test
    fun aRedeliveredBatchRecordsNothingNew() {
        val batch = listOf(exit(WALKING, at(11, 20)), enter(STILL, at(11, 20)))
        val first = BoutBuilder.advance(BoutState(OpenBout(WALKING, at(11, 0)), at(11, 0)), batch)
        assertEquals(1, first.bouts.size)
        val again = BoutBuilder.advance(first.state, batch)
        assertEquals(emptyList<MotionBout>(), again.bouts)
        assertEquals(first.state, again.state)
    }

    @Test
    fun boutsLongerThanTheCapAreDroppedAsMissedUpdates() {
        assertEquals(1, bouts(enter(STILL, at(0, 0)), exit(STILL, at(16, 0))).size)
        assertEquals(emptyList<MotionBout>(), bouts(enter(STILL, at(0, 0)), exit(STILL, at(16, 1))))
    }

    @Test
    fun itemFollowsTheLifelogSchema() {
        val item = BoutBuilder.toItem(MotionBout(IN_VEHICLE, at(23, 50), at(0, 32, day = 21)), zone)
        assertEquals("motion-in-vehicle-${at(23, 50)}", item.id)
        assertEquals("2026-10-20", item.date)
        assertEquals("motion", item.source)
        assertEquals("In a vehicle", item.title)
        assertEquals("In a vehicle for 42 minutes.", item.summary)
        assertEquals(listOf("in-vehicle"), item.tags)
        assertNull(item.url)
    }

    @Test
    fun theSameBoutAlwaysGetsTheSameId() {
        val a = BoutBuilder.toItem(MotionBout(WALKING, at(8, 0), at(8, 12)), zone)
        val b = BoutBuilder.toItem(MotionBout(WALKING, at(8, 0), at(8, 15)), zone)
        assertEquals(a.id, b.id)
        assertTrue(a.id != BoutBuilder.toItem(MotionBout(RUNNING, at(8, 0), at(8, 12)), zone).id)
    }

    @Test
    fun recognitionValuesMapToTransitions() {
        assertEquals(
            MotionTransition(CYCLING, entered = true, atMillis = 5L),
            MotionTransition.of(DetectedActivity.ON_BICYCLE, ActivityTransition.ACTIVITY_TRANSITION_ENTER, 5L),
        )
        assertEquals(
            MotionTransition(STILL, entered = false, atMillis = 5L),
            MotionTransition.of(DetectedActivity.STILL, ActivityTransition.ACTIVITY_TRANSITION_EXIT, 5L),
        )
        assertNull(MotionTransition.of(DetectedActivity.TILTING, ActivityTransition.ACTIVITY_TRANSITION_ENTER, 5L))
        assertNull(MotionTransition.of(DetectedActivity.UNKNOWN, ActivityTransition.ACTIVITY_TRANSITION_EXIT, 5L))
        assertNull(MotionTransition.of(DetectedActivity.WALKING, 7, 5L))
    }

    @Test
    fun eventTimesMoveOntoTheWallClock() {
        val nowWall = at(9, 0)
        val nowElapsed = 3_600_000_000_000L
        assertEquals(nowWall - 90_000L, MotionTransition.wallClockOf(nowElapsed - 90_000_000_000L, nowWall, nowElapsed))
        assertEquals(nowWall, MotionTransition.wallClockOf(nowElapsed + 1_000_000L, nowWall, nowElapsed))
    }
}
