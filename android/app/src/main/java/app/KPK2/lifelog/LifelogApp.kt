package app.KPK2.lifelog

import android.app.Application
import android.content.Context
import app.KPK2.lifelog.data.LifelogDatabase
import app.KPK2.lifelog.data.LifelogRepository

class LifelogApp : Application() {
    val graph: AppGraph by lazy { AppGraph(this) }
}

/** Process-wide objects, created on first use. */
class AppGraph(context: Context) {
    private val database = LifelogDatabase.open(context)
    val repository = LifelogRepository(database.lifelogDao())
}

val Context.appGraph: AppGraph
    get() = (applicationContext as LifelogApp).graph
