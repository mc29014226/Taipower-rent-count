export function calculateByBillTotal(targetTotal, rooms, step = 0.1) {
  const groupTotalUsed = rooms.reduce((sum, item) => sum + Number(item.usedKwh || 0), 0);

  if (groupTotalUsed <= 0) {
    return null;
  }

  let unitPrice = Number((targetTotal / groupTotalUsed).toFixed(1));
  let bestResult = null;

  for (let i = 0; i < 500; i++) {
    let total = 0;

    const calculatedRooms = rooms.map(item => {
      const usageAmount = Math.round(item.usedKwh * unitPrice);
      const tenantAmount = Math.round(usageAmount + item.publicFee);
      total += tenantAmount;

      return {
        ...item,
        usageAmount,
        tenantAmount
      };
    });

    bestResult = {
      unitPrice: Number(unitPrice.toFixed(1)),
      total,
      diff: total - targetTotal,
      rooms: calculatedRooms
    };

    if (total >= targetTotal) {
      break;
    }

    unitPrice = Number((unitPrice + step).toFixed(1));
  }

  return bestResult;
}

export function validateCalculationInput({ location, billGroup, billTotal, rooms }) {
  if (!location) {
    return '請先選擇地點。';
  }

  if (!billGroup) {
    return '請先選擇帳單群組。';
  }

  if (!rooms.length) {
    return '目前沒有可計算的房間資料。';
  }

  if (!Number.isFinite(billTotal) || billTotal < 0) {
    return '請輸入正確的台電總金額。';
  }

  for (const item of rooms) {
    if (item.currentKwh === '') {
      return `請輸入房號 ${item.room} 的本期度數。`;
    }
    if (Number(item.currentKwh) < Number(item.previousKwh)) {
      return `房號 ${item.room} 的本期度數不可小於上期度數。`;
    }
  }

  const groupTotalUsed = rooms.reduce((sum, item) => sum + Number(item.usedKwh || 0), 0);
  if (groupTotalUsed <= 0) {
    return '本組總用電必須大於 0。';
  }

  return '';
}
