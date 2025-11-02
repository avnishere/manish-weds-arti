/**
 * Google Apps Script backend for Wedding Web App
 * Sheet: Guests (id, timestamp, name, phone, guests, 
 *               arrivalDate, arrivalMode, arrivalTime, arrivalNumber, arrivalLocation,
 *               departureDate, departureMode, departureTime, departureNumber, departureLocation,
 *               hotel, room, status, notes)
 *
 * Deploy Web App:
 *  - Execute as: Me
 *  - Who has access: Anyone
 *  - Use the URL that ends with /exec (NOT /dev)
 * Set ADMIN_PIN in Project Settings → Script Properties.
 */
const SHEET_NAME = 'Guests';
const CACHE = CacheService.getScriptCache();
const PROP  = PropertiesService.getScriptProperties();

function doGet(e) {
  return outJson({ ok: true, message: 'Use POST with {action}' });
}

function doPost(e) {
  try {
    const req = parseBody(e); // { action, pin, payload, token }
    const action = req.action || '';
    if (action === 'auth')   return auth(req);
    if (action === 'rsvp')   return rsvp(req);
    if (action === 'list')   return list(req);
    if (action === 'update') return updateRow(req);
    if (action === 'delete') return delRow(req);
    return outJson({ ok: false, error: 'Unknown action' }, 400);
  } catch (err) {
    return outJson({ ok: false, error: String(err) }, 500);
  }
}

/* Actions */
function auth(req) {
  const pin = (req.pin || '').trim();
  const adminPin = (PROP.getProperty('ADMIN_PIN') || '').trim();
  if (!adminPin) return outJson({ ok: false, error: 'ADMIN_PIN not set' }, 403);
  if (pin !== adminPin) return outJson({ ok: false, error: 'Invalid PIN' }, 401);
  const token = Utilities.getUuid();
  CACHE.put('t:' + token, '1', 60 * 60); // 1h
  return outJson({ ok: true, token });
}

function rsvp(req) {
  const g = req.payload || {};
  const sh = ensureSheet();
  const id = Utilities.getUuid();
  const ts = new Date();
  
  const row = [
    id, ts,
    g.name || '', 
    g.phone || '', 
    Number(g.guests || 1),
    
    // Arrival details
    g.arrivalDate || '', 
    g.arrivalMode || '', 
    g.arrivalTime || '', 
    g.arrivalNumber || '', 
    g.arrivalLocation || '',
    
    // Departure details
    g.departureDate || '', 
    g.departureMode || '', 
    g.departureTime || '', 
    g.departureNumber || '', 
    g.departureLocation || '',
    
    g.hotel || '', 
    g.room || '', 
    g.status || 'Pending', 
    g.notes || ''
  ];
  
  sh.appendRow(row);
  return outJson({ ok: true, id });
}

function list(req) {
  if (!isAuthed(req)) return outJson({ ok: false, error: 'Unauthorized' }, 401);
  const sh = ensureSheet();
  const values = sh.getDataRange().getValues();
  const rows = [];
  
  for (let i = 1; i < values.length; i++) {
    const [
      id, ts, name, phone, guests,
      arrivalDate, arrivalMode, arrivalTime, arrivalNumber, arrivalLocation,
      departureDate, departureMode, departureTime, departureNumber, departureLocation,
      hotel, room, status, notes
    ] = values[i];
    
    // Build arrival summary on-the-fly for admin table display
    const arrivalSummary = (arrivalDate + ' ' + arrivalTime).trim();
    
    rows.push({ 
      id, timestamp: ts, name, phone, guests, 
      
      // All detailed fields
      arrivalDate, arrivalMode, arrivalTime, arrivalNumber, arrivalLocation,
      departureDate, departureMode, departureTime, departureNumber, departureLocation,
      
      // For admin table display
      arrivalSummary,
      mode: arrivalMode, 
      number: arrivalNumber, 
      city: arrivalLocation,
      
      hotel, room, status, notes, 
      row: i + 1 
    });
  }
  return outJson({ ok: true, rows });
}

function updateRow(req) {
  if (!isAuthed(req)) return outJson({ ok: false, error: 'Unauthorized' }, 401);
  const p = req.payload || {};
  if (!p.id) return outJson({ ok: false, error: 'Missing id' }, 400);

  const sh = ensureSheet();
  const values = sh.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) if (values[i][0] === p.id) { rowIndex = i + 1; break; }
  if (rowIndex === -1) return outJson({ ok: false, error: 'ID not found' }, 404);

  // Simple column mapping - no duplication
  const map = { 
    name: 3, phone: 4, guests: 5,
    arrivalDate: 6, arrivalMode: 7, arrivalTime: 8, arrivalNumber: 9, arrivalLocation: 10,
    departureDate: 11, departureMode: 12, departureTime: 13, departureNumber: 14, departureLocation: 15,
    hotel: 16, room: 17, status: 18, notes: 19
  };
  
  Object.keys(map).forEach(k => { 
    if (k in p) {
      let value = p[k];
      if (k === 'guests' && value) value = Number(value);
      sh.getRange(rowIndex, map[k]).setValue(value);
    }
  });
  
  return outJson({ ok: true });
}

function delRow(req) {
  if (!isAuthed(req)) return outJson({ ok: false, error: 'Unauthorized' }, 401);
  const id = (req.id || '').trim();
  if (!id) return outJson({ ok: false, error: 'Missing id' }, 400);
  const sh = ensureSheet();
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === id) { sh.deleteRow(i + 1); return outJson({ ok: true }); }
  }
  return outJson({ ok: false, error: 'ID not found' }, 404);
}

/* Helpers */
function ensureSheet() {
  const ss = SpreadsheetApp.getActive();
  const SHEET_NAME_NEW = 'Guests'; // New sheet name to avoid conflicts
  let sh = ss.getSheetByName(SHEET_NAME_NEW);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME_NEW);
    // Clean header structure - no duplication
    sh.appendRow([
      'id', 'timestamp', 'name', 'phone', 'guests',
      'arrivalDate', 'arrivalMode', 'arrivalTime', 'arrivalNumber', 'arrivalLocation',
      'departureDate', 'departureMode', 'departureTime', 'departureNumber', 'departureLocation',
      'hotel', 'room', 'status', 'notes'
    ]);
  }
  return sh;
}

function isAuthed(req) {
  const token = (req && req.token) ? String(req.token) : '';
  if (!token) return false;
  return CACHE.get('t:' + token) === '1';
}

function parseBody(e) {
  // Try JSON body (text/plain or application/json)
  const raw = e && e.postData ? (e.postData.contents || '') : '';
  if (raw) {
    try { return JSON.parse(raw); } catch (err) {}
  }
  // Try form field ?data=...
  if (e && e.parameter && e.parameter.data) {
    try { return JSON.parse(e.parameter.data); } catch (err) {}
  }
  return {};
}

function outJson(obj, status) {
  // Apps Script doesn't let us set status easily; return JSON body only
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
