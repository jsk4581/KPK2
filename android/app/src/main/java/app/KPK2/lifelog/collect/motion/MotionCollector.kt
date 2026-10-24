package app.KPK2.lifelog.collect.motion

import android.Manifest
import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import app.KPK2.lifelog.data.LifelogRepository
import app.KPK2.lifelog.sources.Collector
import app.KPK2.lifelog.sources.SourceId
import com.google.android.gms.location.ActivityRecognition
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionRequest
import java.util.concurrent.atomic.AtomicBoolean

/**
 * The motion source: walking, running, cycling, riding in a vehicle and staying still, from the Activity
 * Recognition Transition API in Google Play services. A push source: Play services delivers transitions
 * to [MotionTransitionReceiver], which records one item per bout longer than five minutes.
 *
 * Without Play services the source records nothing and [MotionStatus] says why; nothing here throws.
 */
class MotionCollector : Collector {
    override val id: SourceId = SourceId.MOTION

    override val requiredPermissions: List<String> = listOf(Manifest.permission.ACTIVITY_RECOGNITION)

    @SuppressLint("MissingPermission") // start() is only called once hasAccess() saw the permission.
    override fun start(context: Context, repository: LifelogRepository) {
        val app = context.applicationContext
        val store = MotionStateStore(app)
        if (MotionStatus.playServices(app) != MotionStatus.READY) {
            Log.i(TAG, "Google Play services unavailable; motion is not recorded")
            return
        }
        // The registration outlives this process but not a reboot or an app update, and the app cannot
        // tell which happened: register once per process. Repeating it replaces the same PendingIntent.
        if (!startedInProcess.compareAndSet(false, true)) return
        val request = ActivityTransitionRequest(watchedTransitions())
        try {
            ActivityRecognition.getClient(app)
                .requestActivityTransitionUpdates(request, transitionIntent(app))
                .addOnSuccessListener {
                    store.registered = true
                    store.registrationFailed = false
                }
                .addOnFailureListener { e ->
                    Log.w(TAG, "Could not register for activity transitions", e)
                    startedInProcess.set(false)
                    store.registrationFailed = true
                }
        } catch (e: Exception) {
            // SecurityException when the permission was revoked in between, or a Play services error.
            Log.w(TAG, "Could not register for activity transitions", e)
            startedInProcess.set(false)
            store.registrationFailed = true
        }
    }

    @SuppressLint("MissingPermission")
    override fun stop(context: Context) {
        val app = context.applicationContext
        val store = MotionStateStore(app)
        startedInProcess.set(false)
        store.registrationFailed = false
        // A bout in progress when the person turns the source off is not recorded, and must not join
        // with a later transition once the source is back on.
        store.clearBout()
        if (!store.registered) return
        store.registered = false
        if (MotionStatus.playServices(app) != MotionStatus.READY) return
        try {
            ActivityRecognition.getClient(app)
                .removeActivityTransitionUpdates(transitionIntent(app))
                .addOnFailureListener { e -> Log.w(TAG, "Could not remove activity transition updates", e) }
        } catch (e: Exception) {
            Log.w(TAG, "Could not remove activity transition updates", e)
        }
    }

    companion object {
        private const val TAG = "MotionCollector"
        private const val REQUEST_CODE = 0x6d6f

        private val startedInProcess = AtomicBoolean(false)

        /** ENTER and EXIT for every recorded activity. */
        fun watchedTransitions(): List<ActivityTransition> = MotionActivity.entries.flatMap { activity ->
            listOf(ActivityTransition.ACTIVITY_TRANSITION_ENTER, ActivityTransition.ACTIVITY_TRANSITION_EXIT).map { type ->
                ActivityTransition.Builder()
                    .setActivityType(activity.detectedType)
                    .setActivityTransition(type)
                    .build()
            }
        }

        /** Explicit and mutable: Play services adds the transition result to this intent's extras. */
        internal fun transitionIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            Intent(context, MotionTransitionReceiver::class.java).setAction(MotionTransitionReceiver.ACTION),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
        )
    }
}
