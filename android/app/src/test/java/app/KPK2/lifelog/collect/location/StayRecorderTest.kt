package app.KPK2.lifelog.collect.location

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
class StayRecorderTest {
    private lateinit var db: LifelogDatabase
    private lateinit var repo: LifelogRepository
    private lateinit var recorder: StayRecorder
    private val marker = object : OpenStayMarker {
        var id: String? = null
        override fun get() = id
        override fun set(id: String) { this.id = id }
    }
    private val t0 = 1_790_000_000_000L

    private fun at(minutes: Long, lat: Double = 40.1, lon: Double = -75.6) =
        PlaceSample(t0 + minutes * 60_000L, lat, lon, 15f)

    @Before
    fun open() {
        val context: Context = ApplicationProvider.getApplicationContext()
        db = Room.inMemoryDatabaseBuilder(context, LifelogDatabase::class.java).allowMainThreadQueries().build()
        repo = LifelogRepository(db.lifelogDao())
        recorder = StayRecorder(repo, marker) { ZoneOffset.UTC }
    }

    @After
    fun close() = db.close()

    @Test
    fun nearbySampleExtendsTheOpenStayAndAFarOneStartsANewStay() = runTest {
        recorder.add(at(0))
        recorder.add(at(30, lat = 40.1005))
        recorder.add(at(50, lat = 40.2))

        val items = repo.snapshot().sortedBy { it.id }
        assertEquals(listOf("location-stay-$t0", "location-stay-${t0 + 50 * 60_000L}"), items.map { it.id })
        assertEquals("30 min at 40.10, -75.60", items[0].summary)
        assertEquals("0 min at 40.20, -75.60", items[1].summary)
    }

    @Test
    fun aDeletedStayIsNeitherExtendedNorRecreated() = runTest {
        val first = recorder.add(at(0))!!
        repo.delete(first.id)
        recorder.add(at(20))

        val items = repo.snapshot()
        assertEquals(listOf("location-stay-${t0 + 20 * 60_000L}"), items.map { it.id })
        assertEquals("0 min at 40.10, -75.60", items.single().summary)
    }

    @Test
    fun afterDeleteAllRecordingStartsFresh() = runTest {
        recorder.add(at(0))
        recorder.add(at(10))
        repo.deleteAll()
        recorder.add(at(20))

        assertEquals(1, repo.snapshot().size)
        assertEquals(1, SampleCodec.decode(repo.snapshot().single().raw)!!.size)
    }
}
