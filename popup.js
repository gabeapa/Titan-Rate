async function load() {
  const { enabled } = await chrome.storage.local.get("enabled");
  updateToggle(enabled !== false);

  document.getElementById("toggle").addEventListener("click", async () => {
    const isOn = document.getElementById("toggle").classList.contains("on");
    await chrome.storage.local.set({ enabled: !isOn });
    updateToggle(!isOn);
  });
}

function updateToggle(on) {
  document.getElementById("toggle").className = "toggle" + (on ? " on" : "");
  document.getElementById("status-dot").className = "status-dot" + (on ? "" : " off");
  document.getElementById("status-text").textContent = on ? "Active on CSUF portal" : "Paused";
}

load();
