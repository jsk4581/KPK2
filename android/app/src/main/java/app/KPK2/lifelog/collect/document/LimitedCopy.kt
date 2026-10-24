package app.KPK2.lifelog.collect.document

import java.io.InputStream
import java.io.OutputStream
import java.security.MessageDigest

/** Result of streaming a file into the app while counting and hashing it. */
sealed interface CopyOutcome {
    data class Copied(val bytes: Long, val sha256Hex: String) : CopyOutcome

    /** More than the limit arrived; copying stopped there and the output is incomplete. */
    data object TooLarge : CopyOutcome
}

/**
 * Copies [input] to [output] and hashes it, stopping as soon as more than [maxBytes] have been read.
 * The declared size of a shared file can be missing or wrong, so the limit is enforced on the bytes
 * themselves. Neither stream is closed here.
 */
fun copyWithLimit(input: InputStream, output: OutputStream, maxBytes: Long): CopyOutcome {
    val digest = MessageDigest.getInstance("SHA-256")
    val buffer = ByteArray(64 * 1024)
    var total = 0L
    while (true) {
        val read = input.read(buffer)
        if (read < 0) break
        total += read
        if (total > maxBytes) return CopyOutcome.TooLarge
        digest.update(buffer, 0, read)
        output.write(buffer, 0, read)
    }
    return CopyOutcome.Copied(total, digest.digest().joinToString("") { "%02x".format(it) })
}
