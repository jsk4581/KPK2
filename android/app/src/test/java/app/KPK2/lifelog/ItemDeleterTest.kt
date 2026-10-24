package app.KPK2.lifelog

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import app.KPK2.lifelog.collect.document.DocumentRules
import app.KPK2.lifelog.collect.document.DocumentStore
import app.KPK2.lifelog.collect.document.DocumentType
import app.KPK2.lifelog.data.LifelogDatabase
import app.KPK2.lifelog.data.LifelogItem
import app.KPK2.lifelog.data.LifelogRepository
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ItemDeleterTest {
    @get:Rule val temp = TemporaryFolder()

    private lateinit var db: LifelogDatabase
    private lateinit var repo: LifelogRepository
    private lateinit var store: DocumentStore

    @Before
    fun open() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        db = Room.inMemoryDatabaseBuilder(context, LifelogDatabase::class.java).allowMainThreadQueries().build()
        repo = LifelogRepository(db.lifelogDao())
        store = DocumentStore(temp.newFolder("documents"))
    }

    @After
    fun close() = db.close()

    private fun deleter() = ItemDeleter(repo, store)

    /** Records a document item and writes its private copy, as the importer does. */
    private suspend fun addDocument(sha: String): LifelogItem {
        val item = LifelogItem(
            id = DocumentRules.itemId(sha),
            date = "2026-10-24",
            source = "document",
            title = "Sample $sha.pdf",
            summary = "PDF, 1 KB",
        )
        repo.record(item)
        store.fileFor(DocumentRules.storedFileName(sha, DocumentType.PDF)).writeText("fictional content $sha")
        return item
    }

    private fun storedKeys() = store.dir.listFiles()!!.map { DocumentRules.keyOfStoredFile(it.name) }.toSet()

    @Test
    fun deleteAllRemovesEveryDocumentCopyRightAway() = runTest {
        addDocument("a".repeat(64))
        addDocument("b".repeat(64))
        assertEquals(2, storedKeys().size)

        deleter().deleteAll()

        assertEquals(0, repo.snapshot().size)
        assertEquals(emptySet<String>(), storedKeys())
    }

    @Test
    fun deletingOneDocumentRemovesOnlyItsCopy() = runTest {
        val kept = addDocument("c".repeat(64))
        val gone = addDocument("d".repeat(64))

        deleter().delete(gone.id)

        assertEquals(listOf(kept.id), repo.snapshot().map { it.id })
        assertEquals(setOf(DocumentRules.keyOfItemId(kept.id)), storedKeys())
    }
}
