package app.KPK2.lifelog.collect.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateGroupByPeriodRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.Period
import kotlin.reflect.KClass

/** The part of Health Connect the health source uses. Tests pass a fake; the app uses [HealthConnectReader]. */
interface HealthReader {
    suspend fun grantedPermissions(): Set<String>

    /** Step totals per local day from the start of [from] until [until]; Health Connect merges overlapping apps. */
    suspend fun dailySteps(from: LocalDate, until: LocalDateTime): Map<LocalDate, Long>

    suspend fun sleepSessions(from: Instant, until: Instant): List<SleepSpan>

    suspend fun exerciseSessions(from: Instant, until: Instant): List<ExerciseSpan>
}

/** Whether Health Connect can be used on this phone, from `HealthConnectClient.getSdkStatus`. */
enum class HealthConnectStatus { AVAILABLE, NEEDS_INSTALL_OR_UPDATE, UNAVAILABLE }

object HealthConnectAccess {
    /** Package of the Health Connect app on Android 13 and lower. */
    const val PROVIDER_PACKAGE = "com.google.android.apps.healthdata"

    fun status(context: Context): HealthConnectStatus = when (
        runCatching { HealthConnectClient.getSdkStatus(context, PROVIDER_PACKAGE) }
            .getOrDefault(HealthConnectClient.SDK_UNAVAILABLE)
    ) {
        HealthConnectClient.SDK_AVAILABLE -> HealthConnectStatus.AVAILABLE
        HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> HealthConnectStatus.NEEDS_INSTALL_OR_UPDATE
        else -> HealthConnectStatus.UNAVAILABLE
    }

    /** A client only when Health Connect is usable; never throws. */
    fun clientOrNull(context: Context): HealthConnectClient? =
        if (status(context) != HealthConnectStatus.AVAILABLE) null
        else runCatching { HealthConnectClient.getOrCreate(context, PROVIDER_PACKAGE) }.getOrNull()

    /** True when this phone's Health Connect lets apps read while in the background. */
    fun backgroundReadSupported(client: HealthConnectClient): Boolean = runCatching {
        client.features.getFeatureStatus(HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND) ==
            HealthConnectFeatures.FEATURE_STATUS_AVAILABLE
    }.getOrDefault(false)
}

class HealthConnectReader(private val client: HealthConnectClient) : HealthReader {

    override suspend fun grantedPermissions(): Set<String> = client.permissionController.getGrantedPermissions()

    override suspend fun dailySteps(from: LocalDate, until: LocalDateTime): Map<LocalDate, Long> {
        val start = from.atStartOfDay()
        if (!until.isAfter(start)) return emptyMap()
        val groups = client.aggregateGroupByPeriod(
            AggregateGroupByPeriodRequest(
                metrics = setOf(StepsRecord.COUNT_TOTAL),
                timeRangeFilter = TimeRangeFilter.between(start, until),
                timeRangeSlicer = Period.ofDays(1),
            ),
        )
        return groups.mapNotNull { group ->
            group.result[StepsRecord.COUNT_TOTAL]?.let { group.startTime.toLocalDate() to it }
        }.toMap()
    }

    override suspend fun sleepSessions(from: Instant, until: Instant): List<SleepSpan> =
        readAll(SleepSessionRecord::class, from, until).map { record ->
            SleepSpan(record.startTime, record.endTime, asleepMinutes(record))
        }

    override suspend fun exerciseSessions(from: Instant, until: Instant): List<ExerciseSpan> =
        readAll(ExerciseSessionRecord::class, from, until).map { record ->
            ExerciseSpan(record.startTime, record.endTime, record.exerciseType)
        }

    private suspend fun <T : Record> readAll(type: KClass<T>, from: Instant, until: Instant): List<T> {
        if (!until.isAfter(from)) return emptyList()
        val out = mutableListOf<T>()
        var pageToken: String? = null
        var pages = 0
        do {
            val response = client.readRecords(
                ReadRecordsRequest(
                    recordType = type,
                    timeRangeFilter = TimeRangeFilter.between(from, until),
                    pageSize = PAGE_SIZE,
                    pageToken = pageToken,
                ),
            )
            out += response.records
            pageToken = response.pageToken
            pages++
        } while (pageToken != null && pages < MAX_PAGES)
        return out
    }

    companion object {
        private const val PAGE_SIZE = 500
        private const val MAX_PAGES = 20

        private val ASLEEP_STAGES = setOf(
            SleepSessionRecord.STAGE_TYPE_SLEEPING,
            SleepSessionRecord.STAGE_TYPE_LIGHT,
            SleepSessionRecord.STAGE_TYPE_DEEP,
            SleepSessionRecord.STAGE_TYPE_REM,
        )

        /** Time in sleep stages when the writing app recorded stages, otherwise the whole session. */
        fun asleepMinutes(record: SleepSessionRecord): Long {
            if (record.stages.isEmpty()) return Duration.between(record.startTime, record.endTime).toMinutes()
            return record.stages.filter { it.stage in ASLEEP_STAGES }
                .sumOf { Duration.between(it.startTime, it.endTime).toMillis() } / 60_000L
        }
    }
}
