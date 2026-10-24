package app.KPK2.lifelog.collect.device

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
import java.time.ZoneOffset

@RunWith(RobolectricTestRunner::class)
class DeviceCollectorTest {
    private lateinit var db: LifelogDatabase
    private lateinit var repo: LifelogRepository
    private val context: Context get() = ApplicationProvider.getApplicationContext()

    private var state = DeviceState(charging = false, battery = BatteryBand.FULL, doNotDisturb = false, headphones = false)
    private var now = 1_792_400_000_000L

    private fun collector() = DeviceCollector(read = { state }, clock = { now }, zone = { ZoneOffset.UTC })

    @Before
    fun open() {
        db = Room.inMemoryDatabaseBuilder(context, LifelogDatabase::class.java).allowMainThreadQueries().build()
        repo = LifelogRepository(db.lifelogDao())
    }

    @After
    fun close() = db.close()

    @Test
    fun recordsTheFirstReadingThenOnlyChanges() = runTest {
        val collector = collector()

        assertEquals(1, collector.pull(context, repo))
        now += 15 * 60_000
        assertEquals(0, collector.pull(context, repo))

        state = state.copy(headphones = true)
        now += 15 * 60_000
        assertEquals(1, collector.pull(context, repo))

        // A new collector instance (a new app process) remembers the last state on the device.
        now += 15 * 60_000
        assertEquals(0, collector().pull(context, repo))

        val items = repo.snapshot()
        assertEquals(2, items.size)
        assertEquals(
            "On battery, battery 80% or more, Do Not Disturb off, headphones connected",
            items.first().summary,
        )
    }
}
