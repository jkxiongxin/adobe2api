const KEY_ENABLED = "arc_enabled";
const KEY_LAST_BUNDLE = "arc_last_bundle";

const TARGET_PREFIX = "https://adobeid-na1.services.adobe.com/ims/check/v6/token";
const pending = new Map();
let enabled = true;

function loadEnabled() {
  chrome.storage.local.get([KEY_ENABLED], (data) => {
    enabled = Boolean(data[KEY_ENABLED] ?? true);
  });
}

function isTargetUrl(url) {
  return typeof url === "string" && url.startsWith(TARGET_PREFIX);
}

function shouldCapture(url) {
  return enabled && isTargetUrl(url);
}

function toHeaderMap(headers) {
  const out = {};
  if (!Array.isArray(headers)) return out;
  for (const item of headers) {
    if (!item || !item.name) continue;
    out[item.name] = item.value ?? "";
  }
  return out;
}

function pickHeaders(headers) {
  const out = {};
  const wanted = [
    "Cookie",
    "Origin",
    "Referer",
    "User-Agent",
    "Accept-Language",
    "Content-Type",
    "content-type"
  ];
  for (const key of wanted) {
    if (headers[key]) {
      const normalized = key === "content-type" ? "Content-Type" : key;
      out[normalized] = headers[key];
    }
  }
  if (!out["Content-Type"]) {
    out["Content-Type"] = "application/x-www-form-urlencoded;charset=UTF-8";
  }
  return out;
}

function toFormData(body) {
  if (!body || !body.formData) return null;
  const out = {};
  const keys = ["client_id", "guest_allowed", "scope"];
  for (const key of keys) {
    const value = body.formData[key];
    if (Array.isArray(value) && value.length > 0) {
      out[key] = String(value[0]);
    }
  }
  if (!out.client_id || !out.scope) return null;
  if (!out.guest_allowed) out.guest_allowed = "true";
  return out;
}

function storeBundle(requestEntry, responseEntry) {
  const headers = pickHeaders(requestEntry.requestHeaders || {});
  const form = requestEntry.form || null;
  if (!headers.Cookie || !form) return;

  const payload = {
    type: "adobe_refresh_bundle",
    version: 1,
    sensitive: true,
    captured_at: new Date().toISOString(),
    endpoint: {
      url: requestEntry.url,
      method: "POST",
      form,
      headers
    },
    response: {
      status_code: responseEntry?.statusCode ?? 0,
      headers: responseEntry?.responseHeaders || {}
    }
  };

  chrome.storage.local.set({ [KEY_LAST_BUNDLE]: payload });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (!(KEY_ENABLED in changes)) return;
  enabled = Boolean(changes[KEY_ENABLED].newValue ?? true);
});

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (!shouldCapture(details.url)) return;
    pending.set(details.requestId, {
      ...(pending.get(details.requestId) || {}),
      url: details.url,
      form: toFormData(details.requestBody)
    });
  },
  { urls: ["https://adobeid-na1.services.adobe.com/*"] },
  ["requestBody"]
);

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (!shouldCapture(details.url)) return;
    pending.set(details.requestId, {
      ...(pending.get(details.requestId) || {}),
      url: details.url,
      requestHeaders: toHeaderMap(details.requestHeaders)
    });
  },
  { urls: ["https://adobeid-na1.services.adobe.com/*"] },
  ["requestHeaders", "extraHeaders"]
);

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (!isTargetUrl(details.url)) return;
    pending.set(details.requestId, {
      ...(pending.get(details.requestId) || {}),
      responseHeaders: toHeaderMap(details.responseHeaders),
      statusCode: details.statusCode || 0
    });
  },
  { urls: ["https://adobeid-na1.services.adobe.com/*"] },
  ["responseHeaders", "extraHeaders"]
);

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (!isTargetUrl(details.url)) return;
    const entry = pending.get(details.requestId);
    pending.delete(details.requestId);
    if (!entry) return;
    storeBundle(entry, {
      statusCode: details.statusCode || entry.statusCode || 0,
      responseHeaders: entry.responseHeaders || {}
    });
  },
  { urls: ["https://adobeid-na1.services.adobe.com/*"] }
);

loadEnabled();
