package app.KPK2.lifelog.collect.note

/**
 * Turns what the person typed into the parts of a note item. Pure, so every rule is unit tested.
 *
 * - The first non-blank line is the title; the lines after it are the summary.
 * - A first line longer than [TITLE_MAX] is shortened for the title, and then the whole text goes
 *   into the summary so no words are lost.
 * - Hashtags the person typed (`#brand-voice`) become tags, lowercased and without duplicates.
 *   Nothing else is inferred from the text.
 */
object NoteText {
    const val TITLE_MAX = 80
    const val SUMMARY_MAX = 2000
    const val TAGS_MAX = 10

    /** Longest text the composer accepts; the full text is kept on the phone as the item's raw detail. */
    const val INPUT_MAX = 10_000

    private const val ELLIPSIS = "…"

    // A tag starts with a letter and must not follow a word character, so URL fragments and "#1" are skipped.
    private val HASHTAG = Regex("""(?<![\w#])#([A-Za-z][A-Za-z0-9_-]{0,39})""")

    data class Parsed(val title: String, val summary: String, val tags: List<String>, val text: String)

    /** Returns null when there is nothing to save (empty or whitespace only). */
    fun parse(input: String): Parsed? {
        val text = normalize(input.take(INPUT_MAX))
        if (text.isEmpty()) return null

        val lines = text.lines()
        val firstLine = lines.first()
        val rest = lines.drop(1).joinToString("\n").trim()

        val title = shorten(firstLine, TITLE_MAX)
        val body = if (title == firstLine) rest else text
        return Parsed(
            title = title,
            summary = shorten(body, SUMMARY_MAX),
            tags = hashtags(text),
            text = text,
        )
    }

    /**
     * Unifies line endings, trims trailing spaces on each line, drops blank lines before the first
     * line of text and after the last, and keeps at most one blank line between paragraphs.
     */
    fun normalize(input: String): String {
        val lines = input.replace("\r\n", "\n").replace('\r', '\n').lines().map { it.trimEnd() }
        val out = ArrayList<String>(lines.size)
        for (line in lines) {
            if (line.isBlank() && (out.isEmpty() || out.last().isEmpty())) continue
            out += if (line.isBlank()) "" else line
        }
        while (out.isNotEmpty() && out.last().isEmpty()) out.removeAt(out.lastIndex)
        return out.joinToString("\n").trimStart()
    }

    /** Lowercased hashtags in order of first use, at most [TAGS_MAX]. Trailing dashes or underscores are dropped. */
    fun hashtags(text: String): List<String> =
        HASHTAG.findAll(text)
            .map { it.groupValues[1].trimEnd('-', '_').lowercase() }
            .filter { it.isNotEmpty() }
            .distinct()
            .take(TAGS_MAX)
            .toList()

    /**
     * Returns [value] unchanged when it fits in [max] characters. Otherwise cuts at the last space in
     * the second half of the allowed length (or hard at the limit when there is none) and appends an
     * ellipsis, so the result is never longer than [max].
     */
    fun shorten(value: String, max: Int): String {
        require(max >= 2) { "max must leave room for the ellipsis" }
        if (value.length <= max) return value
        val cut = value.substring(0, max - ELLIPSIS.length)
        val space = cut.lastIndexOf(' ')
        val kept = if (space >= max / 2) cut.substring(0, space) else cut
        return kept.trimEnd() + ELLIPSIS
    }
}
