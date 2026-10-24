package app.KPK2.lifelog.collect.messenger

/**
 * Messaging apps re-post the same notification key as messages arrive or as they refresh it. The guard
 * lets one item through per key per [windowMs]; later updates inside that window are dropped. It keeps
 * only the newest [capacity] keys, in memory.
 */
class RepeatGuard(private val windowMs: Long = 60_000L, private val capacity: Int = 256) {

    private val lastAdmitted = object : LinkedHashMap<String, Long>(16, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, Long>?): Boolean = size > capacity
    }

    /** True when [key] has not been admitted in the last [windowMs] before [atMs]; records the admission. */
    @Synchronized
    fun admit(key: String, atMs: Long): Boolean {
        val previous = lastAdmitted[key]
        if (previous != null && atMs - previous < windowMs) return false
        lastAdmitted[key] = atMs
        return true
    }
}
