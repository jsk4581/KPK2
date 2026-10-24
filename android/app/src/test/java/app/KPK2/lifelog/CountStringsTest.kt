package app.KPK2.lifelog

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class CountStringsTest {
    private val res = ApplicationProvider.getApplicationContext<Context>().resources

    @Test
    fun oneItemIsSingular() {
        assertEquals("1 item on this phone", res.getQuantityString(R.plurals.timeline_count, 1, 1))
        assertEquals("1 item ready to export", res.getQuantityString(R.plurals.export_count, 1, 1))
        assertEquals("1 item, last recorded 2 minutes ago", res.getQuantityString(R.plurals.source_stats, 1, 1, "2 minutes ago"))
    }

    @Test
    fun otherCountsArePlural() {
        assertEquals("0 items on this phone", res.getQuantityString(R.plurals.timeline_count, 0, 0))
        assertEquals("4 items ready to export", res.getQuantityString(R.plurals.export_count, 4, 4))
        assertEquals("12 items, last recorded 1 hour ago", res.getQuantityString(R.plurals.source_stats, 12, 12, "1 hour ago"))
    }
}
