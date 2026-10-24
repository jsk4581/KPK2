package app.KPK2.lifelog.collect.document

import android.content.Context
import app.KPK2.lifelog.data.LifelogRepository
import app.KPK2.lifelog.sources.Collector
import app.KPK2.lifelog.sources.SourceId

/**
 * Documents (resume, portfolio) the person adds by hand, from the "Add document" card or by sharing a
 * file into the app. Nothing is read in the background and no permission is needed: the system file
 * picker and share sheet grant access to the one file the person chose.
 *
 * The periodic pull records nothing. It only removes private copies whose item the person has deleted,
 * so a deleted document does not linger on the phone.
 */
class DocumentCollector : Collector {
    override val id: SourceId = SourceId.DOCUMENT

    override val pullsPeriodically: Boolean = true

    override suspend fun pull(context: Context, repository: LifelogRepository): Int {
        DocumentStore.forApp(context).pruneAgainst(repository)
        return 0
    }
}
