package app.KPK2.lifelog.sources

import android.content.Context
import app.KPK2.lifelog.data.LifelogItem
import app.KPK2.lifelog.data.LifelogRepository

/** Test double: access is a flag, and calls are counted. */
class FakeCollector(
    override val id: SourceId,
    var access: Boolean = true,
    override val requiredPermissions: List<String> = emptyList(),
    private val claimsDefaultOn: Boolean? = null,
    override val pullsPeriodically: Boolean = false,
) : Collector {
    var starts = 0
    var stops = 0
    var pulls = 0

    override val defaultEnabled: Boolean get() = claimsDefaultOn ?: id.startsOn
    override fun hasAccess(context: Context) = access
    override fun start(context: Context, repository: LifelogRepository) { starts++ }
    override fun stop(context: Context) { stops++ }
    override suspend fun pull(context: Context, repository: LifelogRepository): Int {
        pulls++
        return repository.record(
            LifelogItem(id = "${id.wire}-1", date = "2026-10-20", source = id.wire, title = "Pulled", summary = ""),
        )
    }
}
