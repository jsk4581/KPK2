package app.KPK2.lifelog.data

import androidx.room.TypeConverter
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive

/** Tags are stored as a JSON array in a single text column. */
class Converters {
    @TypeConverter
    fun tagsToText(tags: List<String>): String = JsonArray(tags.map(::JsonPrimitive)).toString()

    @TypeConverter
    fun textToTags(text: String): List<String> =
        Json.parseToJsonElement(text).jsonArray.map { it.jsonPrimitive.content }
}
