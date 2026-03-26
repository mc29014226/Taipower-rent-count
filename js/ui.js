export function createUI({ state, el, onAutoRecalculate }) {
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

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
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

    if (el.groupTotalUsedText) el.groupTotalUsedText.textContent = '0 度';
    if (el.billTotalText) el.billTotalText.textContent = '0 元';
    if (el.groupTenantTotalText) el.groupTenantTotalText.textContent = '0 元';
    if (el.unitPriceText) el.unitPriceText.textContent = '0 元';
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
          const usedCell = row.querySelector('.used-kwh-cell');
          if (usedCell) {
            usedCell.textContent = String(item.usedKwh);
          }
        }

        if (el.billTotal.value !== '' && typeof onAutoRecalculate === 'function') {
          onAutoRecalculate();
        }
      });
    });
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
      .sort((a, b) =>
        String(a.room).localeCompare(String(b.room), 'zh-Hant', { numeric: true })
      )
      .map(item => {
        const latest = getLatestReading(item.location, item.room, item.billGroup);
        const previousKwh = latest
          ? Number(latest.currentKwh || latest.lastKwh || 0)
          : Number(item.lastKwh || 0);

        return {
          location: item.location,
          room: item.room,
          billGroup: item.billGroup,
          previousKwh,
          currentKwh: previousKwh,
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
            value="${item.currentKwh}"
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

  function updateResultTable() {
    const rows = el.groupTableBody.querySelectorAll('tr');

    rows.forEach((row, index) => {
      const item = state.selectedGroupRooms[index];
      if (!item) return;

      const usedCell = row.querySelector('.used-kwh-cell');
      const usageAmountCell = row.querySelector('.usage-amount-cell');
      const tenantAmountCell = row.querySelector('.tenant-amount-cell');

      if (usedCell) usedCell.textContent = String(item.usedKwh);
      if (usageAmountCell) usageAmountCell.textContent = String(Math.round(item.usageAmount));
      if (tenantAmountCell) tenantAmountCell.textContent = String(Math.round(item.tenantAmount));
    });
  }

  function renderSummary({ groupTotalUsed, billTotal, resultTotal, unitPrice }) {
    el.groupTotalUsedText.textContent = `${groupTotalUsed} 度`;
    el.billTotalText.textContent = `${Math.round(billTotal)} 元`;
    el.groupTenantTotalText.textContent = `${Math.round(resultTotal)} 元`;
    el.unitPriceText.textContent = `${unitPrice} 元`;
    el.summaryCard.classList.remove('hidden');
  }

  return {
    showStatus,
    renderLocations,
    resetBillGroups,
    renderBillGroups,
    clearGroupTable,
    renderGroupRooms,
    updateResultTable,
    renderSummary,
    escapeHtml
  };
}
