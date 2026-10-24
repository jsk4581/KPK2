package app.KPK2.lifelog.export

import app.KPK2.lifelog.data.LifelogItem
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.ZoneId

class LifelogExporterTest {

    private val link = LifelogItem(
        id = "saved_link-1",
        date = "2026-10-10",
        source = "saved_link",
        title = "Article on brand voice",
        summary = "Saved a piece on team voice drift.",
        tags = listOf("brand-voice"),
        url = "https://example.com/articles/voice",
        recordedAt = 1_791_600_000_000,
        raw = "{\"device\":\"only\"}",
    )
    private val note = LifelogItem(
        id = "note-1",
        date = "2026-10-09",
        source = "note",
        title = "Rate note",
        summary = "A polish-only job came in at a lower fee.",
        tags = emptyList(),
        url = null,
    )

    private fun exportedItems(vararg items: LifelogItem) =
        Json.parseToJsonElement(LifelogExporter.toJson(items.toList())).jsonObject

    @Test
    fun documentHasDeviceLabelAndItemsInGivenOrder() {
        val doc = exportedItems(link, note)
        assertEquals(setOf("_label", "items"), doc.keys)
        assertEquals("device", doc.getValue("_label").jsonPrimitive.content)
        val ids = doc.getValue("items").jsonArray.map { it.jsonObject.getValue("id").jsonPrimitive.content }
        assertEquals(listOf("saved_link-1", "note-1"), ids)
    }

    @Test
    fun eachItemCarriesExactlyTheSchemaFields() {
        val item = exportedItems(link).getValue("items").jsonArray.single().jsonObject
        assertEquals(LifelogExporter.ITEM_FIELDS, item.keys.toList())
        assertFalse("device-only fields must not be exported", "raw" in item || "recordedAt" in item)
        assertEquals("https://example.com/articles/voice", item.getValue("url").jsonPrimitive.content)
        assertEquals(listOf("brand-voice"), item.getValue("tags").jsonArray.map { it.jsonPrimitive.content })
    }

    @Test
    fun missingUrlIsWrittenAsJsonNullAndEmptyTagsAsEmptyArray() {
        val item = exportedItems(note).getValue("items").jsonArray.single().jsonObject
        assertTrue("url key must be present", "url" in item)
        assertEquals(JsonNull, item.getValue("url"))
        assertEquals(0, item.getValue("tags").jsonArray.size)
    }

    @Test
    fun datesAreCalendarDaysInIsoForm() {
        // 2026-10-11 02:30 UTC is still the evening of Oct 10 in New York: the item keeps the local day.
        val instant = 1_791_685_800_000
        assertEquals("2026-10-11", LifelogItem.dateOf(instant, ZoneId.of("UTC")))
        val evening = LifelogItem.dateOf(instant, ZoneId.of("America/New_York"))
        val item = link.copy(date = evening)
        val date = exportedItems(item).getValue("items").jsonArray.single().jsonObject.getValue("date").jsonPrimitive.content
        assertEquals("2026-10-10", date)
        assertTrue(Regex("""\d{4}-\d{2}-\d{2}""").matches(date))
    }

    @Test(expected = IllegalArgumentException::class)
    fun itemsRejectDatesOutsideTheSchemaFormat() {
        link.copy(date = "10/10/2026")
    }

    @Test
    fun emptyStoreExportsAnEmptyItemList() {
        assertEquals(0, exportedItems().getValue("items").jsonArray.size)
    }
}
