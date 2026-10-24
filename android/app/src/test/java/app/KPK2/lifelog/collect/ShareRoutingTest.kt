package app.KPK2.lifelog.collect

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ShareRoutingTest {

    @Test
    fun aSharedTextFileGoesFromSaveLinkToAddDocument() {
        // The Files app shares a .txt as text/plain with a stream and no text.
        assertTrue(ShareRouting.linkTargetForwards(text = null, hasFile = true))
        assertTrue(ShareRouting.linkTargetForwards(text = "Fictional notes.txt", hasFile = true))
    }

    @Test
    fun saveLinkKeepsSharesWithALinkOrWithoutAFile() {
        assertFalse(ShareRouting.linkTargetForwards(text = "Read this https://example.com/guide", hasFile = true))
        assertFalse(ShareRouting.linkTargetForwards(text = "Read this https://example.com/guide", hasFile = false))
        assertFalse(ShareRouting.linkTargetForwards(text = "no link here", hasFile = false))
    }

    @Test
    fun sharedTextWithALinkGoesFromAddDocumentToSaveLink() {
        assertTrue(ShareRouting.documentTargetForwards(text = "Read this https://example.com/guide", hasFile = false))
    }

    @Test
    fun addDocumentKeepsFilesAndTextWithoutALink() {
        assertFalse(ShareRouting.documentTargetForwards(text = "Read this https://example.com/guide", hasFile = true))
        assertFalse(ShareRouting.documentTargetForwards(text = null, hasFile = true))
        assertFalse(ShareRouting.documentTargetForwards(text = "plain words", hasFile = false))
        assertFalse(ShareRouting.documentTargetForwards(text = null, hasFile = false))
    }
}
