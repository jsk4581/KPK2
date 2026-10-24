package app.KPK2.lifelog.export

import android.content.ClipData
import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import app.KPK2.lifelog.R
import java.io.File
import java.time.LocalDate

/** Writes the export file to the app cache and builds the system share sheet for it. */
object ExportShare {
    private const val DIR = "exports"
    const val MIME_TYPE = "application/json"

    fun fileName(today: LocalDate = LocalDate.now()): String = "second-draft-lifelog-$today.json"

    /** Replaces any earlier export so only the latest file sits in the cache. */
    fun writeFile(context: Context, json: String): File {
        val dir = File(context.cacheDir, DIR).apply { mkdirs() }
        dir.listFiles()?.forEach { it.delete() }
        return File(dir, fileName()).apply { writeText(json, Charsets.UTF_8) }
    }

    fun shareIntent(context: Context, file: File): Intent {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.exports", file)
        val send = Intent(Intent.ACTION_SEND).apply {
            type = MIME_TYPE
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_TITLE, file.name)
            clipData = ClipData.newRawUri(file.name, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        return Intent.createChooser(send, context.getString(R.string.export_chooser_title))
    }
}
