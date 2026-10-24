package app.KPK2.lifelog.collect.document

import java.util.Locale

/** The document kinds the person can add. [label] is the type word written into the item summary. */
enum class DocumentType(val extensions: List<String>, val mimeTypes: List<String>, val label: String) {
    PDF(listOf("pdf"), listOf("application/pdf"), "PDF"),
    DOC(listOf("doc"), listOf("application/msword"), "Word document (DOC)"),
    DOCX(
        listOf("docx"),
        listOf("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        "Word document (DOCX)",
    ),
    TXT(listOf("txt"), listOf("text/plain"), "Plain text"),
    MD(listOf("md", "markdown"), listOf("text/markdown", "text/x-markdown"), "Markdown");

    /** The extension used for the private copy and for names that arrive without one. */
    val primaryExtension: String get() = extensions.first()
}

/** Outcome of checking a file's name, type and declared size before any byte is copied. */
sealed interface DocumentCheck {
    data class Accepted(val type: DocumentType) : DocumentCheck
    data object UnsupportedType : DocumentCheck
    data object TooLarge : DocumentCheck
}

/** Pure rules for added documents: which files are accepted, and how they are named and summarised. */
object DocumentRules {
    /** 20 MB, counted in binary megabytes like the size shown in the summary. */
    const val MAX_BYTES: Long = 20L * 1024 * 1024

    /** Longest title kept, in characters, extension included. */
    const val MAX_NAME_LENGTH = 120

    /** Item ids are `document-` plus the first 32 hex digits of the file's SHA-256. */
    const val ID_PREFIX = "document-"
    private const val HASH_CHARS = 32

    private const val UNTITLED = "Untitled document"

    /**
     * What the system file picker offers. Some file managers label Markdown as a generic binary, so
     * that type is offered too; [classify] still rejects anything whose extension is not accepted.
     */
    val pickerMimeTypes: Array<String> =
        (DocumentType.entries.flatMap { it.mimeTypes } + "application/octet-stream").toTypedArray()

    /** Lower-case extension after the last dot, or null when the name has none. */
    fun extensionOf(name: String?): String? {
        val base = name?.let(::lastPathSegment)?.trim() ?: return null
        val dot = base.lastIndexOf('.')
        if (dot <= 0 || dot == base.lastIndex) return null
        return base.substring(dot + 1).lowercase(Locale.ROOT)
    }

    /**
     * The document kind of a file. When the name has an extension, the extension decides, so a file
     * called `setup.exe` is refused whatever type the sending app claims. The MIME type is used only for
     * names without an extension.
     */
    fun classify(name: String?, mimeType: String?): DocumentType? {
        val extension = extensionOf(name)
        if (extension != null) return DocumentType.entries.firstOrNull { extension in it.extensions }
        val mime = mimeType?.substringBefore(';')?.trim()?.lowercase(Locale.ROOT) ?: return null
        return DocumentType.entries.firstOrNull { mime in it.mimeTypes }
    }

    /** Checks what is known before copying. [declaredSize] is null when the provider does not report it. */
    fun check(name: String?, mimeType: String?, declaredSize: Long?): DocumentCheck {
        val type = classify(name, mimeType) ?: return DocumentCheck.UnsupportedType
        if (declaredSize != null && declaredSize > MAX_BYTES) return DocumentCheck.TooLarge
        return DocumentCheck.Accepted(type)
    }

    /**
     * The item title: the file name without any folder part or control characters, with the type's
     * extension added when missing, and shortened to [MAX_NAME_LENGTH] while keeping the extension.
     */
    fun cleanFileName(raw: String?, type: DocumentType): String {
        val cleaned = raw?.let(::lastPathSegment)
            ?.replace(CONTROL_CHARS, " ")
            ?.replace(WHITESPACE_RUN, " ")
            ?.trim()
            .orEmpty()
        val base = cleaned.ifEmpty { UNTITLED }
        val named = if (extensionOf(base) == null) "$base.${type.primaryExtension}" else base
        if (named.length <= MAX_NAME_LENGTH) return named
        val dot = named.lastIndexOf('.')
        val extension = named.substring(dot)
        val stem = safePrefix(named.substring(0, dot), MAX_NAME_LENGTH - extension.length).trimEnd()
        return stem + extension
    }

    /** Human size: bytes below 1 KB, whole KB below 1 MB, one decimal in MB above. */
    fun formatSize(bytes: Long): String = when {
        bytes == 1L -> "1 byte"
        bytes < 1024 -> "$bytes bytes"
        bytes < 1024 * 1024 -> "${maxOf(1L, Math.round(bytes / 1024.0))} KB"
        else -> String.format(Locale.US, "%.1f MB", bytes / (1024.0 * 1024.0))
    }

    /** The item summary: document kind and size, for example "PDF, 1.2 MB". */
    fun summary(type: DocumentType, bytes: Long): String = "${type.label}, ${formatSize(bytes)}"

    fun itemId(sha256Hex: String): String = ID_PREFIX + hashKey(sha256Hex)

    /** File name of the private copy. Two adds of the same bytes land on the same file. */
    fun storedFileName(sha256Hex: String, type: DocumentType): String =
        "${hashKey(sha256Hex)}.${type.primaryExtension}"

    /** The key shared by an item id and its stored file name, or null for ids of other shapes. */
    fun keyOfItemId(id: String): String? =
        id.removePrefix(ID_PREFIX).takeIf { id.startsWith(ID_PREFIX) && HEX_KEY.matches(it) }

    /** The key part of a stored file name. */
    fun keyOfStoredFile(fileName: String): String = fileName.substringBefore('.')

    private fun hashKey(sha256Hex: String): String {
        require(sha256Hex.length >= HASH_CHARS && HEX.matches(sha256Hex)) { "not a hex digest" }
        return sha256Hex.substring(0, HASH_CHARS).lowercase(Locale.ROOT)
    }

    private fun lastPathSegment(name: String): String = name.substringAfterLast('/').substringAfterLast('\\')

    /** First [max] chars of [text] without splitting a surrogate pair. */
    private fun safePrefix(text: String, max: Int): String {
        if (text.length <= max) return text
        val end = if (max > 0 && Character.isHighSurrogate(text[max - 1])) max - 1 else max
        return text.substring(0, end)
    }

    private val CONTROL_CHARS = Regex("""\p{Cntrl}""")
    private val WHITESPACE_RUN = Regex("""\s+""")
    private val HEX = Regex("""[0-9a-fA-F]+""")
    private val HEX_KEY = Regex("""[0-9a-f]{32}""")
}
