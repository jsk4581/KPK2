package app.KPK2.lifelog.collect.document

import android.content.res.Resources
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
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
import androidx.compose.ui.platform.LocalResources
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.KPK2.lifelog.R
import kotlinx.coroutines.launch

/** "Add document": opens the system file picker and adds the chosen file to the lifelog. */
@Composable
fun AddDocumentCard(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val importer = remember(context) { DocumentImporter.forApp(context) }
    var busy by remember { mutableStateOf(false) }
    var outcome by remember { mutableStateOf<AddResult?>(null) }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        busy = true
        outcome = null
        scope.launch {
            outcome = importer.add(context.contentResolver, uri)
            busy = false
        }
    }

    Card(modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(stringResource(R.string.document_add_title), style = MaterialTheme.typography.titleSmall)
            Text(stringResource(R.string.document_add_body), style = MaterialTheme.typography.bodySmall)
            Button(onClick = { picker.launch(DocumentRules.pickerMimeTypes) }, enabled = !busy) {
                Text(stringResource(R.string.document_add_button))
            }
            val resources = LocalResources.current
            val status = if (busy) stringResource(R.string.document_adding) else outcome?.let { describe(resources, it) }
            status?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.secondary)
            }
        }
    }
}

/** The message shown after an add, from the card or the share target. */
fun describe(resources: Resources, result: AddResult): String = when (result) {
    is AddResult.Added -> resources.getString(R.string.document_added, result.item.title)
    is AddResult.AlreadyAdded -> resources.getString(R.string.document_already_added, result.title)
    is AddResult.DeletedEarlier -> resources.getString(R.string.document_deleted_earlier, result.title)
    AddResult.SourceOff -> resources.getString(R.string.document_source_off)
    AddResult.UnsupportedType -> resources.getString(R.string.document_unsupported)
    AddResult.TooLarge -> resources.getString(R.string.document_too_large)
    AddResult.Empty -> resources.getString(R.string.document_empty)
    AddResult.Unreadable -> resources.getString(R.string.document_unreadable)
    AddResult.NoFile -> resources.getString(R.string.document_no_file)
}
