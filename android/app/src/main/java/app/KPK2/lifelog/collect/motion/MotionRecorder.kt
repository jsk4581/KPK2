package app.KPK2.lifelog.collect.motion

import app.KPK2.lifelog.data.LifelogRepository
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.time.ZoneId

/** Feeds delivered transitions through [BoutBuilder] and writes finished bouts to the lifelog. */
class MotionRecorder(
    private val store: MotionStateStore,
    private val repository: LifelogRepository,
    private val zone: () -> ZoneId = { ZoneId.systemDefault() },
) {
    /** Returns the number of items written. Batches are handled one at a time, in arrival order. */
    suspend fun accept(transitions: List<MotionTransition>): Int = lock.withLock {
        val step = BoutBuilder.advance(store.load(), transitions)
        // Items first: if the process dies before the state is saved, the batch is replayed and the
        // stable item ids turn the replay into an update.
        val written = repository.record(step.bouts.map { BoutBuilder.toItem(it, zone()) })
        store.save(step.state)
        written
    }

    private companion object {
        val lock = Mutex()
    }
}
