package app.KPK2.lifelog.data

import kotlinx.coroutines.flow.Flow

/** The single read and write path to lifelog items on this device. */
class LifelogRepository(private val dao: LifelogDao) {

    /** All items, newest day first; within a day the most recently recorded first. */
    val items: Flow<List<LifelogItem>> = dao.observeAll()

    val count: Flow<Int> = dao.observeCount()

    suspend fun snapshot(): List<LifelogItem> = dao.all()

    /** Writes [items], updating ones with the same id. Deleted ids stay deleted. Returns the number written. */
    suspend fun record(items: List<LifelogItem>): Int = dao.record(items)

    suspend fun record(item: LifelogItem): Int = dao.record(listOf(item))

    suspend fun delete(id: String) = dao.delete(id)

    suspend fun deleteAll() = dao.deleteAll()
}
