package app.KPK2.lifelog.sources

import android.app.Activity
import android.app.Application
import android.os.Bundle

/**
 * Calls [onForeground] each time the first of the app's activities becomes visible, including a warm
 * reopen while the process is still alive. Collectors register it in [Collector.start] and unregister
 * it in [Collector.stop].
 */
class ForegroundWatcher(private val onForeground: () -> Unit) : Application.ActivityLifecycleCallbacks {
    private var visible = 0

    override fun onActivityStarted(activity: Activity) {
        if (visible++ == 0) onForeground()
    }

    override fun onActivityStopped(activity: Activity) {
        visible = (visible - 1).coerceAtLeast(0)
    }

    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
    override fun onActivityResumed(activity: Activity) {}
    override fun onActivityPaused(activity: Activity) {}
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
    override fun onActivityDestroyed(activity: Activity) {}
}
