package app.KPK2.lifelog.collect.document

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import app.KPK2.lifelog.appGraph
import app.KPK2.lifelog.data.LifelogItem
import app.KPK2.lifelog.data.LifelogRepository
import app.KPK2.lifelog.sources.CollectorRegistry
import app.KPK2.lifelog.sources.SourceId
import app.KPK2.lifelog.sources.SourcePolicy
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.io.File
import java.io.IOException
import java.io.InputStream
import java.time.ZoneId

/** A file the person chose or shared, before anything is copied. */
class DocumentInput(
    val displayName: String?,
    val mimeType: String?,
    /** Size reported by the provider, or null when unknown. Only a hint: the copy enforces the limit. */
    val declaredSize: Long?,
    /** Opens the file's bytes; returns null or throws when the file cannot be read. */
    val open: () -> InputStream?,
)

/** What happened to one add. The UI turns each case into a message. */
sealed interface AddResult {
    data class Added(val item: LifelogItem) : AddResult
    data class AlreadyAdded(val title: String) : AddResult
    /** The person deleted this exact file earlier, and deleted items stay deleted. */
    data class DeletedEarlier(val title: String) : AddResult
    data object SourceOff : AddResult
    data object UnsupportedType : AddResult
    data object TooLarge : AddResult
    data object Empty : AddResult
    data object Unreadable : AddResult
    /** A share arrived without a file stream, for example plain shared text. */
    data object NoFile : AddResult
}

/**
 * Adds a document the person picked or shared: checks type and size, copies it into private storage,
 * and records one lifelog item (title = file name, summary = type and size, url = null).
 */
class DocumentImporter(
    private val repository: LifelogRepository,
    private val store: DocumentStore,
    /** Scratch folder for partial copies; anything left there is temporary. */
    private val workDir: File,
    private val isSourceOn: () -> Boolean,
    private val clock: () -> Long = System::currentTimeMillis,
    private val zone: ZoneId = ZoneId.systemDefault(),
) {

    suspend fun add(input: DocumentInput): AddResult = withContext(Dispatchers.IO) {
        if (!isSourceOn()) return@withContext AddResult.SourceOff
        val type = when (val check = DocumentRules.check(input.displayName, input.mimeType, input.declaredSize)) {
            is DocumentCheck.Accepted -> check.type
            DocumentCheck.UnsupportedType -> return@withContext AddResult.UnsupportedType
            DocumentCheck.TooLarge -> return@withContext AddResult.TooLarge
        }
        val title = DocumentRules.cleanFileName(input.displayName, type)

        workDir.mkdirs()
        val partial = File.createTempFile("adding-", ".part", workDir)
        try {
            val copied = copyIn(input, partial) ?: return@withContext AddResult.Unreadable
            when (copied) {
                CopyOutcome.TooLarge -> AddResult.TooLarge
                is CopyOutcome.Copied ->
                    if (copied.bytes == 0L) AddResult.Empty else keep(partial, copied, type, title, input)
            }
        } finally {
            partial.delete()
        }
    }

    /** Adds a picked or shared [uri]; the provider is queried off the main thread. */
    suspend fun add(resolver: ContentResolver, uri: Uri, mimeHint: String? = null): AddResult =
        withContext(Dispatchers.IO) {
            inputFor(resolver, uri, mimeHint)?.let { add(it) } ?: AddResult.Unreadable
        }

    private fun copyIn(input: DocumentInput, target: File): CopyOutcome? = try {
        input.open()?.use { source ->
            target.outputStream().use { sink -> copyWithLimit(source, sink, DocumentRules.MAX_BYTES) }
        }
    } catch (e: IOException) {
        null
    } catch (e: SecurityException) {
        null
    }

    private suspend fun keep(
        partial: File,
        copied: CopyOutcome.Copied,
        type: DocumentType,
        title: String,
        input: DocumentInput,
    ): AddResult = DocumentStore.lock.withLock {
        val id = DocumentRules.itemId(copied.sha256Hex)
        val key = DocumentRules.keyOfItemId(id)!!
        val live = DocumentStore.liveKeys(repository)
        val target = store.fileFor(DocumentRules.storedFileName(copied.sha256Hex, type))

        if (key in live) {
            if (!target.exists()) moveInto(partial, target)
            return@withLock AddResult.AlreadyAdded(title)
        }

        moveInto(partial, target)
        val now = clock()
        val item = LifelogItem(
            id = id,
            date = LifelogItem.dateOf(now, zone),
            source = SourceId.DOCUMENT.wire,
            title = title,
            summary = DocumentRules.summary(type, copied.bytes),
            tags = emptyList(),
            url = null,
            recordedAt = now,
            raw = rawDetail(input, type, copied, target.name),
        )
        val result = if (repository.record(item) == 0) {
            target.delete()
            AddResult.DeletedEarlier(title)
        } else {
            AddResult.Added(item)
        }
        // Copies of items deleted since the last add go now, not only on the next background pull.
        store.prune(if (result is AddResult.Added) live + key else live)
        result
    }

    private fun moveInto(partial: File, target: File) {
        if (!partial.renameTo(target)) {
            partial.copyTo(target, overwrite = true)
        }
    }

    /** Device-only detail; the exporter never writes [LifelogItem.raw]. */
    private fun rawDetail(input: DocumentInput, type: DocumentType, copied: CopyOutcome.Copied, storedName: String) =
        buildJsonObject {
            put("originalName", input.displayName)
            put("mimeType", input.mimeType)
            put("type", type.name)
            put("bytes", copied.bytes)
            put("sha256", copied.sha256Hex)
            put("storedFile", storedName)
        }.toString()

    companion object {
        private const val WORK_DIR = "document-adding"

        /** The importer wired to the app's store and the person's Documents toggle. */
        fun forApp(context: Context): DocumentImporter {
            val graph = context.appGraph
            val app = context.applicationContext
            return DocumentImporter(
                repository = graph.repository,
                store = DocumentStore.forApp(app),
                workDir = File(app.cacheDir, WORK_DIR),
                isSourceOn = {
                    // Same rule the Sources screen shows: registered, and on by choice or by default.
                    val collector = CollectorRegistry.forSource(SourceId.DOCUMENT)
                    SourcePolicy.isOn(collector, graph.sourceSettings.current()[SourceId.DOCUMENT], true)
                },
            )
        }

        /**
         * Describes a picked or shared [uri]. Only `content:` URIs are read: a raw `file:` path from
         * another app could point into this app's own private files.
         */
        fun inputFor(resolver: ContentResolver, uri: Uri, mimeHint: String? = null): DocumentInput? {
            if (uri.scheme != ContentResolver.SCHEME_CONTENT) return null
            var name: String? = null
            var size: Long? = null
            runCatching {
                resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)
                    ?.use { cursor ->
                        if (cursor.moveToFirst()) {
                            val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                            val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                            if (nameIndex >= 0 && !cursor.isNull(nameIndex)) name = cursor.getString(nameIndex)
                            if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) size = cursor.getLong(sizeIndex)
                        }
                    }
            }
            val mime = runCatching { resolver.getType(uri) }.getOrNull() ?: mimeHint
            return DocumentInput(
                displayName = name ?: uri.lastPathSegment,
                mimeType = mime,
                declaredSize = size?.takeIf { it >= 0 },
                open = { resolver.openInputStream(uri) },
            )
        }
    }
}
