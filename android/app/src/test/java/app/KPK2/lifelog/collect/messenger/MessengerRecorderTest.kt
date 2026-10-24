package app.KPK2.lifelog.collect.messenger

import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MessengerRecorderTest {
    private val t0 = 1_792_000_000_000L

    private fun recorder(labels: Map<String, String> = emptyMap()) = MessengerRecorder(
        ownPackage = "app.KPK2.lifelog",
        appLabel = { labels[it] },
        zone = { ZoneId.of("UTC") },
    )

    private fun notice(key: String = "chat-a", at: Long = t0, text: String = "Quick question about the invoice", pkg: String = "com.whatsapp") =
        MessengerNotice(pkg, key, at, null, messagingStyle = true, groupSummary = false, ongoing = false, text = text)

    @Test
    fun updatesOfTheSameKeyWithinAMinuteAreRecordedOnce() {
        val r = recorder()
        assertNotNull(r.itemFor(notice(at = t0)))
        assertNull(r.itemFor(notice(at = t0 + 20_000, text = "Quick question about the invoice (2)")))
        assertNull(r.itemFor(notice(at = t0 + 59_999)))
        assertNotNull(r.itemFor(notice(at = t0 + 60_000, text = "Following up")))
    }

    @Test
    fun differentKeysAreIndependent() {
        val r = recorder()
        assertNotNull(r.itemFor(notice(key = "chat-a")))
        assertNotNull(r.itemFor(notice(key = "chat-b")))
    }

    @Test
    fun rejectedNoticesDoNotOpenADedupWindow() {
        val r = recorder()
        assertNull(r.itemFor(notice(text = " ")))
        assertNotNull(r.itemFor(notice(at = t0 + 1_000)))
    }

    @Test
    fun labelComesFromTheAllowlistThenTheSystemThenAGenericName() {
        val r = recorder(labels = mapOf("com.example.chat" to "Example Chat", "com.whatsapp" to "System name"))
        assertEquals("Message in WhatsApp", r.itemFor(notice(key = "a"))!!.title)
        assertEquals("Message in Example Chat", r.itemFor(notice(key = "b", pkg = "com.example.chat"))!!.title)
        assertEquals("Message in a messaging app", r.itemFor(notice(key = "c", pkg = "com.example.hidden"))!!.title)
    }

    @Test
    fun guardForgetsTheOldestKeysBeyondCapacity() {
        val guard = RepeatGuard(windowMs = 60_000, capacity = 2)
        assertTrue(guard.admit("a", t0))
        assertTrue(guard.admit("b", t0))
        assertTrue(guard.admit("c", t0))
        assertTrue("a was evicted, so it is admitted again", guard.admit("a", t0 + 1))
        assertFalse(guard.admit("c", t0 + 2))
    }

    @Test
    fun guardTreatsAClockStepBackAsARepeat() {
        val guard = RepeatGuard()
        assertTrue(guard.admit("a", t0))
        assertFalse(guard.admit("a", t0 - 5_000))
    }
}
