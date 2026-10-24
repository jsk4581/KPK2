package app.KPK2.lifelog

import app.KPK2.lifelog.ui.Destination
import org.junit.Assert.assertEquals
import org.junit.Test

class DestinationTest {
    @Test
    fun bottomBarShowsTimelineSourcesExportInOrder() {
        assertEquals(
            listOf(Destination.TIMELINE, Destination.SOURCES, Destination.EXPORT),
            Destination.entries.toList(),
        )
    }
}
