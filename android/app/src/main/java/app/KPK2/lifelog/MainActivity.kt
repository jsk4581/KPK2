package app.KPK2.lifelog

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import app.KPK2.lifelog.ui.AppShell
import app.KPK2.lifelog.ui.theme.SecondDraftTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SecondDraftTheme {
                AppShell()
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // Usage access and notification access are granted on system screens, outside the app. Apply
        // whatever changed there as soon as the person comes back, not only on the next cold start.
        val graph = appGraph
        graph.appScope.launch { graph.runner.sync() }
    }
}
