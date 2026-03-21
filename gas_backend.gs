/**
 * Taipower Rent Count Backend v6.0
 * Sheets: assets, meter_records, latest_readings
 */
const SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getAssets') return jsonRes(getData('assets'));
  if (action === 'getLatestReadings') return jsonRes(getData('latest_readings'));
  if (action === 'getMeterRecords') return jsonRes(getData('meter_records'));
  return jsonRes({status:'error', msg:'Invalid action'});
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  if (action === 'saveAssets') return jsonRes(saveAssets(data.payload));
  if (action === 'saveMeterRecord') return jsonRes(saveMeterRecord(data.payload));
  return jsonRes({status:'error'});
}

function getData(sheetName) {
  const sheet = SPREADSHEET.getSheetByName(sheetName);
  if (!sheet) return [];
  const vals = sheet.getDataRange().getValues();
  const keys = vals.shift();
  return vals.map(row => {
    let obj = {};
    keys.forEach((k, i) => obj[k] = row[i]);
    return obj;
  });
}

function saveAssets(assets) {
  const sheet = getOrCreateSheet('assets', ['locationId','locationName','address','roomId','roomName','lastKwh','publicFee','note','updatedAt']);
  sheet.clearContents().appendRow(['locationId','locationName','address','roomId','roomName','lastKwh','publicFee','note','updatedAt']);
  assets.forEach(a => sheet.appendRow([a.locationId, a.locationName, a.address, a.roomId, a.roomName, a.lastKwh, a.publicFee, a.note, new Date()]));
  return {status:'ok'};
}

function saveMeterRecord(p) {
  const mr = getOrCreateSheet('meter_records', ['timestamp','period','locationId','locationName','address','roomId','roomName','previousKwh','currentKwh','usedKwh','billTotal','billKwh','unitPrice','publicFee','tenantAmount','note']);
  mr.appendRow([new Date(), p.period, p.locationId, p.locationName, p.address, p.roomId, p.roomName, p.previousKwh, p.currentKwh, p.usedKwh, p.billTotal, p.billKwh, p.unitPrice, p.publicFee, p.tenantAmount, p.note]);
  
  const lr = getOrCreateSheet('latest_readings', ['locationId','roomId','latestPeriod','latestKwh','updatedAt']);
  const data = lr.getDataRange().getValues();
  let found = false;
  for(let i=1; i<data.length; i++) {
    if(data[i][0] == p.locationId && data[i][1] == p.roomId) {
      lr.getRange(i+1, 3, 1, 3).setValues([[p.period, p.currentKwh, new Date()]]);
      found = true; break;
    }
  }
  if(!found) lr.appendRow([p.locationId, p.roomId, p.period, p.currentKwh, new Date()]);
  return {status:'ok'};
}

function getOrCreateSheet(name, headers) {
  let s = SPREADSHEET.getSheetByName(name);
  if(!s) { s = SPREADSHEET.insertSheet(name); s.appendRow(headers); }
  return s;
}

function jsonRes(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
