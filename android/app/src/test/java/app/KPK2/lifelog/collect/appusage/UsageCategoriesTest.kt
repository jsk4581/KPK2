package app.KPK2.lifelog.collect.appusage

import android.content.pm.ApplicationInfo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class UsageCategoriesTest {

    @Test
    fun declaredCategoriesMapToTheFiveBuckets() {
        assertEquals(UsageCategory.PRODUCTIVITY, UsageCategories.of("com.example.planner", ApplicationInfo.CATEGORY_PRODUCTIVITY))
        assertEquals(UsageCategory.SOCIAL, UsageCategories.of("com.example.feed", ApplicationInfo.CATEGORY_SOCIAL))
        assertEquals(UsageCategory.VIDEO, UsageCategories.of("com.example.player", ApplicationInfo.CATEGORY_VIDEO))
        assertEquals(UsageCategory.OTHER, UsageCategories.of("com.example.game", ApplicationInfo.CATEGORY_GAME))
        assertEquals(UsageCategory.OTHER, UsageCategories.of("com.example.maps", ApplicationInfo.CATEGORY_MAPS))
        assertEquals(UsageCategory.OTHER, UsageCategories.of("com.example.unknown", ApplicationInfo.CATEGORY_UNDEFINED))
    }

    @Test
    fun builtInListWinsAndSuppliesCommunication() {
        // A mail app that declares itself productivity is still counted as communication.
        assertEquals(UsageCategory.COMMUNICATION, UsageCategories.of("com.google.android.gm", ApplicationInfo.CATEGORY_PRODUCTIVITY))
        assertEquals(UsageCategory.COMMUNICATION, UsageCategories.of("com.slack", ApplicationInfo.CATEGORY_UNDEFINED))
        assertEquals(UsageCategory.VIDEO, UsageCategories.of("com.google.android.youtube", ApplicationInfo.CATEGORY_UNDEFINED))
    }

    @Test
    fun builtInMatchesWholeDottedPrefixesOnly() {
        assertEquals(UsageCategory.PRODUCTIVITY, UsageCategories.builtInFor("com.microsoft.office.word"))
        assertEquals(UsageCategory.PRODUCTIVITY, UsageCategories.builtInFor("com.google.android.apps.docs.editors.sheets"))
        assertNull(UsageCategories.builtInFor("com.slackware"))
        assertNull(UsageCategories.builtInFor("com"))
        assertNull(UsageCategories.builtInFor(""))
    }

    @Test
    fun wireNamesAreTheFiveCategoryTitles() {
        assertEquals(
            listOf("productivity", "communication", "social", "video", "other"),
            UsageCategory.entries.map { it.wire },
        )
    }
}
