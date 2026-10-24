package app.KPK2.lifelog.collect.location

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.double
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import kotlinx.serialization.json.put

/**
 * The raw samples of a stay, kept in the item's device-only `raw` field as
 * `{"samples":[{"t":<millis>,"lat":<deg>,"lon":<deg>,"acc":<m or null>}]}`. Keeping them on the item
 * means deleting the item also deletes its coordinates.
 */
internal object SampleCodec {
    fun encode(samples: List<PlaceSample>): String = buildJsonObject {
        put(
            "samples",
            buildJsonArray {
                samples.forEach { s ->
                    add(
                        buildJsonObject {
                            put("t", s.timeMillis)
                            put("lat", s.lat)
                            put("lon", s.lon)
                            put("acc", s.accuracyM?.let { JsonPrimitive(it) } ?: JsonNull)
                        },
                    )
                }
            },
        )
    }.toString()

    /** The samples in [raw], or null when it is missing or not in the format above. */
    fun decode(raw: String?): List<PlaceSample>? {
        if (raw.isNullOrBlank()) return null
        return runCatching {
            val array: JsonArray = Json.parseToJsonElement(raw).jsonObject.getValue("samples").jsonArray
            array.map { element ->
                val o = element.jsonObject
                PlaceSample(
                    timeMillis = o.getValue("t").jsonPrimitive.long,
                    lat = o.getValue("lat").jsonPrimitive.double,
                    lon = o.getValue("lon").jsonPrimitive.double,
                    accuracyM = (o["acc"] as? JsonPrimitive)?.doubleOrNull?.toFloat(),
                )
            }
        }.getOrNull()?.takeIf { it.isNotEmpty() }
    }
}
