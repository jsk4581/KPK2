package app.KPK2.lifelog.collect.health

import androidx.health.connect.client.records.ExerciseSessionRecord as Session

/** Plain English names for Health Connect exercise types. Types not listed here read as "workout". */
object ExerciseKinds {
    private val labels: Map<Int, String> = mapOf(
        Session.EXERCISE_TYPE_WALKING to "walking",
        Session.EXERCISE_TYPE_HIKING to "hiking",
        Session.EXERCISE_TYPE_RUNNING to "running",
        Session.EXERCISE_TYPE_RUNNING_TREADMILL to "treadmill running",
        Session.EXERCISE_TYPE_BIKING to "cycling",
        Session.EXERCISE_TYPE_BIKING_STATIONARY to "indoor cycling",
        Session.EXERCISE_TYPE_SWIMMING_POOL to "pool swimming",
        Session.EXERCISE_TYPE_SWIMMING_OPEN_WATER to "open water swimming",
        Session.EXERCISE_TYPE_STRENGTH_TRAINING to "strength training",
        Session.EXERCISE_TYPE_WEIGHTLIFTING to "weightlifting",
        Session.EXERCISE_TYPE_CALISTHENICS to "calisthenics",
        Session.EXERCISE_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING to "interval training",
        Session.EXERCISE_TYPE_YOGA to "yoga",
        Session.EXERCISE_TYPE_PILATES to "pilates",
        Session.EXERCISE_TYPE_STRETCHING to "stretching",
        Session.EXERCISE_TYPE_ELLIPTICAL to "elliptical",
        Session.EXERCISE_TYPE_ROWING_MACHINE to "rowing machine",
        Session.EXERCISE_TYPE_ROWING to "rowing",
        Session.EXERCISE_TYPE_STAIR_CLIMBING_MACHINE to "stair machine",
        Session.EXERCISE_TYPE_DANCING to "dancing",
        Session.EXERCISE_TYPE_TENNIS to "tennis",
        Session.EXERCISE_TYPE_BADMINTON to "badminton",
        Session.EXERCISE_TYPE_BASKETBALL to "basketball",
        Session.EXERCISE_TYPE_SOCCER to "soccer",
        Session.EXERCISE_TYPE_GOLF to "golf",
        Session.EXERCISE_TYPE_MARTIAL_ARTS to "martial arts",
        Session.EXERCISE_TYPE_ROCK_CLIMBING to "climbing",
        Session.EXERCISE_TYPE_SKIING to "skiing",
        Session.EXERCISE_TYPE_SNOWBOARDING to "snowboarding",
    )

    fun label(exerciseType: Int): String = labels[exerciseType] ?: "workout"
}
