package app.KPK2.lifelog.collect.savedlink

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.KPK2.lifelog.R
import app.KPK2.lifelog.appGraph
import app.KPK2.lifelog.sources.CollectorRegistry
import app.KPK2.lifelog.sources.SourceId
import app.KPK2.lifelog.sources.SourcePolicy
import app.KPK2.lifelog.ui.theme.SecondDraftTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * The share sheet target for links. It records the share as one saved link item, tells the person
 * what happened, and closes. Nothing is fetched from the link.
 */
class ShareLinkActivity : ComponentActivity() {
    private val model: ShareLinkModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val share = intent
        if (share?.action != Intent.ACTION_SEND) {
            finish()
            return
        }
        model.handleOnce(
            context = applicationContext,
            text = share.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()
                ?: share.clipData?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.text?.toString(),
            subject = share.getStringExtra(Intent.EXTRA_SUBJECT),
            title = share.getCharSequenceExtra(Intent.EXTRA_TITLE)?.toString(),
            sender = SenderApp.pick(senderCandidates(), packageName),
        )
        setContent {
            SecondDraftTheme {
                val outcome by model.outcome.collectAsStateWithLifecycle()
                ShareLinkResult(outcome, onDone = ::finish)
            }
        }
    }

    /** Most trusted first: the identity the system confirms on newer Android, then the referrer. */
    private fun senderCandidates(): List<String?> {
        val confirmed = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) launchedFromPackage else null
        val referred = referrer?.let { SenderApp.fromReferrer(it.scheme, it.host) }
        return listOf(confirmed, referred)
    }
}

/** What the share target shows after a share. */
sealed interface ShareOutcome {
    data object Working : ShareOutcome
    data class Saved(val link: SharedLink) : ShareOutcome
    data object NoLink : ShareOutcome
    data object SourceOff : ShareOutcome
    data object Failed : ShareOutcome

    companion object {
        /** The outcome before anything is written: an off source records nothing, even a valid link. */
        fun before(sourceOn: Boolean, link: SharedLink?): ShareOutcome = when {
            !sourceOn -> SourceOff
            link == null -> NoLink
            else -> Saved(link)
        }
    }
}

/** Handles one share across configuration changes so a rotated screen does not record it twice. */
class ShareLinkModel : ViewModel() {
    private val state = MutableStateFlow<ShareOutcome>(ShareOutcome.Working)
    val outcome: StateFlow<ShareOutcome> = state
    private var handled = false

    fun handleOnce(context: Context, text: String?, subject: String?, title: String?, sender: String?) {
        if (handled) return
        handled = true
        viewModelScope.launch(Dispatchers.IO) {
            state.value = runCatching { record(context, text, subject, title, sender) }
                .onFailure { Log.w(TAG, "could not record a shared link", it) }
                .getOrDefault(ShareOutcome.Failed)
        }
    }

    private suspend fun record(context: Context, text: String?, subject: String?, title: String?, sender: String?): ShareOutcome {
        val graph = context.appGraph
        val collector = CollectorRegistry.forSource(SourceId.SAVED_LINK)
        val sourceOn = SourcePolicy.isOn(
            collector,
            graph.sourceSettings.current()[SourceId.SAVED_LINK],
            collector?.hasAccess(context) == true,
        )
        val outcome = ShareOutcome.before(sourceOn, SharedLinkParser.parse(text, subject, title))
        if (outcome is ShareOutcome.Saved) {
            graph.repository.record(SavedLinkItems.build(outcome.link, sender, text))
        }
        return outcome
    }

    private companion object {
        const val TAG = "ShareLink"
    }
}

@Composable
private fun ShareLinkResult(outcome: ShareOutcome, onDone: () -> Unit) {
    val (heading, body) = when (outcome) {
        ShareOutcome.Working -> return
        is ShareOutcome.Saved -> R.string.saved_link_saved to null
        ShareOutcome.NoLink -> R.string.saved_link_no_link to R.string.saved_link_no_link_body
        ShareOutcome.SourceOff -> R.string.saved_link_off to R.string.saved_link_off_body
        ShareOutcome.Failed -> R.string.saved_link_failed to R.string.saved_link_failed_body
    }
    AlertDialog(
        onDismissRequest = onDone,
        title = { Text(stringResource(heading)) },
        text = {
            if (outcome is ShareOutcome.Saved) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (outcome.link.title.isNotEmpty()) {
                        Text(outcome.link.title, style = MaterialTheme.typography.bodyLarge, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    }
                    Text(outcome.link.url, style = MaterialTheme.typography.bodyMedium, maxLines = 3, overflow = TextOverflow.Ellipsis)
                }
            } else if (body != null) {
                Text(stringResource(body))
            }
        },
        confirmButton = { TextButton(onClick = onDone) { Text(stringResource(R.string.saved_link_done)) } },
    )
}
