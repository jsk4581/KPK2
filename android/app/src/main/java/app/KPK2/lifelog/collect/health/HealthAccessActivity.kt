package app.KPK2.lifelog.collect.health

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.lifecycleScope
import app.KPK2.lifelog.R
import app.KPK2.lifelog.appGraph
import app.KPK2.lifelog.ui.theme.SecondDraftTheme
import kotlinx.coroutines.launch

/**
 * Health Connect access for the Health source. Opened from the Sources screen, it asks Health Connect
 * for the read permissions, or says plainly why it cannot (not installed, needs an update, not
 * supported on this phone). Health Connect also opens it to show the privacy explanation, which it
 * requires before it lists the app.
 */
class HealthAccessActivity : ComponentActivity() {

    private sealed interface Screen {
        data object Asking : Screen
        data object Unavailable : Screen
        data object NeedsInstall : Screen
        data object Denied : Screen
        data class Granted(val types: Set<HealthType>) : Screen
        data object Rationale : Screen
    }

    private var screen by mutableStateOf<Screen>(Screen.Asking)
    private var requestInFlight = false

    private val permissionRequest = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract(HealthConnectAccess.PROVIDER_PACKAGE),
    ) { granted -> onResult(granted) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        requestInFlight = savedInstanceState?.getBoolean(KEY_IN_FLIGHT) ?: false
        if (intent?.action in RATIONALE_ACTIONS) screen = Screen.Rationale
        setContent { SecondDraftTheme { Content() } }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putBoolean(KEY_IN_FLIGHT, requestInFlight)
    }

    override fun onResume() {
        super.onResume()
        // Re-checked on every return, so coming back from installing Health Connect continues the request.
        if (screen == Screen.Asking || screen == Screen.NeedsInstall) evaluate()
    }

    private fun evaluate() {
        when (HealthConnectAccess.status(this)) {
            HealthConnectStatus.UNAVAILABLE -> screen = Screen.Unavailable
            HealthConnectStatus.NEEDS_INSTALL_OR_UPDATE -> screen = Screen.NeedsInstall
            HealthConnectStatus.AVAILABLE -> request()
        }
    }

    private fun request() {
        if (requestInFlight) return
        val client = HealthConnectAccess.clientOrNull(this) ?: run { screen = Screen.Unavailable; return }
        val permissions = HealthType.readPermissions +
            if (HealthConnectAccess.backgroundReadSupported(client)) setOf(HealthType.BACKGROUND_PERMISSION) else emptySet()
        screen = Screen.Asking
        requestInFlight = true
        try {
            permissionRequest.launch(permissions)
        } catch (e: ActivityNotFoundException) {
            requestInFlight = false
            screen = Screen.Unavailable
        }
    }

    private fun onResult(granted: Set<String>) {
        val graph = applicationContext.appGraph
        lifecycleScope.launch {
            // The result only lists what was granted in this request; ask Health Connect for the full set.
            val all = HealthConnectAccess.clientOrNull(this@HealthAccessActivity)
                ?.let { client -> runCatching { client.permissionController.getGrantedPermissions() }.getOrNull() }
                ?: granted
            HealthPullState(this@HealthAccessActivity).grantedPermissions = all
            val types = HealthType.grantedIn(all)
            screen = if (types.isEmpty()) Screen.Denied else Screen.Granted(types)
            // Cleared only now, so the onResume that follows the result does not ask a second time.
            requestInFlight = false
            // Starts the collector when access arrived, which also queues the first pull.
            graph.appScope.launch { graph.runner.sync() }
        }
    }

    private fun openHealthConnect() {
        val manage = HealthConnectClient.getHealthConnectManageDataIntent(this, HealthConnectAccess.PROVIDER_PACKAGE)
        if (!launch(manage)) screen = Screen.Unavailable
    }

    private fun openStore() {
        val onboarding = Uri.encode("healthconnect://onboarding")
        val market = Intent(Intent.ACTION_VIEW)
            .setPackage("com.android.vending")
            .setData("market://details?id=${HealthConnectAccess.PROVIDER_PACKAGE}&url=$onboarding".toUri())
            .putExtra("overlay", true)
            .putExtra("callerId", packageName)
        val web = Intent(
            Intent.ACTION_VIEW,
            "https://play.google.com/store/apps/details?id=${HealthConnectAccess.PROVIDER_PACKAGE}".toUri(),
        )
        if (!launch(market) && !launch(web)) screen = Screen.Unavailable
    }

    private fun launch(intent: Intent): Boolean = try {
        startActivity(intent)
        true
    } catch (e: ActivityNotFoundException) {
        false
    }

    @Composable
    private fun Content() {
        Surface(Modifier.fillMaxSize()) {
            Column(
                Modifier.safeDrawingPadding().padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                when (val current = screen) {
                    Screen.Rationale -> {
                        Heading(stringResource(R.string.health_rationale_title))
                        Body(stringResource(R.string.health_rationale_body))
                        Close()
                    }
                    Screen.Asking -> {
                        Heading(stringResource(R.string.health_access_title))
                        Body(stringResource(R.string.health_access_asking))
                    }
                    Screen.Unavailable -> {
                        Heading(stringResource(R.string.health_access_title))
                        Body(stringResource(R.string.health_access_unavailable))
                        Close()
                    }
                    Screen.NeedsInstall -> {
                        Heading(stringResource(R.string.health_access_title))
                        Body(stringResource(R.string.health_access_needs_install))
                        Button(onClick = ::openStore) { Text(stringResource(R.string.health_access_install)) }
                        Close()
                    }
                    Screen.Denied -> {
                        Heading(stringResource(R.string.health_access_title))
                        Body(stringResource(R.string.health_access_denied))
                        Button(onClick = ::request) { Text(stringResource(R.string.health_access_try_again)) }
                        OutlinedButton(onClick = ::openHealthConnect) {
                            Text(stringResource(R.string.health_access_open_health_connect))
                        }
                        Close()
                    }
                    is Screen.Granted -> {
                        Heading(stringResource(R.string.health_access_title))
                        Body(stringResource(R.string.health_access_granted, HealthStatus.typeList(current.types)))
                        Close()
                    }
                }
            }
        }
    }

    @Composable
    private fun Heading(text: String) = Text(text, style = MaterialTheme.typography.headlineSmall)

    @Composable
    private fun Body(text: String) = Text(text, style = MaterialTheme.typography.bodyLarge)

    @Composable
    private fun Close() = OutlinedButton(onClick = ::finish) { Text(stringResource(R.string.health_access_close)) }

    companion object {
        /** Health Connect's privacy explanation request, before and after Android 14. */
        private val RATIONALE_ACTIONS = setOf(
            "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE",
            Intent.ACTION_VIEW_PERMISSION_USAGE,
        )

        private const val KEY_IN_FLIGHT = "request_in_flight"

        fun intent(context: Context): Intent = Intent(context, HealthAccessActivity::class.java)
    }
}
