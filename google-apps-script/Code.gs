/**
 * RSVP — verificación de duplicados + envío a Google Forms
 *
 * INSTALACIÓN
 * ───────────
 * 1. En Google Forms → pestaña "Respuestas" → abrir la hoja de cálculo vinculada.
 * 2. En la hoja: Extensiones → Apps Script.
 * 3. Pega este archivo, revisa FORM_ID, ENTRIES y NAME_HEADER.
 * 4. Desplegar → Nueva implementación → Tipo: Aplicación web
 *      · Ejecutar como: Yo
 *      · Quién tiene acceso: Cualquier persona
 * 5. Copia la URL que termina en /exec → CONFIG.rsvpApiUrl en js/script.js
 *
 * IMPORTANTE: el script debe estar vinculado a la MISMA hoja donde llegan
 * las respuestas del formulario (SpreadsheetApp.getActiveSpreadsheet()).
 */

const FORM_ID = '1FAIpQLSfhdPT-GcgcJjxaUU9lj_8yMBpUh6tVwicWNBRdak-GMLpJmw';

const ENTRIES = {
  name:      'entry.549910504',
  attending: 'entry.1191132342',
  guests:    'entry.847388862',
  message:   'entry.1990299819',
};

/** Texto exacto del encabezado de la columna del nombre en la fila 1 */
const NAME_HEADER = 'Nombre completo';

function doGet(e) {
  const action = e.parameter.action || 'check';
  const name = (e.parameter.name || '').trim();
  const callback = e.parameter.callback;

  let result;
  if (action === 'check') {
    if (!name) result = { error: 'missing_name' };
    else result = { alreadySubmitted: nameExists_(name) };
  } else {
    result = { error: 'unknown_action' };
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
    return json_({ alreadySubmitted: nameExists_(name) });
  }

  if (!name) return json_({ ok: false, error: 'missing_name' });

  if (nameExists_(name)) {
    return json_({ ok: false, alreadySubmitted: true });
  }

  try {
    postToGoogleForm_(payload);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function parsePayload_(e) {
  const raw = (e.parameter && e.parameter.payload) || (e.postData && e.postData.contents) || '';
  return JSON.parse(raw);
}

function nameExists_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
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
