package app.KPK2.lifelog.collect.motion

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect

/**
 * One line under the Movement source when the phone cannot record movement (no or outdated Google Play
 * services, or a failed registration). Shows nothing when all is well. Re-checked when the screen resumes.
 */
@Composable
fun MotionStatusNote(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    var epoch by remember { mutableIntStateOf(0) }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { epoch++ }
    val status = remember(epoch) { MotionStatus.current(context) }
    val message = status.message ?: return
    Text(
        text = stringResource(message),
        modifier = modifier,
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.error,
    )
}
