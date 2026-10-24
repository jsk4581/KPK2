package app.KPK2.lifelog

import android.app.Application
import android.content.Context
import app.KPK2.lifelog.collect.document.DocumentStore
import app.KPK2.lifelog.data.LifelogDatabase
import app.KPK2.lifelog.data.LifelogRepository
import app.KPK2.lifelog.sources.CollectorRunner
import app.KPK2.lifelog.sources.PullWorker
import app.KPK2.lifelog.sources.SourceSettings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class LifelogApp : Application() {
    val graph: AppGraph by lazy { AppGraph(this) }

    override fun onCreate() {
        super.onCreate()
        graph.appScope.launch { graph.runner.sync() }
        PullWorker.schedule(this)
    }
}

/** Process-wide objects, created on first use. */
class AppGraph(context: Context) {
    val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val database = LifelogDatabase.open(context)
    val repository = LifelogRepository(database.lifelogDao())
    val sourceSettings = SourceSettings(context)
    val runner = CollectorRunner(context.applicationContext, repository, sourceSettings)
    val deleter = ItemDeleter(repository, DocumentStore.forApp(context.applicationContext))
}

val Context.appGraph: AppGraph
    get() = (applicationContext as LifelogApp).graph
