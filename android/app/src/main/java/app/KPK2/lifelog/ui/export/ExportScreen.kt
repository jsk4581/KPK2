package app.KPK2.lifelog.ui.export

import android.content.ActivityNotFoundException
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.KPK2.lifelog.R
import app.KPK2.lifelog.data.LifelogRepository
import app.KPK2.lifelog.export.ExportShare
import app.KPK2.lifelog.export.LifelogExporter
import java.io.IOException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun ExportScreen(repository: LifelogRepository, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val count by repository.count.collectAsStateWithLifecycle(initialValue = 0)
    val scope = rememberCoroutineScope()
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val failedText = stringResource(R.string.export_failed)

    Column(
        modifier = modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(stringResource(R.string.export_intro), style = MaterialTheme.typography.bodyLarge)
        Text(stringResource(R.string.export_privacy), style = MaterialTheme.typography.bodyMedium)
        Text(pluralStringResource(R.plurals.export_count, count, count), style = MaterialTheme.typography.titleMedium)
        Button(
            enabled = count > 0 && !busy,
            onClick = {
                busy = true
                error = null
                scope.launch {
                    try {
                        val file = withContext(Dispatchers.IO) {
                            ExportShare.writeFile(context, LifelogExporter.toJson(repository.snapshot()))
                        }
                        context.startActivity(ExportShare.shareIntent(context, file))
                    } catch (e: IOException) {
                        error = failedText
                    } catch (e: ActivityNotFoundException) {
                        error = failedText
                    } finally {
                        busy = false
                    }
                }
            },
        ) { Text(stringResource(R.string.export_button)) }
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
    }
}
