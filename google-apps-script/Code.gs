/**
 * RSVP — verificación de duplicados + envío a Google Forms
 * Tracking — aperturas de enlaces VIP por invitado
 *
 * INSTALACIÓN
 * ───────────
 * 1. En Google Forms → pestaña "Respuestas" → abrir la hoja de cálculo vinculada.
 * 2. En la hoja: Extensiones → Apps Script.
 * 3. Pega este archivo y configura SPREADSHEET_ID, FORM_ID y ENTRIES.
 *    SPREADSHEET_ID: en la URL de tu hoja de respuestas
 *    https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit
 * 4. Desplegar → Nueva implementación → Tipo: Aplicación web
 *      · Ejecutar como: Yo
 *      · Quién tiene acceso: Cualquier persona
 * 5. Copia la URL que termina en /exec → CONFIG.rsvpApiUrl en js/script.js
 *
 * APERTURAS
 * ─────────
 * Al abrir un enlace VIP se crea/actualiza la pestaña "Aperturas invitación"
 * con columnas: UUID | Nombre | Primera visita | Última visita | Veces
 */

/** ID de la hoja "Confirmación invitados (respuestas)" */
const SPREADSHEET_ID = '1ETYoLBnhhrM94AWzFq3rCWx5YKgZWjCnES07PMn6bUA';

const FORM_ID = '1FAIpQLSfhdPT-GcgcJjxaUU9lj_8yMBpUh6tVwicWNBRdak-GMLpJmw';

const ENTRIES = {
  name:      'entry.549910504',
  attending: 'entry.1191132342',
  guests:    'entry.847388862',
  message:   'entry.1990299819',
};

/** Texto exacto del encabezado de la columna del nombre en la fila 1 */
const NAME_HEADER = 'Nombre completo';

/** Pestaña donde se registran aperturas de enlaces VIP */
const OPENS_SHEET_NAME = 'Aperturas invitación';

function wrapRsvp_(result) {
  result.rsvp = true;
  return result;
}

function wrapTrack_(result) {
  result.track = true;
  return result;
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = params.action || 'check';
  const name = (params.name || '').trim();
  const callback = params.callback;

  let result;
  try {
    if (action === 'check') {
      if (!name) result = wrapRsvp_({ error: 'missing_name' });
      else result = wrapRsvp_({ alreadySubmitted: nameExists_(name) });
    } else if (action === 'track_open') {
      const uuid = (params.uuid || '').trim();
      const guestName = (params.name || '').trim();
      if (!uuid) result = wrapTrack_({ error: 'missing_uuid' });
      else {
        trackOpen_(uuid, guestName);
        result = wrapTrack_({ ok: true });
      }
    } else {
      result = wrapRsvp_({ error: 'unknown_action' });
    }
  } catch (err) {
    result = action === 'track_open'
      ? wrapTrack_({ error: String(err.message || err) })
      : wrapRsvp_({ error: String(err.message || err) });
  }

  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(result) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return json_(result);
}

function doPost(e) {
  let payload = {};
  try {
    payload = parsePayload_(e);
  } catch (err) {
    return json_({ ok: false, error: 'invalid_json' });
  }

  const action = payload.action || 'submit';
  const name = (payload.name || '').trim();

  if (action === 'check') {
    if (!name) return json_({ error: 'missing_name' });
    try {
      return json_({ alreadySubmitted: nameExists_(name) });
    } catch (err) {
      return json_({ error: String(err.message || err) });
    }
  }

  if (!name) return json_({ ok: false, error: 'missing_name' });

  try {
    if (nameExists_(name)) {
      return json_({ ok: false, alreadySubmitted: true });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }

  try {
    postToGoogleForm_(payload);
    return json_(wrapRsvp_({ ok: true }));
  } catch (err) {
    return json_(wrapRsvp_({ ok: false, error: String(err.message || err) }));
  }
}

function parsePayload_(e) {
  const params = (e && e.parameter) || {};
  const raw = params.payload || (e.postData && e.postData.contents) || '';
  return JSON.parse(raw);
}

function getResponseSheet_() {
  const ss = getSpreadsheet_();
  return ss.getSheets()[0];
}

function nameExists_(name) {
  const sheet = getResponseSheet_();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  let nameCol = headers.findIndex(h => String(h).trim() === NAME_HEADER);
  if (nameCol === -1) {
    nameCol = headers.findIndex(h => String(h).toLowerCase().includes('nombre'));
  }
  if (nameCol === -1) {
    throw new Error('No se encontró la columna "' + NAME_HEADER + '" en la hoja de respuestas');
  }

  const normalized = normalizeName_(name);
  if (!normalized) return false;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  const names = sheet.getRange(2, nameCol + 1, lastRow, nameCol + 1).getValues();
  return names.some(row => normalizeName_(row[0]) === normalized);
}

function normalizeName_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getSpreadsheet_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;

  if (!SPREADSHEET_ID || SPREADSHEET_ID === 'REEMPLAZA_CON_TU_SPREADSHEET_ID') {
    throw new Error('Configura SPREADSHEET_ID en Código.gs con el ID de tu hoja de respuestas');
  }

  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getOpensSheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(OPENS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(OPENS_SHEET_NAME);
    sheet.appendRow(['UUID', 'Nombre', 'Primera visita', 'Última visita', 'Veces']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function trackOpen_(uuid, name) {
  const sheet = getOpensSheet_();
  const normalizedUuid = String(uuid).trim().toLowerCase();
  const now = new Date();
  const lastRow = sheet.getLastRow();

  if (lastRow >= 2) {
    const rows = sheet.getRange(2, 1, lastRow, 5).getValues();

    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).trim().toLowerCase() !== normalizedUuid) continue;

      const rowNum = i + 2;
      const visits = (Number(rows[i][4]) || 0) + 1;

      if (name) sheet.getRange(rowNum, 2).setValue(name);
      sheet.getRange(rowNum, 4).setValue(now);
      sheet.getRange(rowNum, 5).setValue(visits);
      return;
    }
  }

  sheet.appendRow([normalizedUuid, name, now, now, 1]);
}

function postToGoogleForm_(data) {
  const url = 'https://docs.google.com/forms/d/e/' + FORM_ID + '/formResponse';
  const payload = {};
  payload[ENTRIES.name] = data.name;
  payload[ENTRIES.attending] = data.attending;
  payload[ENTRIES.guests] = data.guests;
  if (data.message) payload[ENTRIES.message] = data.message;

  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    payload: payload,
    muteHttpExceptions: true,
    followRedirects: true,
  });

  const code = res.getResponseCode();
  if (code >= 400) {
    throw new Error('Error al enviar al formulario: HTTP ' + code);
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
