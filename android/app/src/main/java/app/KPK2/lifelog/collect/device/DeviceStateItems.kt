package app.KPK2.lifelog.collect.device

import app.KPK2.lifelog.data.LifelogItem
import app.KPK2.lifelog.sources.SourceId
import java.time.ZoneId

/** Turns device states into lifelog items. Pure, so the wording and the change rule are unit tested. */
object DeviceStateItems {
    const val TITLE = "Device state"

    /** One readable line, for example "Charging, battery 50 to 79%, Do Not Disturb off, no headphones". */
    fun summary(state: DeviceState): String = listOf(
        if (state.charging) "Charging" else "On battery",
        state.battery.phrase,
        if (state.doNotDisturb) "Do Not Disturb on" else "Do Not Disturb off",
        if (state.headphones) "headphones connected" else "no headphones",
    ).joinToString(", ")

    fun tags(state: DeviceState): List<String> = buildList {
        add(if (state.charging) "charging" else "on-battery")
        add("battery-${state.battery.key}")
        if (state.doNotDisturb) add("do-not-disturb")
        if (state.headphones) add("headphones")
    }

    /**
     * The item to record for [current] read at [atMillis], or null when it equals [previous]. The id
     * is the source wire name plus the reading time, so each change gets its own stable item.
     */
    fun itemFor(
        previous: DeviceState?,
        current: DeviceState,
        atMillis: Long,
        zone: ZoneId = ZoneId.systemDefault(),
    ): LifelogItem? {
        if (current == previous) return null
        return LifelogItem(
            id = "${SourceId.DEVICE.wire}-$atMillis",
            date = LifelogItem.dateOf(atMillis, zone),
            source = SourceId.DEVICE.wire,
            title = TITLE,
            summary = summary(current),
            tags = tags(current),
            url = null,
            recordedAt = atMillis,
            raw = current.encode(),
        )
    }
}
