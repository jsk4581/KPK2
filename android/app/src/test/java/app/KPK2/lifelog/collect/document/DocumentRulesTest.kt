package app.KPK2.lifelog.collect.document

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DocumentRulesTest {

    @Test
    fun acceptsEachDocumentKindByExtensionWhateverTheCase() {
        assertEquals(DocumentType.PDF, DocumentRules.classify("Resume 2026.PDF", null))
        assertEquals(DocumentType.DOC, DocumentRules.classify("cover-letter.doc", "application/octet-stream"))
        assertEquals(DocumentType.DOCX, DocumentRules.classify("portfolio.docx", null))
        assertEquals(DocumentType.TXT, DocumentRules.classify("rates.txt", "text/plain"))
        assertEquals(DocumentType.MD, DocumentRules.classify("case-study.md", "application/octet-stream"))
        assertEquals(DocumentType.MD, DocumentRules.classify("notes.markdown", null))
    }

    @Test
    fun extensionDecidesEvenWhenTheSenderClaimsATextType() {
        assertNull(DocumentRules.classify("setup.exe", "text/plain"))
        assertNull(DocumentRules.classify("headshot.png", "application/pdf"))
        assertNull(DocumentRules.classify("archive.tar.gz", null))
    }

    @Test
    fun mimeTypeDecidesOnlyWhenTheNameHasNoExtension() {
        assertEquals(DocumentType.PDF, DocumentRules.classify("document:1042", "application/pdf"))
        assertEquals(DocumentType.MD, DocumentRules.classify(null, "text/markdown; charset=UTF-8"))
        assertEquals(DocumentType.TXT, DocumentRules.classify("README", "TEXT/PLAIN"))
        assertNull(DocumentRules.classify("scan", "image/jpeg"))
        assertNull(DocumentRules.classify(null, null))
    }

    @Test
    fun dotFilesAndTrailingDotsHaveNoExtension() {
        assertNull(DocumentRules.extensionOf(".profile"))
        assertNull(DocumentRules.extensionOf("draft."))
        assertEquals("pdf", DocumentRules.extensionOf("folder.v2/resume.pdf"))
        assertNull(DocumentRules.extensionOf("folder.v2/resume"))
    }

    @Test
    fun checkRejectsOtherTypesAndDeclaredOversize() {
        assertEquals(DocumentCheck.UnsupportedType, DocumentRules.check("clip.mp4", "video/mp4", 10))
        assertEquals(DocumentCheck.TooLarge, DocumentRules.check("big.pdf", null, DocumentRules.MAX_BYTES + 1))
        assertEquals(
            DocumentCheck.Accepted(DocumentType.PDF),
            DocumentRules.check("exact.pdf", null, DocumentRules.MAX_BYTES),
        )
        assertEquals(DocumentCheck.Accepted(DocumentType.DOCX), DocumentRules.check("unknown-size.docx", null, null))
    }

    @Test
    fun limitIsTwentyBinaryMegabytes() {
        assertEquals(20_971_520L, DocumentRules.MAX_BYTES)
    }

    @Test
    fun cleanFileNameDropsFoldersAndControlCharacters() {
        assertEquals("resume.pdf", DocumentRules.cleanFileName("/storage/emulated/0/Download/resume.pdf", DocumentType.PDF))
        assertEquals("portfolio.docx", DocumentRules.cleanFileName("C:\\Users\\sample\\portfolio.docx", DocumentType.DOCX))
        assertEquals("Case study final.md", DocumentRules.cleanFileName("  Case\tstudy\u0000 \n final.md ", DocumentType.MD))
    }

    @Test
    fun cleanFileNameAddsTheExtensionOrAFallbackName() {
        assertEquals("document:1042.pdf", DocumentRules.cleanFileName("document:1042", DocumentType.PDF))
        assertEquals("Untitled document.txt", DocumentRules.cleanFileName(null, DocumentType.TXT))
        assertEquals("Untitled document.md", DocumentRules.cleanFileName(" \u0007 ", DocumentType.MD))
    }

    @Test
    fun cleanFileNameShortensLongNamesButKeepsTheExtension() {
        val long = "a".repeat(300) + ".docx"
        val cleaned = DocumentRules.cleanFileName(long, DocumentType.DOCX)
        assertEquals(DocumentRules.MAX_NAME_LENGTH, cleaned.length)
        assertTrue(cleaned.endsWith("a.docx"))
    }

    @Test
    fun shorteningNeverSplitsASurrogatePair() {
        val stem = "b".repeat(DocumentRules.MAX_NAME_LENGTH - 5) + "\uD83D\uDCC4" + "c".repeat(10)
        val cleaned = DocumentRules.cleanFileName("$stem.pdf", DocumentType.PDF)
        assertTrue(cleaned.length <= DocumentRules.MAX_NAME_LENGTH)
        assertTrue(cleaned.endsWith(".pdf"))
        val beforeExtension = cleaned.removeSuffix(".pdf")
        assertTrue(!Character.isHighSurrogate(beforeExtension.last()))
    }

    @Test
    fun formatsSizesForTheSummary() {
        assertEquals("1 byte", DocumentRules.formatSize(1))
        assertEquals("900 bytes", DocumentRules.formatSize(900))
        assertEquals("1 KB", DocumentRules.formatSize(1024))
        assertEquals("340 KB", DocumentRules.formatSize(340 * 1024L))
        assertEquals("1.2 MB", DocumentRules.formatSize(1_250_000))
        assertEquals("20.0 MB", DocumentRules.formatSize(DocumentRules.MAX_BYTES))
    }

    @Test
    fun summaryIsTypeAndSize() {
        assertEquals("PDF, 1.2 MB", DocumentRules.summary(DocumentType.PDF, 1_250_000))
        assertEquals("Word document (DOCX), 48 KB", DocumentRules.summary(DocumentType.DOCX, 48 * 1024L))
        assertEquals("Markdown, 3 KB", DocumentRules.summary(DocumentType.MD, 3000))
    }

    @Test
    fun idAndStoredFileShareOneKeyFromTheHash() {
        val sha = "ABCDEF0123456789abcdef0123456789" + "f".repeat(32)
        val id = DocumentRules.itemId(sha)
        assertEquals("document-abcdef0123456789abcdef0123456789", id)
        assertEquals("abcdef0123456789abcdef0123456789.pdf", DocumentRules.storedFileName(sha, DocumentType.PDF))
        assertEquals(DocumentRules.keyOfItemId(id), DocumentRules.keyOfStoredFile("abcdef0123456789abcdef0123456789.pdf"))
        assertNull(DocumentRules.keyOfItemId("note-1"))
        assertNull(DocumentRules.keyOfItemId("document-not-a-hash"))
    }

    @Test
    fun pickerOffersEveryAcceptedMimeType() {
        val offered = DocumentRules.pickerMimeTypes.toSet()
        DocumentType.entries.flatMap { it.mimeTypes }.forEach { assertTrue(it, it in offered) }
    }
}
