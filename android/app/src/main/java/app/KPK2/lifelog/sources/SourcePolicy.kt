package app.KPK2.lifelog.sources

/** Decides whether a source records right now. Pure, so the privacy defaults are unit tested. */
object SourcePolicy {

    /** The state of a source the person has never toggled. */
    fun startsOn(collector: Collector): Boolean = collector.id.startsOn && collector.defaultEnabled

    /**
     * A source records only when a collector exists for it, the phone grants access, and the person
     * turned it on, or never chose and it starts on.
     */
    fun isOn(collector: Collector?, choice: Boolean?, accessGranted: Boolean): Boolean =
        collector != null && accessGranted && (choice ?: startsOn(collector))
}
