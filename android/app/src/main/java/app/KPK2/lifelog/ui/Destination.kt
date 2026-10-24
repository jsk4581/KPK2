package app.KPK2.lifelog.ui

import androidx.annotation.StringRes
import app.KPK2.lifelog.R

/** The three top-level screens, in bottom bar order. */
enum class Destination(@param:StringRes val label: Int) {
    TIMELINE(R.string.tab_timeline),
    SOURCES(R.string.tab_sources),
    EXPORT(R.string.tab_export),
}
