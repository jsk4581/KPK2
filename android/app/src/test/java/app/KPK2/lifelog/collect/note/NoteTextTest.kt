package app.KPK2.lifelog.collect.note

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class NoteTextTest {

    @Test
    fun firstLineIsTitleAndTheRestIsSummary() {
        val note = NoteText.parse("Rate note after a polish job\nThe client asked for polish only.\nAbout a third of the usual fee.")!!
        assertEquals("Rate note after a polish job", note.title)
        assertEquals("The client asked for polish only.\nAbout a third of the usual fee.", note.summary)
    }

    @Test
    fun singleLineNoteHasEmptySummary() {
        val note = NoteText.parse("Call back about the workshop")!!
        assertEquals("Call back about the workshop", note.title)
        assertEquals("", note.summary)
    }

    @Test
    fun blankInputIsNotANote() {
        assertNull(NoteText.parse(""))
        assertNull(NoteText.parse("   "))
        assertNull(NoteText.parse("\n\n \t\r\n"))
    }

    @Test
    fun leadingBlankLinesAndWindowsLineEndingsAreIgnored() {
        val note = NoteText.parse("\r\n\r\n  Discovery questions  \r\n\r\n\r\nWho buys?\r\nWhat do they distrust?  \r\n\r\n")!!
        assertEquals("Discovery questions", note.title)
        assertEquals("Who buys?\nWhat do they distrust?", note.summary)
    }

    @Test
    fun paragraphsKeepAtMostOneBlankLine() {
        assertEquals("a\n\nb\n\nc", NoteText.normalize("a\n\n\n\nb\n \n\t\nc\n\n"))
    }

    @Test
    fun longFirstLineIsShortenedAtAWordAndKeptWholeInTheSummary() {
        val first = "Discovery calls and the workshop questions gave me more energy this month than writing any of the drafts did"
        val note = NoteText.parse("$first\nMore later.")!!
        assertTrue(note.title.length <= NoteText.TITLE_MAX)
        assertTrue(note.title.endsWith("…"))
        assertTrue(first.startsWith(note.title.removeSuffix("…")))
        assertTrue("cut at a word boundary", first[note.title.length - 1] == ' ')
        assertEquals("$first\nMore later.", note.summary)
    }

    @Test
    fun shortenCutsHardWhenThereIsNoSpaceToCutAt() {
        val word = "x".repeat(50)
        assertEquals("x".repeat(19) + "…", NoteText.shorten(word, 20))
        assertEquals("fits", NoteText.shorten("fits", 4))
    }

    @Test
    fun summaryIsCappedAtItsLimit() {
        val body = (1..600).joinToString(" ") { "word$it" }
        val note = NoteText.parse("Title\n$body")!!
        assertTrue(note.summary.length <= NoteText.SUMMARY_MAX)
        assertTrue(note.summary.endsWith("…"))
        assertEquals("Title\n$body", note.text)
    }

    @Test
    fun inputBeyondTheLimitIsCut() {
        val note = NoteText.parse("T\n" + "y".repeat(NoteText.INPUT_MAX * 2))!!
        assertEquals(NoteText.INPUT_MAX, note.text.length)
    }

    @Test
    fun hashtagsBecomeLowercaseTagsWithoutDuplicates() {
        val note = NoteText.parse("Marked up three emails #Copy-Editing\nVoice drifts #brand-voice, CTA buried #email_copy #copy-editing")!!
        assertEquals(listOf("copy-editing", "brand-voice", "email_copy"), note.tags)
    }

    @Test
    fun numbersUrlFragmentsAndDoubleHashesAreNotTags() {
        assertEquals(
            emptyList<String>(),
            NoteText.hashtags("Ticket #42, see https://example.com/page#section and ##heading and a#b"),
        )
    }

    @Test
    fun trailingDashesAreDroppedAndTagCountIsCapped() {
        assertEquals(listOf("focus"), NoteText.hashtags("#focus- #focus"))
        val many = (1..15).joinToString(" ") { "#tag$it" }
        assertEquals((1..NoteText.TAGS_MAX).map { "tag$it" }, NoteText.hashtags(many))
    }

    @Test
    fun noteWithoutHashtagsHasNoTags() {
        assertEquals(emptyList<String>(), NoteText.parse("Plain note\nNothing tagged here.")!!.tags)
    }
}
