import { state } from './state.js';
import { calculateByBillTotal, validateCalculationInput } from './calculator.js';
import { createUI } from './ui.js';
import { loadCloudData, syncGroupRecords } from './api.js';

let adminPassword = sessionStorage.getItem('adminPassword') || '';

const el = {
  locationSelect: document.getElementById('locationSelect'),
  billGroupSelect: document.getElementById('billGroupSelect'),
  billTotal: document.getElementById('billTotal'),
  remark: document.getElementById('remark'),
  calculateBtn: document.getElementById('calculateBtn'),
  syncBtn: document.getElementById('syncBtn'),
  reloadBtn: document.getElementById('reloadBtn'),
  statusBar: document.getElementById('statusBar'),
  roomCountText: document.getElementById('roomCountText'),
  emptyGroupText: document.getElementById('emptyGroupText'),
  groupTableWrap: document.getElementById('groupTableWrap'),
  groupTableBody: document.getElementById('groupTableBody'),
  summaryCard: document.getElementById('summaryCard'),
  groupTotalUsedText: document.getElementById('groupTotalUsedText'),
  billTotalText: document.getElementById('billTotalText'),
  groupTenantTotalText: document.getElementById('groupTenantTotalText'),
  unitPriceText: document.getElementById('unitPriceText')
};

const ui = createUI({
  state,
  el,
  onAutoRecalculate: () => calculateGroup()
});

function ensureAdminPassword() {
  if (adminPassword) return true;

  const input = prompt('請輸入管理密碼');
  if (!input) {
    ui.showStatus('未輸入管理密碼。', 'warning');
    return false;
  }

  adminPassword = input.trim();
  sessionStorage.setItem('adminPassword', adminPassword);
  return true;
}

async function loadCloudDataHandler() {
  try {
    const data = await loadCloudData();

    state.assets = data.assets;
    state.latestReadings = data.latestReadings;

    ui.renderLocations();
    ui.resetBillGroups();
    ui.clearGroupTable();

    ui.showStatus('已成功從雲端載入資料。', 'success');
  } catch (error) {
    ui.showStatus(`雲端讀取失敗：${error.message}`, 'error');
  }
}

function calculateGroup() {
  const location = el.locationSelect.value;
  const billGroup = el.billGroupSelect.value;
  const billTotal = Number(el.billTotal.value);

  const errorMessage = validateCalculationInput({
    location,
    billGroup,
    billTotal,
    rooms: state.selectedGroupRooms
  });

  if (errorMessage) {
    ui.showStatus(errorMessage, 'error');
    return;
  }

  const groupTotalUsed = state.selectedGroupRooms.reduce(
    (sum, item) => sum + Number(item.usedKwh || 0),
    0
  );

  const result = calculateByBillTotal(billTotal, state.selectedGroupRooms, 0.1);

  if (!result) {
    ui.showStatus('本組總用電必須大於 0。', 'error');
    return;
  }

  state.selectedGroupRooms = result.rooms;

  ui.updateResultTable();

  state.calculationResult = {
    location,
    billGroup,
    billTotal,
    groupTotalUsed,
    unitPrice: result.unitPrice,
    remark: el.remark.value.trim(),
    items: state.selectedGroupRooms.map(item => ({ ...item }))
  };

  ui.renderSummary({
    groupTotalUsed,
    billTotal,
    resultTotal: result.total,
    unitPrice: result.unitPrice
  });

  ui.showStatus(`整組計算完成，粗估每度 ${result.unitPrice} 元。`, 'success');
}

async function syncGroupRecordsHandler() {
  if (!state.calculationResult) {
    ui.showStatus('請先完成整組分攤計算。', 'error');
    return;
  }

  try {
    if (!ensureAdminPassword()) return;

    el.syncBtn.disabled = true;
    el.syncBtn.textContent = '同步中...';

    await syncGroupRecords(state.calculationResult, adminPassword);

    ui.showStatus('同步成功', 'success');
  } catch (error) {
    ui.showStatus(`同步失敗：${error.message}`, 'error');
  } finally {
    el.syncBtn.disabled = false;
    el.syncBtn.textContent = '同步整組抄表紀錄';
  }
}

function bindEvents() {
  el.locationSelect.addEventListener('change', () => {
    const location = el.locationSelect.value;

    if (!location) {
      ui.resetBillGroups();
      ui.clearGroupTable();
      return;
    }

    ui.renderBillGroups(location);
    ui.clearGroupTable();
  });

  el.billGroupSelect.addEventListener('change', ui.renderGroupRooms);
  el.calculateBtn.addEventListener('click', calculateGroup);
  el.syncBtn.addEventListener('click', syncGroupRecordsHandler);
  el.reloadBtn.addEventListener('click', loadCloudDataHandler);
}

async function init() {
  bindEvents();
  await loadCloudDataHandler();
}

init();
