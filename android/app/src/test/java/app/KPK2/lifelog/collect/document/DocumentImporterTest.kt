package app.KPK2.lifelog.collect.document

import android.content.Context
import android.net.Uri
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import app.KPK2.lifelog.data.LifelogDatabase
import app.KPK2.lifelog.data.LifelogRepository
import app.KPK2.lifelog.export.LifelogExporter
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.io.ByteArrayInputStream
import java.io.IOException
import java.io.InputStream
import java.time.ZoneOffset

@RunWith(RobolectricTestRunner::class)
class DocumentImporterTest {
    @get:Rule val temp = TemporaryFolder()

    private lateinit var db: LifelogDatabase
    private lateinit var repo: LifelogRepository
    private lateinit var store: DocumentStore
    private val workDir by lazy { temp.newFolder("work") }
    private var sourceOn = true
    private val context: Context get() = ApplicationProvider.getApplicationContext()

    // 2026-10-20T15:00:00Z
    private val now = 1_792_508_400_000L

    private fun importer() = DocumentImporter(
        repository = repo,
        store = store,
        workDir = workDir,
        isSourceOn = { sourceOn },
        clock = { now },
        zone = ZoneOffset.UTC,
    )

    private fun input(name: String?, bytes: ByteArray, mime: String? = null, declared: Long? = bytes.size.toLong()) =
        DocumentInput(name, mime, declared) { ByteArrayInputStream(bytes) }

    @Before
    fun open() {
        db = Room.inMemoryDatabaseBuilder(context, LifelogDatabase::class.java).allowMainThreadQueries().build()
        repo = LifelogRepository(db.lifelogDao())
        store = DocumentStore(temp.newFolder("documents"))
    }

    @After
    fun close() = db.close()

    @Test
    fun addsOneItemWithTheSharedSchemaAndAPrivateCopy() = runTest {
        val bytes = ByteArray(1_250_000) { (it % 251).toByte() }
        val result = importer().add(input("/Download/Sample Resume.pdf", bytes, "application/pdf"))

        val item = (result as AddResult.Added).item
        assertTrue(item.id.startsWith("document-"))
        assertEquals("2026-10-20", item.date)
        assertEquals("document", item.source)
        assertEquals("Sample Resume.pdf", item.title)
        assertEquals("PDF, 1.2 MB", item.summary)
        assertEquals(emptyList<String>(), item.tags)
        assertNull(item.url)
        assertEquals(listOf(item), repo.snapshot())

        val copies = store.dir.listFiles()!!.toList()
        assertEquals(1, copies.size)
        assertTrue(copies.single().readBytes().contentEquals(bytes))

        // The raw detail stays on the phone: the export carries only the schema fields.
        val exported = LifelogExporter.toJson(repo.snapshot())
        assertFalse(exported.contains("storedFile"))
        assertTrue(item.raw!!.contains("storedFile"))
    }

    @Test
    fun sameBytesTwiceIsOneItem() = runTest {
        val bytes = "# Portfolio\nThree fictional case studies.".toByteArray()
        assertTrue(importer().add(input("portfolio.md", bytes)) is AddResult.Added)
        assertEquals(AddResult.AlreadyAdded("portfolio copy.md"), importer().add(input("portfolio copy.md", bytes)))
        assertEquals(1, repo.snapshot().size)
        assertEquals(1, store.dir.listFiles()!!.size)
    }

    @Test
    fun aDeletedDocumentIsNotAddedAgainAndItsCopyIsRemoved() = runTest {
        val bytes = "Rates sheet, fictional.".toByteArray()
        val added = importer().add(input("rates.txt", bytes)) as AddResult.Added
        repo.delete(added.item.id)

        assertEquals(AddResult.DeletedEarlier("rates.txt"), importer().add(input("rates.txt", bytes)))
        assertEquals(0, repo.snapshot().size)
        assertEquals(0, store.dir.listFiles()!!.size)
    }

    @Test
    fun rejectsOtherTypesOversizeAndEmptyFilesWithoutKeepingAnything() = runTest {
        assertEquals(AddResult.UnsupportedType, importer().add(input("headshot.png", ByteArray(10), "image/png")))
        assertEquals(
            AddResult.TooLarge,
            importer().add(input("huge.pdf", ByteArray(1), declared = DocumentRules.MAX_BYTES + 1)),
        )
        // The provider reported no size, so the limit is caught while copying.
        val oversize = ByteArray((DocumentRules.MAX_BYTES + 1).toInt())
        assertEquals(AddResult.TooLarge, importer().add(input("scan.pdf", oversize, declared = null)))
        assertEquals(AddResult.Empty, importer().add(input("blank.docx", ByteArray(0))))

        assertEquals(0, repo.snapshot().size)
        assertEquals(0, store.dir.listFiles()?.size ?: 0)
        assertEquals(0, workDir.listFiles()?.size ?: 0)
    }

    @Test
    fun unreadableFilesAreReportedNotThrown() = runTest {
        val missing = DocumentInput("resume.pdf", null, null) { null }
        val failing = DocumentInput("resume.pdf", null, null) { throw IOException("gone") }
        val revoked = DocumentInput("resume.pdf", null, null) { throw SecurityException("revoked") }
        val brokenMidway = DocumentInput("resume.pdf", null, null) {
            object : InputStream() {
                override fun read(): Int = throw IOException("provider closed")
                override fun read(b: ByteArray, off: Int, len: Int): Int = throw IOException("provider closed")
            }
        }
        listOf(missing, failing, revoked, brokenMidway).forEach {
            assertEquals(AddResult.Unreadable, importer().add(it))
        }
        assertEquals(0, repo.snapshot().size)
    }

    @Test
    fun nothingIsReadWhileTheSourceIsOff() = runTest {
        sourceOn = false
        var opened = false
        val result = importer().add(DocumentInput("resume.pdf", null, 10) { opened = true; ByteArrayInputStream(ByteArray(10)) })
        assertEquals(AddResult.SourceOff, result)
        assertFalse(opened)
    }

    @Test
    fun pruneRemovesCopiesOfDeletedItemsOnly() = runTest {
        val kept = importer().add(input("keep.pdf", "keep".toByteArray())) as AddResult.Added
        val gone = importer().add(input("gone.pdf", "gone".toByteArray())) as AddResult.Added
        repo.delete(gone.item.id)

        assertEquals(1, store.pruneAgainst(repo))
        val left = store.dir.listFiles()!!.map { DocumentRules.keyOfStoredFile(it.name) }
        assertEquals(listOf(DocumentRules.keyOfItemId(kept.item.id)), left)
    }

    @Test
    fun onlyContentUrisAreRead() = runTest {
        val resolver = context.contentResolver
        assertNull(DocumentImporter.inputFor(resolver, Uri.parse("file:///data/data/app.KPK2.lifelog/files/x.pdf")))
        assertEquals(
            AddResult.Unreadable,
            importer().add(resolver, Uri.parse("file:///sdcard/Download/resume.pdf"), "application/pdf"),
        )
    }
}
