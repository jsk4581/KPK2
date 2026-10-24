package app.KPK2.lifelog.ui.timeline

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.KPK2.lifelog.R

@Composable
fun TimelineScreen(modifier: Modifier = Modifier) {
    Text(
        text = stringResource(R.string.timeline_empty),
        style = MaterialTheme.typography.bodyLarge,
        modifier = modifier.fillMaxSize().padding(16.dp),
    )
}
