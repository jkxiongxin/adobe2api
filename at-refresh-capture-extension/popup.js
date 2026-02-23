const KEY_ENABLED = "arc_enabled";
const KEY_LAST_BUNDLE = "arc_last_bundle";

const statusEl = document.getElementById("status");
const toggleBtn = document.getElementById("toggleBtn");
const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");

function getData(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function setData(data) {
  return new Promise((resolve) => chrome.storage.local.set(data, resolve));
}

function formatTime(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

async function refresh() {
  const data = await getData([KEY_ENABLED, KEY_LAST_BUNDLE]);
  const enabled = Boolean(data[KEY_ENABLED] ?? true);
  const bundle = data[KEY_LAST_BUNDLE] || null;

  toggleBtn.textContent = enabled ? "Pause" : "Resume";
  statusEl.textContent = `Status: ${enabled ? "Capturing" : "Paused"}\nLast capture: ${formatTime(bundle?.captured_at)}`;
}

async function toggleCapture() {
  const data = await getData([KEY_ENABLED]);
  const enabled = Boolean(data[KEY_ENABLED] ?? true);
  await setData({ [KEY_ENABLED]: !enabled });
  await refresh();
}

async function clearBundle() {
  await setData({ [KEY_LAST_BUNDLE]: null });
  await refresh();
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename, saveAs: true }, () => {
    URL.revokeObjectURL(url);
  });
}

async function exportBundle() {
  const data = await getData([KEY_LAST_BUNDLE]);
  const bundle = data[KEY_LAST_BUNDLE];
  if (!bundle) {
    alert("No captured refresh bundle yet. Please log in to Firefly first.");
    return;
  }
  if (!bundle?.endpoint?.headers?.Cookie) {
    alert("Captured data is missing Cookie header. Please retry login flow.");
    return;
  }
  const filename = `adobe-refresh-bundle-${Date.now()}.json`;
  downloadJson(filename, bundle);
}

toggleBtn.addEventListener("click", toggleCapture);
clearBtn.addEventListener("click", clearBundle);
exportBtn.addEventListener("click", exportBundle);

refresh();
