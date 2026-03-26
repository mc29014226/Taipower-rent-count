const GAS_URL = 'https://script.google.com/macros/s/AKfycbzW-Cv2scTGNwTv68xGhIpvYy5m0Hfn-bwWsLeRKdIRLnPuaooK8jRS4uiy6WTQnW4aXg/exec';

export function normalizeAsset(item) {
  return {
    location: String(item.location || '').trim(),
    room: String(item.room || '').trim(),
    billGroup: String(item.billGroup || '').trim(),
    lastKwh: Number(item.lastKwh || 0),
    publicFee: Number(item.publicFee || 0)
  };
}

export function normalizeLatest(item) {
  return {
    location: String(item.location || '').trim(),
    room: String(item.room || '').trim(),
    billGroup: String(item.billGroup || '').trim(),
    currentKwh: Number(item.currentKwh || item.lastKwh || 0),
    lastKwh: Number(item.lastKwh || 0),
    updatedAt: String(item.updatedAt || '').trim()
  };
}

export async function fetchJson(url) {
  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`JSON解析失敗`);
  }
}

export async function loadCloudData() {
  const [assetsRes, latestRes] = await Promise.all([
    fetchJson(`${GAS_URL}?action=getAssets`),
    fetchJson(`${GAS_URL}?action=getLatestReadings`)
  ]);

  return {
    assets: Array.isArray(assetsRes.data)
      ? assetsRes.data.map(normalizeAsset)
      : [],
    latestReadings: Array.isArray(latestRes.data)
      ? latestRes.data.map(normalizeLatest)
      : []
  };
}

export async function syncGroupRecords(calculationResult, adminPassword) {
  if (!calculationResult || !calculationResult.items) {
    throw new Error('沒有可同步資料');
  }

  for (const item of calculationResult.items) {
    const payload = {
      action: 'saveMeterRecord',
      adminPassword,
      ...item,
      billTotal: calculationResult.billTotal
    };

    const response = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.success === false) {
      throw new Error(result.message || `同步房號 ${item.room} 失敗`);
    }
  }

  return true;
}
