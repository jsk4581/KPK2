package app.KPK2.lifelog.collect.motion

import com.google.android.gms.common.ConnectionResult
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class MotionStatusTest {
    @Test
    fun playServicesCodesMapToAStatus() {
        assertEquals(MotionStatus.READY, MotionStatus.ofPlayServicesCode(ConnectionResult.SUCCESS))
        assertEquals(MotionStatus.PLAY_SERVICES_MISSING, MotionStatus.ofPlayServicesCode(ConnectionResult.SERVICE_MISSING))
        assertEquals(MotionStatus.PLAY_SERVICES_MISSING, MotionStatus.ofPlayServicesCode(ConnectionResult.SERVICE_INVALID))
        assertEquals(
            MotionStatus.PLAY_SERVICES_OUTDATED,
            MotionStatus.ofPlayServicesCode(ConnectionResult.SERVICE_VERSION_UPDATE_REQUIRED),
        )
        assertEquals(MotionStatus.PLAY_SERVICES_OUTDATED, MotionStatus.ofPlayServicesCode(ConnectionResult.SERVICE_UPDATING))
        assertEquals(MotionStatus.PLAY_SERVICES_DISABLED, MotionStatus.ofPlayServicesCode(ConnectionResult.SERVICE_DISABLED))
    }

    @Test
    fun onlyReadyShowsNoMessage() {
        assertNull(MotionStatus.READY.message)
        MotionStatus.entries.filter { it != MotionStatus.READY }.forEach { assert(it.message != null) }
    }
}
