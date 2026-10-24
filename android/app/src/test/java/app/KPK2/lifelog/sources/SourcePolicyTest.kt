package app.KPK2.lifelog.sources

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SourcePolicyTest {

    private fun onWithoutChoice(accessGranted: Boolean, claimsDefaultOn: Boolean? = null) =
        SourceId.entries.filter { id ->
            SourcePolicy.isOn(FakeCollector(id, claimsDefaultOn = claimsDefaultOn), choice = null, accessGranted = accessGranted)
        }.toSet()

    @Test
    fun schemaSourcesAreAllElevenInWireForm() {
        assertEquals(
            listOf(
                "note", "saved_link", "document", "calendar", "sms", "messenger",
                "health", "location", "motion", "app_usage", "device",
            ),
            SourceId.entries.map { it.wire },
        )
        assertEquals(SourceId.APP_USAGE, SourceId.fromWire("app_usage"))
        assertEquals(null, SourceId.fromWire("photo"))
    }

    @Test
    fun withAccessOnlyNoteLinkDocumentAndCalendarStartOn() {
        assertEquals(
            setOf(SourceId.NOTE, SourceId.SAVED_LINK, SourceId.DOCUMENT, SourceId.CALENDAR),
            onWithoutChoice(accessGranted = true),
        )
    }

    @Test
    fun smsAndMessengerStayOffEvenWhenACollectorClaimsDefaultOn() {
        val on = onWithoutChoice(accessGranted = true, claimsDefaultOn = true)
        assertFalse(SourceId.SMS in on)
        assertFalse(SourceId.MESSENGER in on)
        assertFalse(SourceId.SMS.startsOn)
        assertFalse(SourceId.MESSENGER.startsOn)
    }

    @Test
    fun calendarStartsOnOnlyAfterItsPermissionIsGranted() {
        val calendar = FakeCollector(SourceId.CALENDAR, requiredPermissions = listOf("android.permission.READ_CALENDAR"))
        assertFalse(SourcePolicy.isOn(calendar, choice = null, accessGranted = false))
        assertTrue(SourcePolicy.isOn(calendar, choice = null, accessGranted = true))
    }

    @Test
    fun nothingStartsOnWithoutAccess() {
        assertEquals(emptySet<SourceId>(), onWithoutChoice(accessGranted = false))
    }

    @Test
    fun collectorCanOptOutOfStartingOn() {
        assertFalse(SourcePolicy.isOn(FakeCollector(SourceId.NOTE, claimsDefaultOn = false), choice = null, accessGranted = true))
    }

    @Test
    fun explicitChoiceWinsButNeverOverridesMissingAccessOrCollector() {
        val sms = FakeCollector(SourceId.SMS)
        assertTrue(SourcePolicy.isOn(sms, choice = true, accessGranted = true))
        assertFalse(SourcePolicy.isOn(sms, choice = true, accessGranted = false))
        assertFalse(SourcePolicy.isOn(FakeCollector(SourceId.NOTE), choice = false, accessGranted = true))
        assertFalse(SourcePolicy.isOn(null, choice = true, accessGranted = true))
    }

    @Test
    fun registryHasAtMostOneCollectorPerSource() {
        val ids = CollectorRegistry.all.map { it.id }
        assertEquals(ids.size, ids.toSet().size)
        CollectorRegistry.all.forEach { assertEquals(it, CollectorRegistry.forSource(it.id)) }
    }
}
