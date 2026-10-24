package app.KPK2.lifelog

import app.KPK2.lifelog.collect.document.DocumentStore
import app.KPK2.lifelog.data.LifelogRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Deletes items the person removes on the Timeline, together with the on-device copies that still
 * hold their content, so "removes from this phone" is true as soon as the delete returns.
 */
class ItemDeleter(
    private val repository: LifelogRepository,
    private val documents: DocumentStore,
) {
    suspend fun delete(id: String) {
        repository.delete(id)
        removeLeftovers()
    }

    suspend fun deleteAll() {
        repository.deleteAll()
        removeLeftovers()
    }

    private suspend fun removeLeftovers() = withContext(Dispatchers.IO) {
        // Private copies of added documents whose item is now gone.
        documents.pruneAgainst(repository)
    }
}
