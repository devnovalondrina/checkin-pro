
// ==========================================================================================
// CODE FOR GOOGLE APPS SCRIPT
// ==========================================================================================
// 1. Create a new Google Sheet
// 2. Go to Extensions > Apps Script
// 3. Paste this code into Code.gs
// 4. Click Deploy > New Deployment > Select type: Web App
// 5. Set "Execute as" to "Me"
// 6. Set "Who has access" to "Anyone" (allows the app to access without login prompt)
// 7. Copy the "Web App URL" and provide it to the application
// ==========================================================================================

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  // Handle CORS
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const params = e.parameter;
    const action = params.action;
    const table = params.table;
    
    // Parse body if post
    let data = null;
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        // ignore
      }
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(table);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(table);
      // Initialize headers based on table type (optional, but good for first run)
      if (table === 'attendees') sheet.appendRow(['id', 'created_at', 'full_name', 'cpf', 'phone']);
      if (table === 'events') sheet.appendRow(['id', 'title', 'date', 'location', 'description', 'is_open']);
      if (table === 'registrations') sheet.appendRow(['id', 'attendee_id', 'event_id', 'checked_in', 'checkin_time']);
    }

    let result = {};

    if (action === 'read') {
      const rows = sheet.getDataRange().getValues();
      const headers = rows[0];
      const records = [];
      
      for (let i = 1; i < rows.length; i++) {
        const record = {};
        for (let j = 0; j < headers.length; j++) {
          record[headers[j]] = rows[i][j];
        }
        records.push(record);
      }
      result = { data: records, error: null };
    } 
    else if (action === 'insert') {
      const headers = sheet.getDataRange().getValues()[0];
      const newRows = Array.isArray(data) ? data : [data];
      const inserted = [];

      newRows.forEach(item => {
        const row = [];
        headers.forEach(header => {
          row.push(item[header] || '');
        });
        sheet.appendRow(row);
        inserted.push(item);
      });
      
      result = { data: inserted, error: null };
    }
    else if (action === 'update') {
      // Simple update by ID
      const id = params.id;
      const headers = sheet.getDataRange().getValues()[0];
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      
      let updated = null;
      
      // Find row with id (assuming id is first column or present)
      const idIndex = headers.indexOf('id');
      
      if (idIndex !== -1 && id) {
        for (let i = 1; i < values.length; i++) {
          if (String(values[i][idIndex]) === String(id)) {
            // Update fields
            const rowIndex = i + 1;
            Object.keys(data).forEach(key => {
              const colIndex = headers.indexOf(key);
              if (colIndex !== -1) {
                sheet.getRange(rowIndex, colIndex + 1).setValue(data[key]);
                values[i][colIndex] = data[key]; // update local for return
              }
            });
            updated = data;
            break;
          }
        }
      }
      result = { data: updated, error: null };
    }
    else if (action === 'delete') {
       const id = params.id;
       const headers = sheet.getDataRange().getValues()[0];
       const values = sheet.getDataRange().getValues();
       const idIndex = headers.indexOf('id');
       
       if (idIndex !== -1 && id) {
         for (let i = 1; i < values.length; i++) {
           if (String(values[i][idIndex]) === String(id)) {
             sheet.deleteRow(i + 1);
             break;
           }
         }
       }
       result = { error: null };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ error: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
