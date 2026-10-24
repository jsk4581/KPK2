/**
 * Hackathon Google Sheet Data Layer (Apps Script Web App)
 *
 * SECURITY WARNING:
 * Web App URLs deployed to execute "as me" and accessible to "anyone" are
 * completely public endpoints. Anyone with the URL can read and append rows.
 * This sheet MUST hold synthetic data only (label == 'synthetic').
 * Never store real names, emails, phone numbers, credentials, or personal data.
 *
 * Reference: https://developers.google.com/apps-script/guides/web
 */

var MAX_BODY_BYTES = 10240; // 10KB limit for incoming POST payloads

/**
 * Handles HTTP GET requests.
 * Query params:
 *   - sheet: target sheet name (defaults to the first sheet in the spreadsheet)
 *   - limit: maximum number of data rows to return (optional, positive integer)
 *
 * @param {Object} e Apps Script event object.
 * @return {TextOutput} JSON response containing header keys and row objects.
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var sheet = getTargetSheet_(params.sheet);
    if (!sheet) {
      return jsonResponse_({ ok: false, error: 'Sheet not found' });
    }

    var values = sheet.getDataRange().getValues();
    if (values.length === 0) {
      return jsonResponse_({ ok: true, sheet: sheet.getName(), rows: [] });
    }

    var headers = values[0].map(function(h) {
      return String(h).trim();
    });
    var dataRows = values.slice(1);

    if (params.limit !== undefined) {
      var limit = parseInt(params.limit, 10);
      if (!isNaN(limit) && limit >= 0) {
        dataRows = dataRows.slice(0, limit);
      }
    }

    var rows = dataRows.map(function(row) {
      var obj = {};
      for (var i = 0; i < headers.length; i++) {
        if (headers[i]) {
          obj[headers[i]] = row[i];
        }
      }
      return obj;
    });

    return jsonResponse_({
      ok: true,
      sheet: sheet.getName(),
      rows: rows
    });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err.message || err) });
  }
}

/**
 * Handles HTTP POST requests.
 * Parses a JSON body (max 10KB) and appends one row ordered by the sheet header row.
 * Optional query param ?sheet=<name> or JSON field "sheet" selects the target sheet.
 *
 * @param {Object} e Apps Script event object.
 * @return {TextOutput} JSON response with { ok: true, row: <row_number> }.
 */
function doPost(e) {
  try {
    var rawBody = (e && e.postData && e.postData.contents) ? e.postData.contents : '';
    if (!rawBody) {
      return jsonResponse_({ ok: false, error: 'Empty request body' });
    }

    var byteLength = Utilities.newBlob(rawBody).getBytes().length;
    if (byteLength > MAX_BODY_BYTES) {
      return jsonResponse_({ ok: false, error: 'Payload exceeds 10KB limit' });
    }

    var payload = JSON.parse(rawBody);
    var params = (e && e.parameter) ? e.parameter : {};
    var sheetName = params.sheet || payload.sheet;
    var sheet = getTargetSheet_(sheetName);
    if (!sheet) {
      return jsonResponse_({ ok: false, error: 'Sheet not found' });
    }

    var lastCol = sheet.getLastColumn();
    if (lastCol === 0) {
      return jsonResponse_({ ok: false, error: 'Sheet has no header row' });
    }

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
      return String(h).trim();
    });

    var record = payload.data && typeof payload.data === 'object' ? payload.data : payload;
    var newRow = headers.map(function(key) {
      if (key === 'label' && (record[key] === undefined || record[key] === '')) {
        return 'synthetic';
      }
      if (key === 'updated_at' && (record[key] === undefined || record[key] === '')) {
        return new Date().toISOString();
      }
      return record[key] !== undefined ? record[key] : '';
    });

    sheet.appendRow(newRow);
    var appendedRowIndex = sheet.getLastRow();

    return jsonResponse_({
      ok: true,
      row: appendedRowIndex
    });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err.message || err) });
  }
}

/**
 * Creates or resets the 'demo' sheet with a standard header row and 5 synthetic rows.
 * Run this function once manually from the Apps Script editor before deploying.
 */
function seedSyntheticSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = 'demo';
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }

  var headers = ['id', 'user', 'goal', 'status', 'updated_at', 'label'];
  var rows = [
    ['syn-001', 'agent_alpha', 'Complete prototype wireframe', 'done', '2026-10-20T09:00:00Z', 'synthetic'],
    ['syn-002', 'agent_bravo', 'Connect static frontend to Sheet API', 'in_progress', '2026-10-20T09:15:00Z', 'synthetic'],
    ['syn-003', 'agent_charlie', 'Write synthetic dataset generator', 'done', '2026-10-20T09:30:00Z', 'synthetic'],
    ['syn-004', 'agent_delta', 'Prepare 3-minute pitch deck', 'todo', '2026-10-20T09:45:00Z', 'synthetic'],
    ['syn-005', 'agent_echo', 'Verify mobile viewport layout', 'in_progress', '2026-10-20T10:00:00Z', 'synthetic']
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

/**
 * Resolves a sheet by name or falls back to the first sheet in the spreadsheet.
 *
 * @param {string=} sheetName Optional sheet name.
 * @return {Sheet} Matching Google Sheet or first sheet.
 * @private
 */
function getTargetSheet_(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (sheetName) {
    return ss.getSheetByName(String(sheetName));
  }
  var sheets = ss.getSheets();
  return sheets.length > 0 ? sheets[0] : null;
}

/**
 * Builds a JSON TextOutput response.
 *
 * @param {Object} data Serializable response payload.
 * @return {TextOutput} Apps Script JSON output.
 * @private
 */
function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
