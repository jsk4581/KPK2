package app.KPK2.lifelog.collect.messenger

import android.app.Notification
import android.content.Context
import android.content.Intent
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class MessengerNoticeTest {
    private val context: Context get() = ApplicationProvider.getApplicationContext()
    private val t0 = 1_792_000_000_000L

    @Test
    fun messagingStyleGivesTheNewestMessageAndItsSpeaker() {
        val me = Person.Builder().setName("Me").build()
        val other = Person.Builder().setName("Riley Sample").build()
        val notification = NotificationCompat.Builder(context, "chat")
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setStyle(
                NotificationCompat.MessagingStyle(me)
                    .addMessage("First draft is in the folder", t0 - 60_000, other)
                    .addMessage("Can we move the call to 4?", t0, other),
            )
            .build()

        val notice = MessengerNotice.from("com.example.chat", "k", t0, notification)

        assertTrue(notice.messagingStyle)
        assertEquals("Can we move the call to 4?", notice.text)
        assertTrue("Riley Sample" in notice.speakers)
        assertFalse(notice.groupSummary)
    }

    @Test
    fun plainNotificationUsesBigTextAndFlagsSummariesAndOngoing() {
        val notification = NotificationCompat.Builder(context, "chat")
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle("Riley Sample")
            .setContentText("Short text")
            .setStyle(NotificationCompat.BigTextStyle().bigText("Riley Sample: The longer text of the message"))
            .setCategory(Notification.CATEGORY_MESSAGE)
            .setGroup("g")
            .setGroupSummary(true)
            .setOngoing(true)
            .build()

        val notice = MessengerNotice.from("com.whatsapp", "k", t0, notification)

        assertFalse(notice.messagingStyle)
        assertEquals("Riley Sample: The longer text of the message", notice.text)
        assertEquals(Notification.CATEGORY_MESSAGE, notice.category)
        assertTrue(notice.groupSummary)
        assertTrue(notice.ongoing)
        assertEquals("The longer text of the message", MessengerRules.summaryOf(notice.text, notice.speakers))
    }

    @Test
    fun accessLinkOpensThisAppsNotificationAccessPage() {
        val collector = MessengerCollector()
        val intent = collector.accessSettingsIntent(context)

        assertEquals(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS, intent.action)
        assertEquals(
            MessengerListener.componentName(context).flattenToString(),
            intent.getStringExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME),
        )
        assertTrue(intent.flags and Intent.FLAG_ACTIVITY_NEW_TASK != 0)
        assertFalse("off until notification access is granted", collector.hasAccess(context))
        assertFalse(collector.defaultEnabled)
    }
}
