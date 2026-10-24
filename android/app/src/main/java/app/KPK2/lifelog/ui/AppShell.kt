package app.KPK2.lifelog.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import app.KPK2.lifelog.ui.export.ExportScreen
import app.KPK2.lifelog.ui.sources.SourcesScreen
import app.KPK2.lifelog.ui.timeline.TimelineScreen

@Composable
fun AppShell() {
    var current by rememberSaveable { mutableStateOf(Destination.TIMELINE) }

    Scaffold(
        bottomBar = {
            NavigationBar {
                Destination.entries.forEach { destination ->
                    val label = stringResource(destination.label)
                    NavigationBarItem(
                        selected = destination == current,
                        onClick = { current = destination },
                        icon = { Icon(destination.icon(), contentDescription = null) },
                        label = { Text(label) },
                    )
                }
            }
        },
    ) { innerPadding ->
        val modifier = Modifier.padding(innerPadding)
        when (current) {
            Destination.TIMELINE -> TimelineScreen(modifier)
            Destination.SOURCES -> SourcesScreen(modifier)
            Destination.EXPORT -> ExportScreen(modifier)
        }
    }
}

@Suppress("DEPRECATION") // The auto-mirrored list icon lives in the extended icon set, which this app does not ship.
private fun Destination.icon(): ImageVector = when (this) {
    Destination.TIMELINE -> Icons.Filled.List
    Destination.SOURCES -> Icons.Filled.Settings
    Destination.EXPORT -> Icons.Filled.Share
}
