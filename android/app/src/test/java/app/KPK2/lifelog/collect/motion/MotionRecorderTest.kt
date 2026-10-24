package app.KPK2.lifelog.collect.motion

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import app.KPK2.lifelog.data.LifelogDatabase
import app.KPK2.lifelog.data.LifelogRepository
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.time.ZoneId

@RunWith(RobolectricTestRunner::class)
class MotionRecorderTest {
    private lateinit var db: LifelogDatabase
    private lateinit var repo: LifelogRepository
    private val context: Context get() = ApplicationProvider.getApplicationContext()
    private val zone = ZoneId.of("UTC")

    // 2026-10-20T08:00:00Z, fictional.
    private val t0 = 1_792_483_200_000L
    private fun minutes(m: Int) = t0 + m * 60_000L

    @Before
    fun open() {
        db = Room.inMemoryDatabaseBuilder(context, LifelogDatabase::class.java).allowMainThreadQueries().build()
        repo = LifelogRepository(db.lifelogDao())
    }

    @After
    fun close() = db.close()

    @Test
    fun boutsSpanningBatchesAreRecordedOnceAndDeletedOnesStayDeleted() = runTest {
        val store = MotionStateStore(context)
        val recorder = MotionRecorder(store, repo) { zone }

        assertEquals(0, recorder.accept(listOf(MotionTransition(MotionActivity.WALKING, true, minutes(0)))))
        assertEquals(OpenBout(MotionActivity.WALKING, minutes(0)), MotionStateStore(context).load().open)

        val end = listOf(
            MotionTransition(MotionActivity.WALKING, false, minutes(18)),
            MotionTransition(MotionActivity.STILL, true, minutes(18)),
        )
        assertEquals(1, recorder.accept(end))
        assertEquals(0, recorder.accept(end))

        val item = repo.snapshot().single()
        assertEquals("motion-walking-${minutes(0)}", item.id)
        assertEquals("2026-10-20", item.date)
        assertEquals("Walking for 18 minutes.", item.summary)

        repo.delete(item.id)
        store.save(BoutState(OpenBout(MotionActivity.WALKING, minutes(0)), minutes(0)))
        assertEquals(0, recorder.accept(end))
        assertEquals(emptyList<Any>(), repo.snapshot())
    }

    @Test
    fun clearingTheBoutForgetsTheActivityInProgress() {
        val store = MotionStateStore(context)
        store.save(BoutState(OpenBout(MotionActivity.RUNNING, minutes(0)), minutes(0)))
        store.clearBout()
        assertEquals(BoutState(), store.load())
    }
}
