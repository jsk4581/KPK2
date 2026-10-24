package app.KPK2.lifelog

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import app.KPK2.lifelog.ui.AppShell
import app.KPK2.lifelog.ui.theme.SecondDraftTheme

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
}
