package app.KPK2.lifelog.export

import app.KPK2.lifelog.data.LifelogItem
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * Turns stored items into the JSON file the career brain reads:
 * `{"_label":"device","items":[...]}`, each item carrying exactly the shared schema fields.
 * Device-only fields (recorded time, raw detail) are left out.
 */
object LifelogExporter {
    const val LABEL = "device"

    /** The schema fields, in the order they are written. */
    val ITEM_FIELDS = listOf("id", "date", "source", "title", "summary", "tags", "url")

    private val json = Json { prettyPrint = true }

    fun toJson(items: List<LifelogItem>): String = json.encodeToString(JsonObject.serializer(), document(items))

    fun document(items: List<LifelogItem>): JsonObject = buildJsonObject {
        put("_label", LABEL)
        put("items", buildJsonArray { items.forEach { add(itemObject(it)) } })
    }

    private fun itemObject(item: LifelogItem): JsonObject = buildJsonObject {
        put("id", item.id)
        put("date", item.date)
        put("source", item.source)
        put("title", item.title)
        put("summary", item.summary)
        put("tags", JsonArray(item.tags.map(::JsonPrimitive)))
        put("url", item.url?.let(::JsonPrimitive) ?: JsonNull)
    }
}
