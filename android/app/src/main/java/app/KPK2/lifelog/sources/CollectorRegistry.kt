package app.KPK2.lifelog.sources

/**
 * The only place collectors are registered. To ship a new source, add one line to [all], for example
 * `CalendarCollector(),`. The Sources screen, consent toggles, start and stop, and the periodic pull
 * all read this list.
 */
object CollectorRegistry {
    val all: List<Collector> = listOf(
    )

    private val bySource: Map<SourceId, Collector> = buildMap {
        all.forEach { collector ->
            check(put(collector.id, collector) == null) { "Two collectors registered for ${collector.id}" }
        }
    }

    fun forSource(id: SourceId): Collector? = bySource[id]
}
