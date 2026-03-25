const ADMIN_PASSWORD = "E220517781";

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";

  if (action === "getAssets") {
    return json({ data: getSheetObjects("assets") });
  }

  if (action === "getLatestReadings") {
    return json({ data: getSheetObjects("latest_readings") });
  }

  if (action === "getMeterRecords") {
    return json({ data: getSheetObjects("meter_records") });
  }

  return json({ data: [] });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ success: false, message: "缺少 POST 內容" });
    }

    const body = JSON.parse(e.postData.contents || "{}");
    const action = body.action || "";

    if (action === "saveAssets" || action === "saveMeterRecord") {
      validateAdminPassword(body.adminPassword);
    }

    if (action === "saveAssets") {
      const payload = Array.isArray(body.payload) ? body.payload : [];
      overwriteAssets(payload);
      return json({ success: true, message: "assets 已更新" });
    }

    if (action === "saveMeterRecord") {
      saveMeterRecord(body);
      return json({ success: true, message: "抄表紀錄已更新" });
    }

    return json({ success: false, message: "未知的 action" });
  } catch (err) {
    return json({
      success: false,
      message: err && err.message ? err.message : String(err)
    });
  }
}

function validateAdminPassword(inputPassword) {
  const password = String(inputPassword == null ? "" : inputPassword).trim();
  if (!password) {
    throw new Error("缺少管理密碼");
  }
  if (password !== ADMIN_PASSWORD) {
    throw new Error("管理密碼錯誤");
  }
}

function getSheetObjects(sheetName) {
  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sh) {
    throw new Error("找不到工作表：" + sheetName);
  }

  const values = sh.getDataRange().getValues();
  if (!values || values.length === 0) {
    return [];
  }

  const headers = values[0].map(function(h) {
    return String(h || "").trim();
  });

  if (headers.every(function(h) { return h === ""; })) {
    return [];
  }

  return values.slice(1).filter(function(row) {
    return row.some(function(cell) {
      return cell !== "" && cell !== null;
    });
  }).map(function(row) {
    const obj = {};
    headers.forEach(function(header, i) {
      obj[header] = row[i];
    });
    return obj;
  });
}

function overwriteAssets(payload) {
  const sh = SpreadsheetApp.getActive().getSheetByName("assets");
  if (!sh) {
    throw new Error("找不到工作表：assets");
  }

  const headers = getHeaders(sh);
  requireHeaders(headers, ["location", "room", "billGroup", "lastKwh", "publicFee"], "assets");

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();

  if (lastRow > 1 && lastCol > 0) {
    sh.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }

  if (!payload.length) {
    return;
  }

  const rows = payload.map(function(item) {
    const normalized = {
      location: safeString(item.location),
      room: safeString(item.room),
      billGroup: safeString(item.billGroup),
      lastKwh: safeNumber(item.lastKwh),
      publicFee: safeNumber(item.publicFee)
    };

    return headers.map(function(header) {
      return normalized.hasOwnProperty(header) ? normalized[header] : "";
    });
  });

  sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function saveMeterRecord(record) {
  const normalized = {
    location: safeString(record.location),
    room: safeString(record.room),
    billGroup: safeString(record.billGroup),
    previousKwh: safeNumber(record.previousKwh),
    currentKwh: safeNumber(record.currentKwh),
    usedKwh: safeNumber(record.usedKwh),
    billTotal: safeNumber(record.billTotal),
    publicFee: safeNumber(record.publicFee),
    usageAmount: safeNumber(record.usageAmount),
    tenantAmount: safeNumber(record.tenantAmount),
    remark: safeString(record.remark),
    createdAt: safeString(record.createdAt) || new Date().toISOString()
  };

  if (!normalized.location) throw new Error("location 不可空白");
  if (!normalized.room) throw new Error("room 不可空白");
  if (!normalized.billGroup) throw new Error("billGroup 不可空白");

  appendObjectByHeaders("meter_records", normalized);
  upsertLatestReading(normalized);
}

function upsertLatestReading(record) {
  const sh = SpreadsheetApp.getActive().getSheetByName("latest_readings");
  if (!sh) {
    throw new Error("找不到工作表：latest_readings");
  }

  const headers = getHeaders(sh);
  requireHeaders(headers, ["location", "room", "billGroup", "currentKwh", "lastKwh", "updatedAt"], "latest_readings");

  const values = sh.getDataRange().getValues();
  const locationIdx = headers.indexOf("location");
  const roomIdx = headers.indexOf("room");
  const billGroupIdx = headers.indexOf("billGroup");

  const latestObj = {
    location: record.location,
    room: record.room,
    billGroup: record.billGroup,
    currentKwh: record.currentKwh,
    lastKwh: record.currentKwh,
    updatedAt: record.createdAt || new Date().toISOString()
  };

  const rowData = headers.map(function(header) {
    return latestObj.hasOwnProperty(header) ? latestObj[header] : "";
  });

  let targetRow = -1;
  for (let i = 1; i < values.length; i++) {
    const rowLocation = String(values[i][locationIdx] || "").trim();
    const rowRoom = String(values[i][roomIdx] || "").trim();
    const rowBillGroup = String(values[i][billGroupIdx] || "").trim();

    if (
      rowLocation === record.location &&
      rowRoom === record.room &&
      rowBillGroup === record.billGroup
    ) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow > 0) {
    sh.getRange(targetRow, 1, 1, headers.length).setValues([rowData]);
  } else {
    sh.appendRow(rowData);
  }
}

function appendObjectByHeaders(sheetName, obj) {
  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sh) {
    throw new Error("找不到工作表：" + sheetName);
  }

  const headers = getHeaders(sh);
  if (!headers.length) {
    throw new Error(sheetName + " 缺少標題列");
  }

  const row = headers.map(function(header) {
    return obj.hasOwnProperty(header) ? obj[header] : "";
  });

  sh.appendRow(row);
}

function getHeaders(sh) {
  const lastCol = sh.getLastColumn();
  if (lastCol === 0) {
    return [];
  }

  return sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
    return String(h || "").trim();
  });
}

function requireHeaders(headers, requiredHeaders, sheetName) {
  requiredHeaders.forEach(function(header) {
    if (headers.indexOf(header) === -1) {
      throw new Error(sheetName + " 缺少欄位：" + header);
    }
  });
}

function safeString(value) {
  return String(value == null ? "" : value).trim();
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
