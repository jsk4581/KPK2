package app.KPK2.lifelog.collect.savedlink

/** The parts of one share that become a saved link. Built only when the shared text holds a web link. */
data class SharedLink(
    /** The first http or https link in the shared text, as written. */
    val url: String,
    /** The share's subject or title, or empty when the sending app gave none. */
    val title: String,
    /** The shared text around the link, or empty when it only repeated the link or the title. */
    val summary: String,
)

/** Turns the extras of a text share into a [SharedLink]. Pure, so every rule is unit tested. */
object SharedLinkParser {
    const val MAX_TITLE = 200
    const val MAX_SUMMARY = 500

    // A scheme followed by anything up to whitespace or characters that never belong in a written link.
    private val CANDIDATE = Regex("""(?i)https?://[^\s<>"]+""")
    private val HAS_HOST = Regex("""(?i)^https?://[\p{L}\p{N}]""")
    private const val TRAILING_PUNCTUATION = ".,;:!?'*。、，！？"
    private val CLOSERS = mapOf(')' to '(', '}' to '{', '」' to '「', '』' to '『', '）' to '（')
    private const val EDGE_SEPARATORS = " -:|"
    private val WHITESPACE = Regex("""\s+""")

    /**
     * Reads a share. [text] is the shared text, [subject] and [title] the optional subject and title
     * extras. Returns null when the text holds no http or https link, so nothing is recorded.
     */
    fun parse(text: String?, subject: String?, title: String?): SharedLink? {
        if (text.isNullOrBlank()) return null
        val (url, range) = firstLink(text) ?: return null
        val chosenTitle = ellipsize(collapse(subject).ifEmpty { collapse(title) }, MAX_TITLE)
        val rest = collapse(text.removeRange(range)).trim { it in EDGE_SEPARATORS }
        val summary = if (rest.equals(chosenTitle, ignoreCase = true) || rest.equals(collapse(subject), ignoreCase = true)) {
            ""
        } else {
            ellipsize(rest, MAX_SUMMARY)
        }
        return SharedLink(url = url, title = chosenTitle, summary = summary)
    }

    /** The first usable link in [text] and the character range it occupies there. */
    fun firstLink(text: String): Pair<String, IntRange>? {
        for (match in CANDIDATE.findAll(text)) {
            val cleaned = trimTrailing(match.value)
            if (HAS_HOST.containsMatchIn(cleaned)) {
                return cleaned to (match.range.first until match.range.first + cleaned.length)
            }
        }
        return null
    }

    /** Drops sentence punctuation after a link, and closing brackets that the link itself did not open. */
    internal fun trimTrailing(candidate: String): String {
        var end = candidate.length
        while (end > 0) {
            val last = candidate[end - 1]
            val opener = CLOSERS[last]
            val drop = when {
                last in TRAILING_PUNCTUATION -> true
                opener != null -> {
                    val body = candidate.substring(0, end)
                    body.count { it == opener } < body.count { it == last }
                }
                else -> false
            }
            if (!drop) break
            end--
        }
        return candidate.substring(0, end)
    }

    /** Collapses runs of whitespace (including line breaks) to one space; null becomes empty. */
    fun collapse(value: String?): String = value?.replace(WHITESPACE, " ")?.trim().orEmpty()

    /** Cuts [value] to at most [max] characters, ending in "..." when cut, without splitting a surrogate pair. */
    fun ellipsize(value: String, max: Int): String {
        if (value.length <= max) return value
        var cut = (max - ELLIPSIS.length).coerceAtLeast(0)
        if (cut > 0 && value[cut - 1].isHighSurrogate()) cut--
        return value.substring(0, cut).trimEnd() + ELLIPSIS
    }

    private const val ELLIPSIS = "..."
}

/** Names the app a link was shared from, when Android tells us. Pure, so it is unit tested. */
object SenderApp {
    private val PACKAGE_NAME = Regex("""^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$""")
    private const val APP_REFERRER_SCHEME = "android-app"

    /** The package in an `android-app://<package>` referrer, or null for any other referrer. */
    fun fromReferrer(scheme: String?, host: String?): String? =
        host?.takeIf { scheme.equals(APP_REFERRER_SCHEME, ignoreCase = true) }

    /**
     * The first candidate that is a well-formed package name other than this app's own, or null when
     * the sender is unknown. Candidates are given most trusted first.
     */
    fun pick(candidates: List<String?>, ownPackage: String): String? =
        candidates.firstOrNull { it != null && it != ownPackage && PACKAGE_NAME.matches(it) }
}
