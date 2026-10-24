package app.KPK2.lifelog.ui.sources

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.content.pm.PackageManager
import android.text.format.DateUtils
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.KPK2.lifelog.AppGraph
import app.KPK2.lifelog.R
import app.KPK2.lifelog.data.SourceStats
import app.KPK2.lifelog.sources.Collector
import app.KPK2.lifelog.sources.CollectorRegistry
import app.KPK2.lifelog.sources.SourceId
import app.KPK2.lifelog.sources.SourcePolicy
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

private data class SourceRow(
    val id: SourceId,
    val collector: Collector?,
    val accessGranted: Boolean,
    val on: Boolean,
    val stats: SourceStats?,
)

@Composable
fun SourcesScreen(graph: AppGraph, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val choices by graph.sourceSettings.choices.collectAsStateWithLifecycle(initialValue = graph.sourceSettings.current())
    val stats by graph.repository.sourceStats.collectAsStateWithLifecycle(initialValue = emptyMap())

    // Access can change in system settings while the app is in the background: re-read it on resume.
    var accessEpoch by remember { mutableIntStateOf(0) }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { accessEpoch++ }

    var pending by remember { mutableStateOf<SourceId?>(null) }
    var deniedSource by remember { mutableStateOf<SourceId?>(null) }

    fun choose(id: SourceId, on: Boolean) = scope.launch(Dispatchers.IO) {
        graph.sourceSettings.choose(id, on)
        graph.runner.sync()
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { results ->
        val id = pending ?: return@rememberLauncherForActivityResult
        pending = null
        if (results.isNotEmpty() && results.values.all { it }) {
            deniedSource = null
            choose(id, true)
        } else {
            deniedSource = id
        }
        accessEpoch++
    }

    fun turnOn(id: SourceId, collector: Collector) {
        if (collector.hasAccess(context)) {
            choose(id, true)
            return
        }
        val missing = collector.requiredPermissions.filter {
            ContextCompat.checkSelfPermission(context, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            pending = id
            permissionLauncher.launch(missing.toTypedArray())
            return
        }
        // Special access: record the choice now; the source turns on once access is granted in settings.
        choose(id, true)
        collector.accessSettingsIntent(context)?.let { intent ->
            try {
                context.startActivity(intent)
            } catch (e: ActivityNotFoundException) {
                deniedSource = id
            }
        }
    }

    val rows = remember(choices, stats, accessEpoch) {
        SourceId.entries.map { id ->
            val collector = CollectorRegistry.forSource(id)
            val access = collector?.hasAccess(context) ?: false
            SourceRow(id, collector, access, SourcePolicy.isOn(collector, choices[id], access), stats[id.wire])
        }
    }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Text(stringResource(R.string.sources_intro), style = MaterialTheme.typography.bodyLarge)
        }
        deniedSource?.let { id ->
            item {
                DeniedNotice(
                    label = stringResource(id.label),
                    onOpenSettings = {
                        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                            .setData(Uri.fromParts("package", context.packageName, null))
                        runCatching { context.startActivity(intent) }
                    },
                    onDismiss = { deniedSource = null },
                )
            }
        }
        items(rows, key = { it.id.wire }) { row ->
            SourceCard(
                row = row,
                onToggle = { wantOn ->
                    val collector = row.collector ?: return@SourceCard
                    if (wantOn) turnOn(row.id, collector) else choose(row.id, false)
                },
            )
        }
    }
}

@Composable
private fun SourceCard(row: SourceRow, onToggle: (Boolean) -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(stringResource(row.id.label), style = MaterialTheme.typography.titleSmall)
                Text(stringResource(row.id.description), style = MaterialTheme.typography.bodySmall)
                Text(
                    text = statsLine(row.stats),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.secondary,
                )
                val note = when {
                    row.collector == null -> stringResource(R.string.source_unavailable)
                    !row.accessGranted -> stringResource(R.string.source_needs_access)
                    else -> null
                }
                note?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.tertiary) }
            }
            Switch(checked = row.on, onCheckedChange = onToggle, enabled = row.collector != null)
        }
    }
}

@Composable
private fun statsLine(stats: SourceStats?): String {
    if (stats == null || stats.count == 0) return stringResource(R.string.source_nothing_recorded)
    val ago = DateUtils.getRelativeTimeSpanString(
        stats.lastRecordedAt,
        System.currentTimeMillis(),
        DateUtils.MINUTE_IN_MILLIS,
    ).toString()
    return stringResource(R.string.source_stats, stats.count, ago)
}

@Composable
private fun DeniedNotice(label: String, onOpenSettings: () -> Unit, onDismiss: () -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Text(stringResource(R.string.source_denied, label), style = MaterialTheme.typography.bodyMedium)
            Row {
                TextButton(onClick = onOpenSettings) { Text(stringResource(R.string.source_open_settings)) }
                TextButton(onClick = onDismiss) { Text(stringResource(R.string.dismiss)) }
            }
        }
    }
}
