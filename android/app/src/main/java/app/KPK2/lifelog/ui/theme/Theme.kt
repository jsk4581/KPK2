package app.KPK2.lifelog.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Ink = Color(0xFF1F3A5F)
private val InkLight = Color(0xFFA9C7EE)

private val LightColors = lightColorScheme(primary = Ink, secondary = Color(0xFF52606D))
private val DarkColors = darkColorScheme(primary = InkLight, secondary = Color(0xFFB8C4CF))

@Composable
fun SecondDraftTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors,
        content = content,
    )
}
