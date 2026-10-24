package app.KPK2.lifelog.collect.device

import android.app.NotificationManager
import android.media.AudioDeviceInfo
import android.os.BatteryManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.ZoneId

class DeviceStateTest {

    private val calm = DeviceState(charging = false, battery = BatteryBand.HIGH, doNotDisturb = false, headphones = false)

    @Test
    fun batteryBandsSplitAtTwentyFiftyAndEighty() {
        assertEquals(BatteryBand.LOW, BatteryBand.of(0))
        assertEquals(BatteryBand.LOW, BatteryBand.of(19))
        assertEquals(BatteryBand.MEDIUM, BatteryBand.of(20))
        assertEquals(BatteryBand.MEDIUM, BatteryBand.of(49))
        assertEquals(BatteryBand.HIGH, BatteryBand.of(50))
        assertEquals(BatteryBand.HIGH, BatteryBand.of(79))
        assertEquals(BatteryBand.FULL, BatteryBand.of(80))
        assertEquals(BatteryBand.FULL, BatteryBand.of(100))
        assertEquals(BatteryBand.UNKNOWN, BatteryBand.of(null))
        assertEquals(BatteryBand.UNKNOWN, BatteryBand.of(-1))
        assertEquals(BatteryBand.UNKNOWN, BatteryBand.of(101))
    }

    @Test
    fun batteryPercentUsesLevelOverScaleThenCapacity() {
        assertEquals(50, DeviceReading.batteryPercent(level = 100, scale = 200))
        assertEquals(100, DeviceReading.batteryPercent(level = 120, scale = 100))
        assertEquals(64, DeviceReading.batteryPercent(level = null, scale = 100, capacity = 64))
        assertEquals(64, DeviceReading.batteryPercent(level = 30, scale = 0, capacity = 64))
        assertNull(DeviceReading.batteryPercent(level = null, scale = null, capacity = Int.MIN_VALUE))
    }

    @Test
    fun chargingWhenPluggedOrReportedChargingOrFull() {
        assertTrue(DeviceReading.isCharging(BatteryManager.BATTERY_PLUGGED_USB, null))
        assertTrue(DeviceReading.isCharging(0, BatteryManager.BATTERY_STATUS_CHARGING))
        assertTrue(DeviceReading.isCharging(null, BatteryManager.BATTERY_STATUS_FULL))
        assertFalse(DeviceReading.isCharging(0, BatteryManager.BATTERY_STATUS_DISCHARGING))
        assertFalse(DeviceReading.isCharging(null, null))
    }

    @Test
    fun doNotDisturbOnForAnySilencingFilter() {
        assertTrue(DeviceReading.isDoNotDisturb(NotificationManager.INTERRUPTION_FILTER_PRIORITY))
        assertTrue(DeviceReading.isDoNotDisturb(NotificationManager.INTERRUPTION_FILTER_ALARMS))
        assertTrue(DeviceReading.isDoNotDisturb(NotificationManager.INTERRUPTION_FILTER_NONE))
        assertFalse(DeviceReading.isDoNotDisturb(NotificationManager.INTERRUPTION_FILTER_ALL))
        assertFalse(DeviceReading.isDoNotDisturb(NotificationManager.INTERRUPTION_FILTER_UNKNOWN))
        assertFalse(DeviceReading.isDoNotDisturb(null))
    }

    @Test
    fun headphonesForWiredUsbAndBluetoothButNotSpeakers() {
        assertTrue(DeviceReading.hasHeadphones(listOf(AudioDeviceInfo.TYPE_BUILTIN_SPEAKER, AudioDeviceInfo.TYPE_WIRED_HEADPHONES)))
        assertTrue(DeviceReading.hasHeadphones(listOf(AudioDeviceInfo.TYPE_USB_HEADSET)))
        assertTrue(DeviceReading.hasHeadphones(listOf(AudioDeviceInfo.TYPE_BLUETOOTH_A2DP)))
        assertTrue(DeviceReading.hasHeadphones(listOf(AudioDeviceInfo.TYPE_BLE_HEADSET)))
        assertFalse(DeviceReading.hasHeadphones(listOf(AudioDeviceInfo.TYPE_BUILTIN_SPEAKER, AudioDeviceInfo.TYPE_BUILTIN_EARPIECE)))
        assertFalse(DeviceReading.hasHeadphones(emptyList()))
    }

    @Test
    fun readingBecomesState() {
        val reading = DeviceReading(
            plugged = BatteryManager.BATTERY_PLUGGED_AC,
            batteryStatus = BatteryManager.BATTERY_STATUS_CHARGING,
            level = 18,
            scale = 100,
            interruptionFilter = NotificationManager.INTERRUPTION_FILTER_PRIORITY,
            audioOutputTypes = listOf(AudioDeviceInfo.TYPE_WIRED_HEADSET),
        )
        assertEquals(DeviceState(charging = true, battery = BatteryBand.LOW, doNotDisturb = true, headphones = true), reading.toState())
        assertEquals(
            DeviceState(charging = false, battery = BatteryBand.UNKNOWN, doNotDisturb = false, headphones = false),
            DeviceReading().toState(),
        )
    }

    @Test
    fun encodeDecodeRoundTripsEveryBand() {
        BatteryBand.entries.forEach { band ->
            val state = DeviceState(charging = true, battery = band, doNotDisturb = true, headphones = false)
            assertEquals(state, DeviceState.decode(state.encode()))
        }
        assertEquals("v1;charging=0;battery=high;dnd=0;headphones=0", calm.encode())
    }

    @Test
    fun decodeRejectsMissingOrUnknownInput() {
        assertNull(DeviceState.decode(null))
        assertNull(DeviceState.decode(""))
        assertNull(DeviceState.decode("v2;charging=0;battery=high;dnd=0;headphones=0"))
        assertNull(DeviceState.decode("v1;charging=0;battery=high;dnd=0"))
        assertNull(DeviceState.decode("v1;charging=maybe;battery=high;dnd=0;headphones=0"))
        assertNull(DeviceState.decode("v1;charging=0;battery=huge;dnd=0;headphones=0"))
    }

    @Test
    fun summaryAndTagsDescribeTheState() {
        assertEquals("On battery, battery 50 to 79%, Do Not Disturb off, no headphones", DeviceStateItems.summary(calm))
        assertEquals(listOf("on-battery", "battery-high"), DeviceStateItems.tags(calm))

        val busy = DeviceState(charging = true, battery = BatteryBand.LOW, doNotDisturb = true, headphones = true)
        assertEquals("Charging, battery under 20%, Do Not Disturb on, headphones connected", DeviceStateItems.summary(busy))
        assertEquals(listOf("charging", "battery-low", "do-not-disturb", "headphones"), DeviceStateItems.tags(busy))
    }

    @Test
    fun itemOnlyWhenStateChanged() {
        val zone = ZoneId.of("America/Chicago")
        // 2026-10-20 01:30 UTC is still 2026-10-19 in Chicago.
        val at = 1_792_459_800_000L

        assertNull(DeviceStateItems.itemFor(calm, calm.copy(), at, zone))

        val first = DeviceStateItems.itemFor(null, calm, at, zone)!!
        assertEquals("device-$at", first.id)
        assertEquals("2026-10-19", first.date)
        assertEquals("device", first.source)
        assertEquals("Device state", first.title)
        assertNull(first.url)
        assertEquals(calm.encode(), first.raw)

        val plugged = DeviceStateItems.itemFor(calm, calm.copy(charging = true), at + 60_000, zone)!!
        assertEquals("device-${at + 60_000}", plugged.id)
        assertTrue(plugged.summary.startsWith("Charging"))
    }
}
