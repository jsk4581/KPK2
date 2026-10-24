package app.KPK2.lifelog.collect.savedlink

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SharedLinkParserTest {

    @Test
    fun linkOnlyShareUsesSubjectAsTitleAndHasNoSummary() {
        val link = SharedLinkParser.parse(
            text = "https://example.com/guides/rate-cards",
            subject = "How to write a rate card",
            title = null,
        )
        assertEquals(SharedLink("https://example.com/guides/rate-cards", "How to write a rate card", ""), link)
    }

    @Test
    fun textAroundTheLinkBecomesTheSummary() {
        val link = SharedLinkParser.parse(
            text = "Worth reading before the pitch:\nhttps://example.com/a?b=1&c=2#top  see section 3",
            subject = null,
            title = null,
        )!!
        assertEquals("https://example.com/a?b=1&c=2#top", link.url)
        assertEquals("", link.title)
        assertEquals("Worth reading before the pitch: see section 3", link.summary)
    }

    @Test
    fun titleFallsBackToTheTitleExtraAndIsEmptyWithoutEither() {
        assertEquals("From the title extra", SharedLinkParser.parse("https://example.com", " ", "From the title extra")!!.title)
        assertEquals("", SharedLinkParser.parse("https://example.com", null, null)!!.title)
    }

    @Test
    fun summaryThatOnlyRepeatsTheTitleIsDropped() {
        val link = SharedLinkParser.parse("Pricing workshops - https://example.com/p", "Pricing workshops", null)!!
        assertEquals("", link.summary)
    }

    @Test
    fun onlyTheFirstWebLinkIsTheUrl() {
        val link = SharedLinkParser.parse("ftp://example.com/x then HTTP://example.org/one and https://example.net/two", null, null)!!
        assertEquals("HTTP://example.org/one", link.url)
        assertEquals("ftp://example.com/x then and https://example.net/two", link.summary)
    }

    @Test
    fun textWithoutAWebLinkIsNotALink() {
        assertNull(SharedLinkParser.parse("Call the studio back on Friday", "Reminder", null))
        assertNull(SharedLinkParser.parse("example.com/no-scheme and www.example.com", null, null))
        assertNull(SharedLinkParser.parse("https:// is not a link and neither is http://", null, null))
        assertNull(SharedLinkParser.parse("   ", null, null))
        assertNull(SharedLinkParser.parse(null, "https://example.com", null))
    }

    @Test
    fun trailingSentencePunctuationIsNotPartOfTheLink() {
        assertEquals("https://example.com/post", SharedLinkParser.parse("Read https://example.com/post.", null, null)!!.url)
        assertEquals("https://example.com/post", SharedLinkParser.parse("(see https://example.com/post)", null, null)!!.url)
        assertEquals("https://example.com/q?x=1", SharedLinkParser.parse("\"https://example.com/q?x=1\"!", null, null)!!.url)
        assertEquals("https://example.com/post", SharedLinkParser.parse("<https://example.com/post>", null, null)!!.url)
    }

    @Test
    fun bracketsTheLinkOpenedStayInTheLink() {
        assertEquals(
            "https://example.com/wiki/Draft_(writing)",
            SharedLinkParser.parse("https://example.com/wiki/Draft_(writing).", null, null)!!.url,
        )
    }

    @Test
    fun longTitleAndSummaryAreCutWithAnEllipsis() {
        val link = SharedLinkParser.parse("x".repeat(900) + " https://example.com", "t".repeat(300), null)!!
        assertEquals(SharedLinkParser.MAX_TITLE, link.title.length)
        assertTrue(link.title.endsWith("..."))
        assertEquals(SharedLinkParser.MAX_SUMMARY, link.summary.length)
        assertTrue(link.summary.endsWith("..."))
    }

    @Test
    fun ellipsizeNeverSplitsASurrogatePair() {
        val emoji = "📚"
        val cut = SharedLinkParser.ellipsize("ab$emoji" + "c".repeat(10), 6)
        assertEquals("ab...", cut)
        assertEquals("short", SharedLinkParser.ellipsize("short", 6))
    }

    @Test
    fun senderIsAWellFormedPackageOtherThanThisApp() {
        assertEquals("com.example.reader", SenderApp.pick(listOf(null, "com.example.reader"), "app.KPK2.lifelog"))
        assertEquals("org.example.news", SenderApp.pick(listOf("org.example.news", "com.example.reader"), "app.KPK2.lifelog"))
        assertNull(SenderApp.pick(listOf("app.KPK2.lifelog", "not a package", "nodots", null), "app.KPK2.lifelog"))
    }

    @Test
    fun onlyAppReferrersNameASender() {
        assertEquals("com.example.reader", SenderApp.fromReferrer("android-app", "com.example.reader"))
        assertNull(SenderApp.fromReferrer("https", "example.com"))
        assertNull(SenderApp.fromReferrer(null, null))
    }
}
