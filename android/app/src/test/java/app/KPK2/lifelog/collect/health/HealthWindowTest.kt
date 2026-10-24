package app.KPK2.lifelog.collect.health

import app.KPK2.lifelog.R
import app.KPK2.lifelog.data.LifelogItem
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class HealthWindowTest {
    private val today = LocalDate.parse("2026-10-20")

    private fun item(id: String, date: String, title: String) =
        LifelogItem(id = id, date = date, source = "health", title = title, summary = "$title.", tags = listOf("steps"))

    @Test
    fun firstPullReachesFurtherBackThanLaterPulls() {
        assertEquals(DayWindow(LocalDate.parse("2026-09-21"), today), HealthWindow.days(today, firstPull = true))
        assertEquals(DayWindow(LocalDate.parse("2026-10-14"), today), HealthWindow.days(today, firstPull = false))
        assertTrue(today in HealthWindow.days(today, firstPull = false))
        assertFalse(LocalDate.parse("2026-10-13") in HealthWindow.days(today, firstPull = false))
    }

    @Test
    fun onlyNewOrChangedItemsAreWritten() {
        val same = item("health-steps-2026-10-19", "2026-10-19", "9,000 steps")
        val grown = item("health-steps-2026-10-20", "2026-10-20", "4,100 steps")
        val fresh = item("health-sleep-2026-10-20", "2026-10-20", "Slept 7 h")
        val known = mapOf(
            same.id to HealthWindow.fingerprint(same),
            grown.id to HealthWindow.fingerprint(grown.copy(title = "2,000 steps")),
        )

        val changed = HealthWindow.changed(listOf(same, grown, fresh, fresh), known)

        assertEquals(listOf(grown.id, fresh.id), changed.map { it.id })
    }

    @Test
    fun fingerprintIgnoresRecordedTime() {
        val a = item("health-steps-2026-10-20", "2026-10-20", "4,100 steps")
        assertEquals(HealthWindow.fingerprint(a), HealthWindow.fingerprint(a.copy(recordedAt = 1L)))
    }

    @Test
    fun oldFingerprintsArePruned() {
        val known = mapOf(
            "health-steps-2026-09-01" to "a",
            "health-steps-2026-09-05" to "b",
            "health-sleep-2026-10-20" to "c",
        )
        assertEquals(setOf("health-steps-2026-09-05", "health-sleep-2026-10-20"), HealthWindow.prune(known, today).keys)
    }

    @Test
    fun statusLineNamesTheReasonHealthIsNotRecording() {
        assertEquals(R.string.health_status_unavailable, HealthStatus.note(HealthConnectStatus.UNAVAILABLE, emptySet()))
        assertEquals(
            R.string.health_status_needs_install,
            HealthStatus.note(HealthConnectStatus.NEEDS_INSTALL_OR_UPDATE, emptySet()),
        )
        assertEquals(
            R.string.health_status_needs_permission,
            HealthStatus.note(HealthConnectStatus.AVAILABLE, emptySet()),
        )
        assertEquals(R.string.health_status_ok, HealthStatus.note(HealthConnectStatus.AVAILABLE, setOf(HealthType.SLEEP)))
    }

    @Test
    fun grantedTypesReadAsAList() {
        assertEquals("sleep", HealthStatus.typeList(setOf(HealthType.SLEEP)))
        assertEquals("steps and exercise", HealthStatus.typeList(setOf(HealthType.EXERCISE, HealthType.STEPS)))
        assertEquals("steps, sleep and exercise", HealthStatus.typeList(HealthType.entries.toSet()))
        assertEquals(
            setOf(HealthType.STEPS),
            HealthType.grantedIn(setOf(HealthType.STEPS.readPermission, HealthType.BACKGROUND_PERMISSION)),
        )
    }
}
