/**
 * Taipower-rent-count Backend v1.0
 * 接收前端電費數據並寫入試算表
 */
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  
  // 按順序寫入：日期, 度數, 總額
  sheet.appendRow([
    data.date || new Date().toLocaleString(),
    data.kwh + ' 度',
    '$' + data.amount
  ]);
  
  return ContentService.createTextOutput('Success').setMimeType(ContentService.MimeType.TEXT);
}
