package app.KPK2.lifelog.sources

import androidx.annotation.StringRes
import app.KPK2.lifelog.R

/**
 * Every lifelog source in the shared schema. [wire] is the value written to an item's `source` field.
 * [startsOn] marks the sources that may be on before the person touches the toggle (only once any
 * permission they need is granted); every other source stays off until the person turns it on.
 */
enum class SourceId(
    val wire: String,
    @param:StringRes val label: Int,
    @param:StringRes val description: Int,
    val startsOn: Boolean,
) {
    NOTE("note", R.string.source_note, R.string.source_note_desc, startsOn = true),
    SAVED_LINK("saved_link", R.string.source_saved_link, R.string.source_saved_link_desc, startsOn = true),
    DOCUMENT("document", R.string.source_document, R.string.source_document_desc, startsOn = true),
    CALENDAR("calendar", R.string.source_calendar, R.string.source_calendar_desc, startsOn = true),
    SMS("sms", R.string.source_sms, R.string.source_sms_desc, startsOn = false),
    MESSENGER("messenger", R.string.source_messenger, R.string.source_messenger_desc, startsOn = false),
    HEALTH("health", R.string.source_health, R.string.source_health_desc, startsOn = false),
    LOCATION("location", R.string.source_location, R.string.source_location_desc, startsOn = false),
    MOTION("motion", R.string.source_motion, R.string.source_motion_desc, startsOn = false),
    APP_USAGE("app_usage", R.string.source_app_usage, R.string.source_app_usage_desc, startsOn = false),
    DEVICE("device", R.string.source_device, R.string.source_device_desc, startsOn = false);

    companion object {
        fun fromWire(wire: String): SourceId? = entries.firstOrNull { it.wire == wire }
    }
}
