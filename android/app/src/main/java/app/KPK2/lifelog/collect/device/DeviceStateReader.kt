package app.KPK2.lifelog.collect.device

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioManager
import android.os.BatteryManager

/**
 * Reads the current device values from system services. None of these reads needs a runtime
 * permission. Each read is guarded on its own so one missing service still leaves the others.
 */
object DeviceStateReader {

    fun read(context: Context): DeviceReading {
        // ACTION_BATTERY_CHANGED is sticky: a null receiver returns the last broadcast without listening.
        val battery: Intent? = runCatching {
            context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        }.getOrNull()
        val batteryManager = context.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
        val notifications = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        val audio = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

        return DeviceReading(
            plugged = battery?.intExtra(BatteryManager.EXTRA_PLUGGED),
            batteryStatus = battery?.intExtra(BatteryManager.EXTRA_STATUS),
            level = battery?.intExtra(BatteryManager.EXTRA_LEVEL),
            scale = battery?.intExtra(BatteryManager.EXTRA_SCALE),
            capacityPercent = runCatching {
                batteryManager?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
            }.getOrNull(),
            interruptionFilter = runCatching { notifications?.currentInterruptionFilter }.getOrNull(),
            audioOutputTypes = runCatching {
                audio?.getDevices(AudioManager.GET_DEVICES_OUTPUTS)?.map { it.type }
            }.getOrNull().orEmpty(),
        )
    }

    private fun Intent.intExtra(name: String): Int? =
        if (hasExtra(name)) getIntExtra(name, -1).takeIf { it != -1 } else null
}
