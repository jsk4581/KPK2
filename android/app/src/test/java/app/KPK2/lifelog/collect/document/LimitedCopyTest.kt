package app.KPK2.lifelog.collect.document

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream

class LimitedCopyTest {

    @Test
    fun copiesAndHashesWithinTheLimit() {
        val bytes = "Fictional resume for a sample freelancer.".toByteArray()
        val out = ByteArrayOutputStream()
        val outcome = copyWithLimit(ByteArrayInputStream(bytes), out, maxBytes = 1024)

        assertArrayEquals(bytes, out.toByteArray())
        outcome as CopyOutcome.Copied
        assertEquals(bytes.size.toLong(), outcome.bytes)
        assertEquals(64, outcome.sha256Hex.length)
    }

    @Test
    fun knownDigestOfAnEmptyStream() {
        val outcome = copyWithLimit(ByteArrayInputStream(ByteArray(0)), ByteArrayOutputStream(), 10)
        assertEquals(
            CopyOutcome.Copied(0, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"),
            outcome,
        )
    }

    @Test
    fun exactlyTheLimitIsAccepted() {
        val outcome = copyWithLimit(ByteArrayInputStream(ByteArray(200_000)), ByteArrayOutputStream(), 200_000)
        assertEquals(200_000L, (outcome as CopyOutcome.Copied).bytes)
    }

    @Test
    fun stopsReadingOnceOverTheLimit() {
        val source = CountingStream(ByteArray(1_000_000))
        val out = ByteArrayOutputStream()
        assertEquals(CopyOutcome.TooLarge, copyWithLimit(source, out, maxBytes = 100_000))
        assertTrue("read ${source.consumed}", source.consumed < 1_000_000)
        assertTrue(out.size() <= 100_000)
    }

    private class CountingStream(data: ByteArray) : ByteArrayInputStream(data) {
        val consumed: Int get() = pos
    }
}
