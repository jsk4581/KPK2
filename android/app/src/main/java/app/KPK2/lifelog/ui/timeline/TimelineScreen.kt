package app.KPK2.lifelog.ui.timeline

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.KPK2.lifelog.ItemDeleter
import app.KPK2.lifelog.R
import app.KPK2.lifelog.collect.note.NewNoteButton
import app.KPK2.lifelog.data.LifelogItem
import app.KPK2.lifelog.data.LifelogRepository
import kotlinx.coroutines.launch

@Composable
fun TimelineScreen(repository: LifelogRepository, deleter: ItemDeleter, modifier: Modifier = Modifier) {
    val items by repository.items.collectAsStateWithLifecycle(initialValue = emptyList())
    val scope = rememberCoroutineScope()
    var confirmDeleteAll by remember { mutableStateOf(false) }

    Column(modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp, top = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = stringResource(R.string.timeline_count, items.size),
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.weight(1f),
            )
            NewNoteButton()
            TextButton(onClick = { confirmDeleteAll = true }, enabled = items.isNotEmpty()) {
                Text(stringResource(R.string.timeline_delete_all))
            }
        }

        if (items.isEmpty()) {
            Text(
                text = stringResource(R.string.timeline_empty),
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.padding(16.dp),
            )
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(16.dp),
            ) {
                items(items, key = { it.id }) { item ->
                    ItemCard(item, onDelete = { scope.launch { deleter.delete(item.id) } })
                }
            }
        }
    }

    if (confirmDeleteAll) {
        AlertDialog(
            onDismissRequest = { confirmDeleteAll = false },
            title = { Text(stringResource(R.string.timeline_delete_all_title)) },
            text = { Text(stringResource(R.string.timeline_delete_all_body)) },
            confirmButton = {
                TextButton(onClick = {
                    confirmDeleteAll = false
                    scope.launch { deleter.deleteAll() }
                }) { Text(stringResource(R.string.timeline_delete_all_confirm)) }
            },
            dismissButton = {
                TextButton(onClick = { confirmDeleteAll = false }) { Text(stringResource(R.string.cancel)) }
            },
        )
    }
}

@Composable
private fun ItemCard(item: LifelogItem, onDelete: () -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Row(Modifier.padding(start = 16.dp, top = 12.dp, bottom = 12.dp, end = 4.dp)) {
            Column(Modifier.weight(1f)) {
                Text(
                    text = "${item.date} · ${item.source}",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.secondary,
                )
                Text(item.title, style = MaterialTheme.typography.titleSmall)
                if (item.summary.isNotBlank()) {
                    Text(item.summary, style = MaterialTheme.typography.bodyMedium)
                }
                if (item.tags.isNotEmpty()) {
                    Text(
                        text = item.tags.joinToString(" ") { "#$it" },
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
                item.url?.let {
                    Text(it, style = MaterialTheme.typography.labelSmall, maxLines = 1)
                }
            }
            Spacer(Modifier.width(4.dp))
            IconButton(onClick = onDelete) {
                Icon(Icons.Filled.Delete, contentDescription = stringResource(R.string.timeline_delete_one))
            }
        }
    }
}
