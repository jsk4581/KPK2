package app.KPK2.lifelog.collect.note

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.Spacer
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.KPK2.lifelog.R
import app.KPK2.lifelog.appGraph
import app.KPK2.lifelog.data.LifelogRepository
import app.KPK2.lifelog.sources.Collector
import app.KPK2.lifelog.sources.CollectorRegistry
import app.KPK2.lifelog.sources.SourceId
import app.KPK2.lifelog.sources.SourcePolicy
import app.KPK2.lifelog.sources.SourceSettings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * The "New note" button for the Timeline header, with its writing dialog. It shows only while the
 * note source is registered and on, so a person who turned notes off on the Sources screen is not
 * offered a way to record one.
 */
@Composable
fun NewNoteButton(modifier: Modifier = Modifier) {
    val graph = LocalContext.current.appGraph
    NewNoteButton(graph.repository, graph.sourceSettings, graph.appScope, modifier)
}

@Composable
fun NewNoteButton(
    repository: LifelogRepository,
    settings: SourceSettings,
    // The write outlives the dialog, so it runs in a scope that is not cancelled when the screen changes.
    writeScope: CoroutineScope,
    modifier: Modifier = Modifier,
) {
    val choices by settings.choices.collectAsStateWithLifecycle(initialValue = settings.current())
    if (!composerShown(CollectorRegistry.forSource(SourceId.NOTE), choices[SourceId.NOTE])) return

    var writing by rememberSaveable { mutableStateOf(false) }

    FilledTonalButton(onClick = { writing = true }, modifier = modifier) {
        Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(6.dp))
        Text(stringResource(R.string.note_new))
    }

    if (writing) {
        NoteDialog(
            onDismiss = { writing = false },
            onSave = { text ->
                writing = false
                writeScope.launch { NoteCollector.save(repository, text) }
            },
        )
    }
}

@Composable
private fun NoteDialog(onDismiss: () -> Unit, onSave: (String) -> Unit) {
    var text by rememberSaveable { mutableStateOf("") }
    val canSave = NoteText.parse(text) != null

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.note_dialog_title)) },
        text = {
            OutlinedTextField(
                value = text,
                onValueChange = { text = it.take(NoteText.INPUT_MAX) },
                label = { Text(stringResource(R.string.note_field_label)) },
                placeholder = { Text(stringResource(R.string.note_field_hint)) },
                minLines = 4,
                maxLines = 10,
                modifier = Modifier.fillMaxWidth(),
            )
        },
        confirmButton = {
            TextButton(onClick = { onSave(text) }, enabled = canSave) { Text(stringResource(R.string.note_save)) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) }
        },
    )
}

/** The composer is offered only when a note collector is registered and the person has notes on. */
internal fun composerShown(registered: Collector?, choice: Boolean?): Boolean =
    SourcePolicy.isOn(registered, choice, accessGranted = true)
