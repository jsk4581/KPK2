package app.KPK2.lifelog.collect.document

import android.content.Context
import app.KPK2.lifelog.data.LifelogRepository
import app.KPK2.lifelog.sources.SourceId
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.io.File

/**
 * Private copies of added documents, one file per distinct content, in the app's internal storage.
 * Backup rules exclude the whole files domain, so these copies never leave the phone.
 */
class DocumentStore(val dir: File) {

    fun fileFor(storedName: String): File = File(dir.apply { mkdirs() }, storedName)

    /**
     * Removes copies whose item is gone (the person deleted it, or deleted everything), keeping only
     * files whose key is in [liveKeys]. Returns the number of files removed.
     */
    fun prune(liveKeys: Set<String>): Int {
        val files = dir.listFiles() ?: return 0
        return files.count { file ->
            file.isFile && DocumentRules.keyOfStoredFile(file.name) !in liveKeys && file.delete()
        }
    }

    /** [prune] against the document items currently in [repository]. */
    suspend fun pruneAgainst(repository: LifelogRepository): Int = lock.withLock {
        prune(liveKeys(repository))
    }

    companion object {
        private const val DIR = "documents"

        /** One lock for every store instance: adds and pruning must not interleave. */
        internal val lock = Mutex()

        fun forApp(context: Context): DocumentStore = DocumentStore(File(context.filesDir, DIR))

        suspend fun liveKeys(repository: LifelogRepository): Set<String> = repository.snapshot()
            .filter { it.source == SourceId.DOCUMENT.wire }
            .mapNotNull { DocumentRules.keyOfItemId(it.id) }
            .toSet()
    }
}

