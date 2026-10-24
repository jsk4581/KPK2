package app.KPK2.lifelog.sources

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class SourceSettingsTest {
    private val context: Context get() = ApplicationProvider.getApplicationContext()

    @Test
    fun untouchedSourcesHaveNoChoice() = runTest {
        assertEquals(emptyMap<SourceId, Boolean>(), SourceSettings(context).choices.first())
    }

    @Test
    fun choicesArePersistedPerSource() = runTest {
        SourceSettings(context).apply {
            choose(SourceId.SMS, true)
            choose(SourceId.NOTE, false)
        }
        val reopened = SourceSettings(context)
        assertEquals(mapOf(SourceId.SMS to true, SourceId.NOTE to false), reopened.choices.first())

        reopened.choose(SourceId.SMS, false)
        assertEquals(false, reopened.current()[SourceId.SMS])
    }
}
