package app.KPK2.lifelog.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
abstract class LifelogDao {
    @Query("SELECT * FROM lifelog_item ORDER BY date DESC, recorded_at DESC, id ASC")
    abstract fun observeAll(): Flow<List<LifelogItem>>

    @Query("SELECT * FROM lifelog_item ORDER BY date DESC, recorded_at DESC, id ASC")
    abstract suspend fun all(): List<LifelogItem>

    @Query("SELECT COUNT(*) FROM lifelog_item")
    abstract fun observeCount(): Flow<Int>

    @Query(
        "SELECT source, COUNT(*) AS count, MAX(recorded_at) AS lastRecordedAt " +
            "FROM lifelog_item GROUP BY source",
    )
    abstract fun observeSourceStats(): Flow<List<SourceStats>>

    @Query("SELECT id FROM deleted_item WHERE id IN (:ids)")
    protected abstract suspend fun deletedAmong(ids: List<String>): List<String>

    @Upsert
    protected abstract suspend fun upsert(items: List<LifelogItem>)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    protected abstract suspend fun markDeleted(ids: List<DeletedItem>)

    @Query("DELETE FROM lifelog_item WHERE id = :id")
    protected abstract suspend fun deleteRow(id: String)

    @Query("DELETE FROM lifelog_item")
    protected abstract suspend fun deleteAllRows()

    @Query("SELECT id FROM lifelog_item")
    protected abstract suspend fun allIds(): List<String>

    /** Inserts or updates [items], skipping ids the person deleted. Returns how many were written. */
    @Transaction
    open suspend fun record(items: List<LifelogItem>): Int {
        if (items.isEmpty()) return 0
        val deleted = items.map { it.id }.chunked(MAX_SQL_ARGS).flatMap { deletedAmong(it) }.toSet()
        val kept = items.filterNot { it.id in deleted }
        upsert(kept)
        return kept.size
    }

    @Transaction
    open suspend fun delete(id: String) {
        markDeleted(listOf(DeletedItem(id)))
        deleteRow(id)
    }

    @Transaction
    open suspend fun deleteAll() {
        markDeleted(allIds().map(::DeletedItem))
        deleteAllRows()
    }

    private companion object {
        // Stays under SQLite's bound-parameter limit on older Android versions.
        const val MAX_SQL_ARGS = 900
    }
}
