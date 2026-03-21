function doGet(e){
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";

  if(action=="getAssets"){
    return json({data: getSheet("assets")});
  }

  if(action=="getMeterRecords"){
    return json({data: getSheet("meter_records")});
  }

  if(action=="getLatestReadings"){
    return json({data: getSheet("latest_readings")});
  }

  return json([]);
}

function doPost(e){
  const body=JSON.parse(e.postData.contents);

  if(body.action=="saveAssets"){
    write("assets", body.payload);
  }

function doGet(e){
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";

  if(action == "getAssets"){
    return json({ data: getSheet("assets") });
  }

  if(action == "getMeterRecords"){
    return json({ data: getSheet("meter_records") });
  }

  if(action == "getLatestReadings"){
    return json({ data: getSheet("latest_readings") });
  }

  return json({ data: [] });
}

function doPost(e){
  const body = JSON.parse(e.postData.contents);

  if(body.action == "saveAssets"){
    overwriteSheet("assets", body.payload);
  }

  if(body.action == "saveMeterRecord"){
    appendRowByHeaders("meter_records", body);
    upsertLatestReading(body);
  }

  return json({ success: true });
}

function getSheet(name){
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  const values = sh.getDataRange().getValues();

  if (!values || values.length === 0) return [];

  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}

function overwriteSheet(name, data){
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();

  if (lastRow > 1) {
    sh.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }

  if (!Array.isArray(data) || data.length === 0) return;

  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  const rows = data.map(item => headers.map(h => item[h] ?? ""));
  sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function appendRowByHeaders(name, obj){
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const row = headers.map(h => obj[h] ?? "");
  sh.appendRow(row);
}

function upsertLatestReading(record){
  const sh = SpreadsheetApp.getActive().getSheetByName("latest_readings");
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const values = sh.getDataRange().getValues();

  const locationIdx = headers.indexOf("location");
  const roomIdx = headers.indexOf("room");

  if (locationIdx === -1 || roomIdx === -1) {
    throw new Error('latest_readings 缺少 location 或 room 欄位');
  }

  let targetRow = -1;
  for (let i = 1; i < values.length; i++) {
    if (
      String(values[i][locationIdx]).trim() === String(record.location).trim() &&
      String(values[i][roomIdx]).trim() === String(record.room).trim()
    ) {
      targetRow = i + 1;
      break;
    }
  }

  const latestObj = {
    location: record.location,
    room: record.room,
    currentKwh: record.currentKwh,
    lastKwh: record.currentKwh,
    updatedAt: record.createdAt || new Date().toISOString()
  };

  const row = headers.map(h => latestObj[h] ?? "");

  if (targetRow > 0) {
    sh.getRange(targetRow, 1, 1, headers.length).setValues([row]);
  } else {
    sh.appendRow(row);
  }
}

function json(o){
  return ContentService
    .createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

  return json({ok:true});
}

function getSheet(name){
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  const values = sh.getDataRange().getValues();

  if (!values || values.length === 0) return [];

  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}

function write(name, data){
  const sh = SpreadsheetApp.getActive().getSheetByName(name);

  if(Array.isArray(data)){
    data.forEach(r => sh.appendRow(Object.values(r)));
  } else {
    sh.appendRow(Object.values(data));
  }
}

function json(o){
  return ContentService.createTextOutput(JSON.stringify(o))
  .setMimeType(ContentService.MimeType.JSON);
}
