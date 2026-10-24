package app.KPK2.lifelog.collect.appusage

import org.junit.Assert.assertEquals
import org.junit.Test

class HomeScreenPackagesTest {

    @Test
    fun theSettingsBootPlaceholderIsNotAHomeScreen() {
        // What an AOSP-based phone returns for MAIN + HOME: the launcher and Settings' FallbackHome.
        val candidates = listOf(
            "com.example.launcher" to 0,
            "com.android.settings" to -1000,
            null to 0,
        )
        assertEquals(setOf("com.example.launcher"), AppUsageCollector.homeScreenPackages(candidates))
    }

    @Test
    fun everyRealLauncherIsIgnored() {
        val candidates = listOf("com.example.launcher" to 0, "com.example.otherhome" to 1)
        assertEquals(setOf("com.example.launcher", "com.example.otherhome"), AppUsageCollector.homeScreenPackages(candidates))
    }
}
