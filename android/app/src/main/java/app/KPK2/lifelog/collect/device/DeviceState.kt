package app.KPK2.lifelog.collect.device

import android.app.NotificationManager
import android.media.AudioDeviceInfo
import android.os.BatteryManager

/** A coarse battery level. Bands keep small drains from writing a new item every few minutes. */
enum class BatteryBand(val key: String, val phrase: String) {
    LOW("low", "battery under 20%"),
    MEDIUM("medium", "battery 20 to 49%"),
    HIGH("high", "battery 50 to 79%"),
    FULL("full", "battery 80% or more"),
    UNKNOWN("unknown", "battery level unknown");

    companion object {
        /** The band for a 0 to 100 percentage; null or out of range is [UNKNOWN]. */
        fun of(percent: Int?): BatteryBand = when (percent) {
            null -> UNKNOWN
            in 0 until 20 -> LOW
            in 20 until 50 -> MEDIUM
            in 50 until 80 -> HIGH
            in 80..100 -> FULL
            else -> UNKNOWN
        }

        fun fromKey(key: String): BatteryBand? = entries.firstOrNull { it.key == key }
    }
}

/** The four things the device source tracks. Two equal states mean nothing worth recording happened. */
data class DeviceState(
    val charging: Boolean,
    val battery: BatteryBand,
    val doNotDisturb: Boolean,
    val headphones: Boolean,
) {
    /** A compact, versioned form kept on the device to compare against the next reading. */
    fun encode(): String =
        "$FORMAT;charging=${flag(charging)};battery=${battery.key};dnd=${flag(doNotDisturb)};headphones=${flag(headphones)}"

    companion object {
        private const val FORMAT = "v1"

        private fun flag(value: Boolean) = if (value) "1" else "0"

        /** Reads [encode] output back. Returns null for anything it does not fully understand. */
        fun decode(text: String?): DeviceState? {
            if (text.isNullOrBlank()) return null
            val parts = text.split(';')
            if (parts.firstOrNull() != FORMAT) return null
            val fields = parts.drop(1).mapNotNull { part ->
                val eq = part.indexOf('=')
                if (eq <= 0) null else part.substring(0, eq) to part.substring(eq + 1)
            }.toMap()
            fun bool(name: String): Boolean? = when (fields[name]) {
                "1" -> true
                "0" -> false
                else -> null
            }
            return DeviceState(
                charging = bool("charging") ?: return null,
                battery = fields["battery"]?.let(BatteryBand::fromKey) ?: return null,
                doNotDisturb = bool("dnd") ?: return null,
                headphones = bool("headphones") ?: return null,
            )
        }
    }
}

/**
 * Raw values read from the phone's system services, before interpretation. A null field means the
 * service or extra was not available on this phone.
 */
data class DeviceReading(
    val plugged: Int? = null,
    val batteryStatus: Int? = null,
    val level: Int? = null,
    val scale: Int? = null,
    /** BatteryManager's capacity property, used when the battery broadcast has no level. */
    val capacityPercent: Int? = null,
    val interruptionFilter: Int? = null,
    val audioOutputTypes: List<Int> = emptyList(),
) {
    fun toState(): DeviceState = DeviceState(
        charging = isCharging(plugged, batteryStatus),
        battery = BatteryBand.of(batteryPercent(level, scale, capacityPercent)),
        doNotDisturb = isDoNotDisturb(interruptionFilter),
        headphones = hasHeadphones(audioOutputTypes),
    )

    companion object {
        /** Output types that mean sound goes to the person's ears rather than the phone speaker. */
        private val HEADPHONE_TYPES = setOf(
            AudioDeviceInfo.TYPE_WIRED_HEADSET,
            AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
            AudioDeviceInfo.TYPE_USB_HEADSET,
            AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
            AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
            AudioDeviceInfo.TYPE_HEARING_AID,
            AudioDeviceInfo.TYPE_BLE_HEADSET,
        )

        /** Plugged into any power source, or reported as charging or full. */
        fun isCharging(plugged: Int?, status: Int?): Boolean =
            (plugged ?: 0) != 0 ||
                status == BatteryManager.BATTERY_STATUS_CHARGING ||
                status == BatteryManager.BATTERY_STATUS_FULL

        /** Level over scale as a whole percentage, falling back to [capacity]; null when neither is usable. */
        fun batteryPercent(level: Int?, scale: Int?, capacity: Int? = null): Int? =
            if (level != null && scale != null && level >= 0 && scale > 0) {
                (level * 100 / scale).coerceIn(0, 100)
            } else {
                capacity?.takeIf { it in 0..100 }
            }

        /** Any filter that silences some notifications counts as Do Not Disturb on. */
        fun isDoNotDisturb(filter: Int?): Boolean = when (filter) {
            NotificationManager.INTERRUPTION_FILTER_PRIORITY,
            NotificationManager.INTERRUPTION_FILTER_ALARMS,
            NotificationManager.INTERRUPTION_FILTER_NONE,
            -> true
            else -> false
        }

        /**
         * True when a wired, USB, hearing aid or Bluetooth audio output is connected. Bluetooth audio
         * cannot tell headphones from a speaker, so it counts as headphones.
         */
        fun hasHeadphones(outputTypes: Collection<Int>): Boolean = outputTypes.any { it in HEADPHONE_TYPES }
    }
}
