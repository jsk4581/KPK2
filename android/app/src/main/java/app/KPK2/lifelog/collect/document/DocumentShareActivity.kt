package app.KPK2.lifelog.collect.document

import android.app.Application
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.getValue
import androidx.compose.ui.res.stringResource
import androidx.core.content.IntentCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.KPK2.lifelog.R
import app.KPK2.lifelog.ui.theme.SecondDraftTheme
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * Share target: another app sends one file (ACTION_SEND with EXTRA_STREAM) and it is added as a
 * document. Shows the outcome in a small dialog over the sending app, then closes.
 */
class DocumentShareActivity : ComponentActivity() {
    private val model: ShareAddModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        model.addOnce(intent)
        setContent {
            SecondDraftTheme {
                val result by model.result.collectAsStateWithLifecycle()
                val done = result
                AlertDialog(
                    onDismissRequest = { finish() },
                    title = { Text(stringResource(R.string.document_add_title)) },
                    text = {
                        Text(if (done == null) stringResource(R.string.document_adding) else describe(resources, done))
                    },
                    confirmButton = {
                        TextButton(onClick = { finish() }) { Text(stringResource(R.string.document_ok)) }
                    },
                )
            }
        }
    }
}

/** Runs the add once per share, so turning the phone mid-add does not add again. */
class ShareAddModel(application: Application) : AndroidViewModel(application) {
    private val _result = MutableStateFlow<AddResult?>(null)
    val result: StateFlow<AddResult?> = _result
    private var started = false

    fun addOnce(intent: Intent) {
        if (started) return
        started = true
        val app = getApplication<Application>()
        val stream = if (intent.action == Intent.ACTION_SEND) {
            IntentCompat.getParcelableExtra(intent, Intent.EXTRA_STREAM, Uri::class.java)
        } else {
            null
        }
        if (stream == null) {
            _result.value = AddResult.NoFile
            return
        }
        viewModelScope.launch {
            _result.value = DocumentImporter.forApp(app).add(app.contentResolver, stream, intent.type)
        }
    }
}
