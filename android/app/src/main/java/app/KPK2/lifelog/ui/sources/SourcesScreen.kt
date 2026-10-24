package app.KPK2.lifelog.ui.sources

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
fun SourcesScreen(modifier: Modifier = Modifier) {
    Text(
        text = stringResource(R.string.sources_intro),
        style = MaterialTheme.typography.bodyLarge,
        modifier = modifier.fillMaxSize().padding(16.dp),
    )
}
