package app.KPK2.lifelog.collect.motion

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import android.util.Log
import app.KPK2.lifelog.appGraph
import app.KPK2.lifelog.sources.CollectorRegistry
import app.KPK2.lifelog.sources.SourceId
import app.KPK2.lifelog.sources.SourcePolicy
import com.google.android.gms.location.ActivityTransitionResult
import kotlinx.coroutines.launch

/** Receives activity transitions from Play services and records the bouts they finish. */
class MotionTransitionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (!ActivityTransitionResult.hasResult(intent)) return
        val result = runCatching { ActivityTransitionResult.extractResult(intent) }.getOrNull() ?: return
        // Both clocks are read together so event times land on the wall clock consistently.
        val nowWall = System.currentTimeMillis()
        val nowElapsed = SystemClock.elapsedRealtimeNanos()
        val transitions = result.transitionEvents.mapNotNull { event ->
            MotionTransition.of(
                detectedType = event.activityType,
                transitionType = event.transitionType,
                atMillis = MotionTransition.wallClockOf(event.elapsedRealTimeNanos, nowWall, nowElapsed),
            )
        }
        if (transitions.isEmpty()) return

        val app = context.applicationContext
        val graph = app.appGraph
        val pending = goAsync()
        graph.appScope.launch {
            try {
                // A late delivery after the person turned the source off, or revoked access, is dropped.
                val collector = CollectorRegistry.forSource(SourceId.MOTION)
                val on = SourcePolicy.isOn(
                    collector,
                    graph.sourceSettings.current()[SourceId.MOTION],
                    collector?.hasAccess(app) ?: false,
                )
                if (on) MotionRecorder(MotionStateStore(app), graph.repository).accept(transitions)
            } catch (e: Exception) {
                Log.w(TAG, "Could not record activity transitions", e)
            } finally {
                pending.finish()
            }
        }
    }

    companion object {
        private const val TAG = "MotionTransitions"
        const val ACTION = "app.KPK2.lifelog.action.MOTION_TRANSITION"
    }
}
