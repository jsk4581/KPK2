package app.KPK2.lifelog.sources

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import app.KPK2.lifelog.data.LifelogDatabase
import app.KPK2.lifelog.data.LifelogRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class CollectorRunnerTest {
    private lateinit var db: LifelogDatabase
    private lateinit var repo: LifelogRepository
    private val context: Context get() = ApplicationProvider.getApplicationContext()

    @Before
    fun open() {
        db = Room.inMemoryDatabaseBuilder(context, LifelogDatabase::class.java).allowMainThreadQueries().build()
        repo = LifelogRepository(db.lifelogDao())
    }

    @After
    fun close() = db.close()

    @Test
    fun startsActiveCollectorsStopsTheRestAndPullsOnlyActivePullers() = runTest {
        val settings = SourceSettings(context)
        val calendar = FakeCollector(SourceId.CALENDAR, pullsPeriodically = true)
        val sms = FakeCollector(SourceId.SMS, pullsPeriodically = true)
        val health = FakeCollector(SourceId.HEALTH, access = false, pullsPeriodically = true)
        settings.choose(SourceId.HEALTH, true)
        val runner = CollectorRunner(context, repo, settings, listOf(calendar, sms, health))

        runner.sync()
        assertEquals(1 to 0, calendar.starts to calendar.stops)
        assertEquals(0 to 1, sms.starts to sms.stops)
        assertEquals(0 to 1, health.starts to health.stops)

        assertEquals(1, runner.pullAll())
        assertEquals(listOf(1, 0, 0), listOf(calendar.pulls, sms.pulls, health.pulls))
        assertEquals(mapOf("calendar" to 1), repo.sourceStats.first().mapValues { it.value.count })
    }

    @Test
    fun aSourceTurnedOnBeforeAccessStartsOnTheFirstSyncAfterAccessIsGranted() = runTest {
        val settings = SourceSettings(context)
        val usage = FakeCollector(SourceId.APP_USAGE, access = false)
        settings.choose(SourceId.APP_USAGE, true)
        val runner = CollectorRunner(context, repo, settings, listOf(usage))

        runner.sync()
        assertEquals(0, usage.starts)

        // Granted on the system usage access screen; the app syncs when the person returns.
        usage.access = true
        runner.sync()
        assertEquals(1, usage.starts)
    }
}
