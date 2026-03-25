    import { state } from './state.js';
    import { calculateByBillTotal, validateCalculationInput } from './calculator.js';

    const GAS_URL = 'https://script.google.com/macros/s/AKfycbzW-Cv2scTGNwTv68xGhIpvYy5m0Hfn-bwWsLeRKdIRLnPuaooK8jRS4uiy6WTQnW4aXg/exec';
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
      unitPriceText: document.getElementById('unitPriceText'),
      summaryCard: document.getElementById('summaryCard'),
      groupTotalUsedText: document.getElementById('groupTotalUsedText'),
      billTotalText: document.getElementById('billTotalText'),
      groupTenantTotalText: document.getElementById('groupTenantTotalText')
    };

    function ensureAdminPassword() {
      if (adminPassword) return true;
    
      const input = prompt('請輸入管理密碼');
      if (!input) {
        showStatus('未輸入管理密碼。', 'warning');
        return false;
      }
    
      adminPassword = input.trim();
      sessionStorage.setItem('adminPassword', adminPassword);
      return true;
    }

    function showStatus(message, type = 'info') {
      el.statusBar.classList.remove(
        'hidden',
        'bg-blue-50', 'text-blue-700',
        'bg-red-50', 'text-red-700',
        'bg-green-50', 'text-green-700',
        'bg-amber-50', 'text-amber-700'
      );

      if (type === 'success') {
        el.statusBar.classList.add('bg-green-50', 'text-green-700');
      } else if (type === 'error') {
        el.statusBar.classList.add('bg-red-50', 'text-red-700');
      } else if (type === 'warning') {
        el.statusBar.classList.add('bg-amber-50', 'text-amber-700');
      } else {
        el.statusBar.classList.add('bg-blue-50', 'text-blue-700');
      }

      el.statusBar.textContent = message;
    }

    function normalizeAsset(item) {
      return {
        location: String(item.location || '').trim(),
        room: String(item.room || '').trim(),
        billGroup: String(item.billGroup || '').trim(),
        lastKwh: Number(item.lastKwh || 0),
        publicFee: Number(item.publicFee || 0)
      };
    }

    function normalizeLatest(item) {
      return {
        location: String(item.location || '').trim(),
        room: String(item.room || '').trim(),
        billGroup: String(item.billGroup || '').trim(),
        currentKwh: Number(item.currentKwh || item.lastKwh || 0),
        lastKwh: Number(item.lastKwh || 0),
        updatedAt: String(item.updatedAt || '').trim()
      };
    }

    async function fetchJson(url) {
      const response = await fetch(url, { method: 'GET' });
      const text = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} | ${text.slice(0, 200)}`);
      }

      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`JSON 解析失敗 | 回傳內容：${text.slice(0, 200)}`);
      }
    }

    async function loadCloudData() {
      try {
        const [assetsRes, latestRes] = await Promise.all([
          fetchJson(`${GAS_URL}?action=getAssets`),
          fetchJson(`${GAS_URL}?action=getLatestReadings`)
        ]);

        state.assets = Array.isArray(assetsRes.data) ? assetsRes.data.map(normalizeAsset) : [];
        state.latestReadings = Array.isArray(latestRes.data) ? latestRes.data.map(normalizeLatest) : [];

        renderLocations();
        resetBillGroups();
        clearGroupTable();
        showStatus('已成功從雲端載入資料。', 'success');
      } catch (error) {
        showStatus(`雲端讀取失敗：${error.message}`, 'error');
      }
    }

    function getUniqueLocations() {
      return [...new Set(
        state.assets
          .map(item => item.location)
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
    }

    function renderLocations() {
      el.locationSelect.innerHTML = '<option value="">請選擇地點</option>';

      getUniqueLocations().forEach(location => {
        const option = document.createElement('option');
        option.value = location;
        option.textContent = location;
        el.locationSelect.appendChild(option);
      });
    }

    function resetBillGroups() {
      el.billGroupSelect.innerHTML = '<option value="">請先選擇地點</option>';
      el.billGroupSelect.disabled = true;
    }

    function renderBillGroups(location) {
      const groups = [...new Set(
        state.assets
          .filter(item => item.location === location)
          .map(item => item.billGroup)
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b, 'zh-Hant'));

      el.billGroupSelect.innerHTML = '<option value="">請選擇帳單群組</option>';
      groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = group;
        el.billGroupSelect.appendChild(option);
      });

      el.billGroupSelect.disabled = false;
    }

    function getLatestReading(location, room, billGroup) {
      return state.latestReadings.find(item =>
        item.location === location &&
        item.room === room &&
        item.billGroup === billGroup
      ) || null;
    }

    function clearGroupTable() {
      state.selectedGroupRooms = [];
      state.calculationResult = null;
      el.groupTableBody.innerHTML = '';
      el.groupTableWrap.classList.add('hidden');
      el.emptyGroupText.classList.remove('hidden');
      el.roomCountText.textContent = '0';
      el.summaryCard.classList.add('hidden');
    }

    function renderGroupRooms() {
      const location = el.locationSelect.value;
      const billGroup = el.billGroupSelect.value;

      if (!location || !billGroup) {
        clearGroupTable();
        return;
      }

      const rooms = state.assets
        .filter(item => item.location === location && item.billGroup === billGroup)
        .sort((a, b) => String(a.room).localeCompare(String(b.room), 'zh-Hant', { numeric: true }))
        .map(item => {
          const latest = getLatestReading(item.location, item.room, item.billGroup);
          const previousKwh = latest ? Number(latest.currentKwh || latest.lastKwh || 0) : Number(item.lastKwh || 0);

          return {
            location: item.location,
            room: item.room,
            billGroup: item.billGroup,
            previousKwh,
            currentKwh: '',
            usedKwh: 0,
            publicFee: Number(item.publicFee || 0),
            usageAmount: 0,
            tenantAmount: 0
          };
        });

      state.selectedGroupRooms = rooms;
      state.calculationResult = null;

      el.groupTableBody.innerHTML = '';
      el.roomCountText.textContent = String(rooms.length);

      if (!rooms.length) {
        clearGroupTable();
        return;
      }

      rooms.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="px-4 py-3 border-b">${escapeHtml(item.room)}</td>
          <td class="px-4 py-3 border-b">${item.previousKwh}</td>
          <td class="px-4 py-3 border-b">
            <input
              type="number"
              min="0"
              step="1"
              class="group-current-kwh w-32 rounded-lg border border-slate-300 px-3 py-2"
              data-index="${index}"
              placeholder="輸入本期度數"
            />
          </td>
          <td class="px-4 py-3 border-b used-kwh-cell">0</td>
          <td class="px-4 py-3 border-b">${item.publicFee}</td>
          <td class="px-4 py-3 border-b usage-amount-cell">0</td>
          <td class="px-4 py-3 border-b tenant-amount-cell">0</td>
        `;
        el.groupTableBody.appendChild(row);
      });

      bindCurrentInputs();
      el.groupTableWrap.classList.remove('hidden');
      el.emptyGroupText.classList.add('hidden');
      el.summaryCard.classList.add('hidden');
    }
    
  function bindCurrentInputs() {
    document.querySelectorAll('.group-current-kwh').forEach(input => {
      input.addEventListener('input', () => {
        const index = Number(input.dataset.index);
        const current = Number(input.value || 0);
        const item = state.selectedGroupRooms[index];
        if (!item) return;
  
        item.currentKwh = input.value === '' ? '' : current;
        item.usedKwh = input.value === '' ? 0 : Math.max(0, current - item.previousKwh);
  
        const row = input.closest('tr');
        if (row) {
          row.querySelector('.used-kwh-cell').textContent = String(item.usedKwh);
        }
  
        if (el.billTotal.value !== '') {
          calculateGroup();
        }
      });
    });
  }

    function escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
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
        showStatus(errorMessage, 'error');
        return;
      }
    
      const groupTotalUsed = state.selectedGroupRooms.reduce(
        (sum, item) => sum + Number(item.usedKwh || 0),
        0
      );
    
      const result = calculateByBillTotal(billTotal, state.selectedGroupRooms, 0.1);
    
      if (!result) {
        showStatus('本組總用電必須大於 0。', 'error');
        return;
      }
    
      state.selectedGroupRooms = result.rooms;
    
      updateResultTable();
    
      state.calculationResult = {
        location,
        billGroup,
        billTotal,
        groupTotalUsed,
        unitPrice: result.unitPrice,
        remark: el.remark.value.trim(),
        items: state.selectedGroupRooms.map(item => ({ ...item }))
      };
    
      el.groupTotalUsedText.textContent = `${groupTotalUsed} 度`;
      el.billTotalText.textContent = `${Math.round(billTotal)} 元`;
      el.groupTenantTotalText.textContent = `${Math.round(result.total)} 元`;
      el.unitPriceText.textContent = `${result.unitPrice} 元`;
      el.summaryCard.classList.remove('hidden');
    
      showStatus(`整組計算完成，粗估每度 ${result.unitPrice} 元。`, 'success');
    }

    function updateResultTable() {
      const rows = el.groupTableBody.querySelectorAll('tr');
      rows.forEach((row, index) => {
        const item = state.selectedGroupRooms[index];
        if (!item) return;

        row.querySelector('.used-kwh-cell').textContent = String(item.usedKwh);
        row.querySelector('.usage-amount-cell').textContent = String(Math.round(item.usageAmount));
        row.querySelector('.tenant-amount-cell').textContent = String(Math.round(item.tenantAmount));
      });
    }

  async function syncGroupRecords() {
    if (!state.calculationResult || !state.calculationResult.items || !state.calculationResult.items.length) {
      showStatus('請先完成整組分攤計算。', 'error');
      return;
    }
  
    try {
      if (!ensureAdminPassword()) return;
      el.syncBtn.disabled = true;
      el.syncBtn.textContent = '同步中...';
  
      const currentLocation = state.calculationResult.location;
      const currentBillGroup = state.calculationResult.billGroup;
  
      for (const item of state.calculationResult.items) {
        const payload = {
          action: 'saveMeterRecord',
          adminPassword: adminPassword,
          location: item.location,
          room: item.room,
          billGroup: item.billGroup,
          previousKwh: item.previousKwh,
          currentKwh: item.currentKwh,
          usedKwh: item.usedKwh,
          billTotal: state.calculationResult.billTotal,
          publicFee: item.publicFee,
          usageAmount: Math.round(item.usageAmount),
          tenantAmount: Math.round(item.tenantAmount),
          remark: state.calculationResult.remark,
          createdAt: new Date().toISOString()
        };
  
        const response = await fetch(GAS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(payload)
        });
  
        const result = await response.json();
        if (result.success === false) {
          if (result.message && result.message.includes('管理密碼')) {
            adminPassword = '';
            sessionStorage.removeItem('adminPassword');
          }
          throw new Error(result.message || `同步房號 ${item.room} 失敗`);
        }
      }
  
      showStatus('整組抄表紀錄已成功同步。', 'success');
      await loadCloudData();
  
      el.locationSelect.value = currentLocation;
      renderBillGroups(currentLocation);
      el.billGroupSelect.value = currentBillGroup;
      renderGroupRooms();
    } catch (error) {
      showStatus(`同步失敗：${error.message}`, 'error');
    } finally {
      el.syncBtn.disabled = false;
      el.syncBtn.textContent = '同步整組抄表紀錄';
    }
  }

    function bindEvents() {
      el.locationSelect.addEventListener('change', () => {
        const location = el.locationSelect.value;
        if (!location) {
          resetBillGroups();
          clearGroupTable();
          return;
        }
        renderBillGroups(location);
        clearGroupTable();
      });

      el.billGroupSelect.addEventListener('change', renderGroupRooms);
      el.calculateBtn.addEventListener('click', calculateGroup);
      el.syncBtn.addEventListener('click', syncGroupRecords);
      el.reloadBtn.addEventListener('click', loadCloudData);
    }

    async function init() {
      bindEvents();
      await loadCloudData();
    }

    init();
