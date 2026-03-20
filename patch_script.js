window.onload = () => {
    const config = JSON.parse(localStorage.getItem("taipower_config") || "{}");
    const rooms = JSON.parse(localStorage.getItem("taipower_rooms") || "[]");
    const locationSelect = document.querySelector('select[label="房產地點"]') || document.querySelector('select');
    if (config.location) {
        locationSelect.innerHTML = `<option>${config.location}</option>`;
    }
    // 假設你有一個房間選擇器，這裡也一併初始化
    calculate(); 
};

function calculate() {
    const config = JSON.parse(localStorage.getItem("taipower_config") || "{}");
    let total = parseFloat(config.publicFee) || 0;
    const rooms = JSON.parse(localStorage.getItem("taipower_rooms") || "[]");
    rooms.forEach(r => {
        const used = (parseFloat(r.current) || 0) - (parseFloat(r.previous) || 0);
        total += used * (parseFloat(config.ratePerUnit) || 0);
    });
    const resEl = document.getElementById("result");
    if (resEl) resEl.innerText = `NT$ ${Math.round(total)}`;
    if (total > 5000) document.body.style.backgroundColor = "#450a0a";
}

async function syncToGAS() {
    const btn = document.getElementById("syncBtn");
    btn.innerText = "同步中...";
    try {
        const resp = await fetch("https://script.google.com/macros/s/AKfycbzW-Cv2scTGNwTv68xGhIpvYy5m0Hfn-bwWsLeRKdIRLnPuaooK8jRS4uiy6WTQnW4aXg/exec", {
            method: "POST",
            body: localStorage.getItem("taipower_rooms")
        });
        if (resp.ok) alert("✅ 同步成功！");
    } catch (e) {
        alert("❌ 同步失敗：" + e.message);
    } finally {
        if (btn) btn.innerText = "同步至雲端";
    }
}
