package app.KPK2.lifelog.collect.motion

import app.KPK2.lifelog.data.LifelogItem
import app.KPK2.lifelog.sources.SourceId
import java.time.Instant
import java.time.ZoneId

/** An activity that has started and not yet ended. */
data class OpenBout(val activity: MotionActivity, val startMillis: Long)

/**
 * What the builder remembers between batches of transitions: the bout in progress, and the time of the
 * newest transition already handled so late or repeated deliveries cannot move time backwards.
 */
data class BoutState(val open: OpenBout? = null, val lastEventMillis: Long = Long.MIN_VALUE)

/** A finished activity bout. */
data class MotionBout(val activity: MotionActivity, val startMillis: Long, val endMillis: Long) {
    val durationMillis: Long get() = endMillis - startMillis
    val minutes: Long get() = durationMillis / 60_000L
}

/** The result of feeding one batch: the state to keep and the bouts worth recording. */
data class BoutStep(val state: BoutState, val bouts: List<MotionBout>)

/**
 * Turns ENTER and EXIT transitions into activity bouts. Pure, so every rule below is unit tested.
 *
 * - A bout starts at an ENTER and ends at the EXIT of the same activity, or at the ENTER of a different
 *   activity when the EXIT never came.
 * - A repeated ENTER of the activity already in progress keeps the earlier start.
 * - An EXIT with no matching bout in progress is ignored: the start is unknown.
 * - Transitions older than the newest one already handled are ignored.
 * - Only bouts longer than [MIN_BOUT_MILLIS] are recorded. Bouts longer than [MAX_BOUT_MILLIS] are
 *   dropped too: they mean updates stopped (a restart, a lost registration) and the real end is unknown.
 */
object BoutBuilder {
    const val MIN_BOUT_MILLIS: Long = 5 * 60_000L
    const val MAX_BOUT_MILLIS: Long = 16 * 60 * 60_000L

    fun advance(state: BoutState, transitions: List<MotionTransition>): BoutStep {
        // Oldest first; at the same instant the EXIT of one activity comes before the ENTER of the next.
        val ordered = transitions.sortedWith(compareBy<MotionTransition> { it.atMillis }.thenBy { it.entered })
        var open = state.open
        var last = state.lastEventMillis
        val bouts = mutableListOf<MotionBout>()

        fun close(at: Long) {
            val current = open ?: return
            val bout = MotionBout(current.activity, current.startMillis, at)
            if (isWorthRecording(bout)) bouts += bout
            open = null
        }

        for (t in ordered) {
            if (t.atMillis < last) continue
            last = t.atMillis
            val current = open
            if (t.entered) {
                if (current?.activity == t.activity) continue
                close(t.atMillis)
                open = OpenBout(t.activity, t.atMillis)
            } else if (current?.activity == t.activity) {
                close(t.atMillis)
            }
        }
        return BoutStep(BoutState(open, last), bouts)
    }

    fun isWorthRecording(bout: MotionBout): Boolean =
        bout.durationMillis > MIN_BOUT_MILLIS && bout.durationMillis <= MAX_BOUT_MILLIS

    /**
     * The lifelog item for [bout]. The id comes from the activity and start time, so a bout delivered
     * twice updates one item. The date is the local day the bout started.
     */
    fun toItem(bout: MotionBout, zone: ZoneId): LifelogItem = LifelogItem(
        id = "${SourceId.MOTION.wire}-${bout.activity.tag}-${bout.startMillis}",
        date = LifelogItem.dateOf(bout.startMillis, zone),
        source = SourceId.MOTION.wire,
        title = bout.activity.title,
        summary = "${bout.activity.title} for ${bout.minutes} minutes.",
        tags = listOf(bout.activity.tag),
        url = null,
        raw = "start=${Instant.ofEpochMilli(bout.startMillis)} end=${Instant.ofEpochMilli(bout.endMillis)}",
    )
}
