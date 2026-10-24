package app.KPK2.lifelog.collect.location

import androidx.annotation.StringRes
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.KPK2.lifelog.R
import app.KPK2.lifelog.data.LifelogRepository
import app.KPK2.lifelog.sources.CollectorRegistry
import app.KPK2.lifelog.sources.SourceId
import kotlinx.coroutines.launch

/** "Record place now": takes one location sample on demand and says what happened. */
@Composable
fun RecordPlaceNowButton(repository: LifelogRepository, modifier: Modifier = Modifier) {
    val collector = CollectorRegistry.forSource(SourceId.LOCATION) as? LocationCollector ?: return
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var busy by remember { mutableStateOf(false) }
    var outcome by remember { mutableStateOf<RecordOutcome?>(null) }

    Column(modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        OutlinedButton(
            enabled = !busy,
            onClick = {
                busy = true
                outcome = null
                scope.launch {
                    outcome = collector.recordNow(context.applicationContext, repository)
                    busy = false
                }
            },
        ) {
            Text(stringResource(if (busy) R.string.location_recording else R.string.location_record_now))
        }
        outcome?.let {
            Text(
                text = stringResource(it.message()),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.secondary,
            )
        }
    }
}

@StringRes
private fun RecordOutcome.message(): Int = when (this) {
    RecordOutcome.RECORDED -> R.string.location_recorded
    RecordOutcome.SOURCE_OFF -> R.string.location_source_off
    RecordOutcome.LOCATION_OFF -> R.string.location_services_off
    RecordOutcome.NO_FIX -> R.string.location_no_fix
    RecordOutcome.IMPRECISE -> R.string.location_imprecise
    RecordOutcome.NOT_SAVED -> R.string.location_not_saved
}
