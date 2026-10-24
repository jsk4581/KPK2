package app.KPK2.lifelog.collect.appusage

import android.content.pm.ApplicationInfo

/** The buckets app time is reported in. [wire] is the item title and tag; package names never leave this file's callers. */
enum class UsageCategory(val wire: String) {
    PRODUCTIVITY("productivity"),
    COMMUNICATION("communication"),
    SOCIAL("social"),
    VIDEO("video"),
    OTHER("other"),
}

/**
 * Picks a [UsageCategory] for a package. A small built-in list comes first because the system has no
 * "communication" category and many apps leave theirs unset; otherwise the category the app declares
 * in its manifest ([ApplicationInfo.category]) decides, and anything else is [UsageCategory.OTHER].
 */
object UsageCategories {

    /** Package name, or a package prefix followed by '.', to category. Lookups are exact or prefix matches. */
    private val builtIn: Map<String, UsageCategory> = buildMap {
        listOf(
            "com.google.android.gm", "com.microsoft.office.outlook", "com.slack", "com.whatsapp",
            "org.telegram.messenger", "org.thoughtcrime.securesms", "com.discord", "com.facebook.orca",
            "us.zoom.videomeetings", "com.microsoft.teams", "com.google.android.apps.messaging",
            "com.samsung.android.messaging", "com.google.android.dialer", "com.google.android.apps.tachyon",
            "com.android.mms", "com.android.dialer",
        ).forEach { put(it, UsageCategory.COMMUNICATION) }
        listOf(
            "com.google.android.apps.docs", "com.google.android.calendar", "com.google.android.keep",
            "com.microsoft.office", "com.notion.id", "com.todoist", "com.trello", "com.asana.app",
            "com.dropbox.android", "com.evernote", "com.figma.mirror", "com.adobe.reader",
            "com.github.android", "com.atlassian",
        ).forEach { put(it, UsageCategory.PRODUCTIVITY) }
        listOf(
            "com.instagram.android", "com.facebook.katana", "com.twitter.android", "com.reddit.frontpage",
            "com.linkedin.android", "com.pinterest", "com.snapchat.android", "com.zhiliaoapp.musically",
            "com.instagram.barcelona", "com.bsky.app", "org.joinmastodon.android",
        ).forEach { put(it, UsageCategory.SOCIAL) }
        listOf(
            "com.google.android.youtube", "com.netflix.mediaclient", "com.amazon.avod.thirdpartyclient",
            "com.disney.disneyplus", "tv.twitch.android.app", "com.hulu.plus", "com.google.android.apps.youtube",
        ).forEach { put(it, UsageCategory.VIDEO) }
    }

    /**
     * @param packageName the app's package, used only for the lookup.
     * @param declaredCategory [ApplicationInfo.category], or [ApplicationInfo.CATEGORY_UNDEFINED] when unknown.
     */
    fun of(packageName: String, declaredCategory: Int): UsageCategory =
        builtInFor(packageName) ?: fromDeclared(declaredCategory)

    internal fun builtInFor(packageName: String): UsageCategory? {
        builtIn[packageName]?.let { return it }
        // Walk up the dotted name so "com.microsoft.office.word" matches the "com.microsoft.office" entry.
        var name = packageName
        while (true) {
            val cut = name.lastIndexOf('.')
            if (cut <= 0) return null
            name = name.substring(0, cut)
            builtIn[name]?.let { return it }
        }
    }

    internal fun fromDeclared(declaredCategory: Int): UsageCategory = when (declaredCategory) {
        ApplicationInfo.CATEGORY_PRODUCTIVITY -> UsageCategory.PRODUCTIVITY
        ApplicationInfo.CATEGORY_SOCIAL -> UsageCategory.SOCIAL
        ApplicationInfo.CATEGORY_VIDEO -> UsageCategory.VIDEO
        else -> UsageCategory.OTHER
    }
}
