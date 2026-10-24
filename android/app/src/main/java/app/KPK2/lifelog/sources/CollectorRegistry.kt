package app.KPK2.lifelog.sources

import app.KPK2.lifelog.collect.appusage.AppUsageCollector
import app.KPK2.lifelog.collect.calendar.CalendarCollector
import app.KPK2.lifelog.collect.device.DeviceCollector
import app.KPK2.lifelog.collect.document.DocumentCollector
import app.KPK2.lifelog.collect.health.HealthCollector
import app.KPK2.lifelog.collect.location.LocationCollector
import app.KPK2.lifelog.collect.messenger.MessengerCollector
import app.KPK2.lifelog.collect.motion.MotionCollector
import app.KPK2.lifelog.collect.note.NoteCollector
import app.KPK2.lifelog.collect.savedlink.SavedLinkCollector
import app.KPK2.lifelog.collect.sms.SmsCollector

/**
 * The only place collectors are registered. To ship a new source, add one line to [all], for example
 * `CalendarCollector(),`. The Sources screen, consent toggles, start and stop, and the periodic pull
 * all read this list.
 */
object CollectorRegistry {
    val all: List<Collector> = listOf(
        NoteCollector(),
        SavedLinkCollector(),
        DocumentCollector(),
        CalendarCollector(),
        SmsCollector(),
        MessengerCollector(),
        HealthCollector(),
        LocationCollector(),
        MotionCollector(),
        AppUsageCollector(),
        DeviceCollector(),
    )

    private val bySource: Map<SourceId, Collector> = buildMap {
        all.forEach { collector ->
            check(put(collector.id, collector) == null) { "Two collectors registered for ${collector.id}" }
        }
    }

    fun forSource(id: SourceId): Collector? = bySource[id]
}
