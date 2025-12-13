// background.js (updated)
// Background service worker for DeceptiTech extension
console.log("DeceptiTech background service worker loaded");

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log("DeceptiTech extension installed:", details.reason);

  // Set default settings
  chrome.storage.sync.set({
    autoScan: true,
    showNotifications: true,
    scanInterval: 5000,
    confidenceThreshold: 0.6
  });
});

// -------------------------
// Helper: perform fetch to localhost from background
// -------------------------
async function callLocalNLP(path, body, timeoutMs = 5000) {
  const url = `http://127.0.0.1:8001${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      const text = await resp.text().catch(()=>"");
      throw new Error(`HTTP ${resp.status} - ${resp.statusText} ${text}`);
    }
    const data = await resp.json();
    return { ok: true, data };
  } catch (err) {
    clearTimeout(timeout);
    console.error("[background] callLocalNLP error:", err && err.message ? err.message : err);
    return { ok: false, error: String(err) };
  }
}

// -------------------------
// Handle messages from content scripts
// -------------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request && request.type);

  (async () => {
    try {
      switch (request.type) {

        // Existing handlers you already had
        case 'DARK_PATTERN_DETECTED':
          handleDarkPatternDetection(request.data, sender);
          sendResponse({ success: true });
          return;

        case 'SCAN_REQUEST':
          handleScanRequest(request.data, sender, sendResponse);
          return true; // Keep message channel open for async response

        case 'GET_SETTINGS':
          chrome.storage.sync.get(null, (settings) => {
            sendResponse(settings);
          });
          return true;

        case 'UPDATE_SETTINGS':
          chrome.storage.sync.set(request.settings, () => {
            sendResponse({ success: true });
          });
          return true;

        // NEW: verification via background (fixes PNA/CORS)
        case 'VERIFY_PATTERNS':
          {
            // request.payload should be an array of patterns to verify
            const payload = Array.isArray(request.payload) ? request.payload : [];
            console.log(`[background] VERIFY_PATTERNS: received ${payload.length} patterns`);
            // Server expects {patterns: [...]} format
            const body = { patterns: payload };
            // allow longer timeout for verification
            const res = await callLocalNLP('/verify-patterns', body, 15000);
            if (res.ok) {
              console.log(`[background] VERIFY_PATTERNS: success, returned ${res.data?.verified?.length || 0} verified patterns`);
              sendResponse({ success: true, data: res.data });
            } else {
              console.error(`[background] VERIFY_PATTERNS: failed - ${res.error}`);
              sendResponse({ success: false, error: res.error });
            }
            return;
          }

        // NEW: generate description via background
        case 'GENERATE_DESCRIPTION':
          {
            const payload = request.payload || {};
            console.log(`[background] GENERATE_DESCRIPTION: sending payload:`, { category: payload.category, textLength: payload.text?.length });
            const res = await callLocalNLP('/generate-description', payload, 15000); // Increased timeout
            if (res.ok) {
              console.log(`[background] GENERATE_DESCRIPTION: success, response:`, res.data);
              sendResponse({ success: true, data: res.data });
            } else {
              console.error(`[background] GENERATE_DESCRIPTION: failed - ${res.error}`);
              sendResponse({ success: false, error: res.error });
            }
            return;
          }

        // NEW: update dataset via background
        case 'UPDATE_DATASET':
          {
            const payload = Array.isArray(request.payload) ? request.payload : [];
            console.log(`[background] UPDATE_DATASET: received ${payload.length} patterns`);
            const body = { patterns: payload };
            const res = await callLocalNLP('/update-dataset', body, 10000);
            if (res.ok) {
              console.log(`[background] UPDATE_DATASET: success, added ${res.data?.added || 0}, skipped ${res.data?.skipped || 0}`);
              sendResponse({ success: true, data: res.data });
            } else {
              console.error(`[background] UPDATE_DATASET: failed - ${res.error}`);
              sendResponse({ success: false, error: res.error });
            }
            return;
          }

        // Handle new patterns detected during monitoring
        case 'NEW_PATTERNS_DETECTED':
          {
            const count = request.count || 0;
            const patterns = request.patterns || [];
            if (count > 0 && patterns.length > 0) {
              // Show Chrome notification
              try {
                chrome.notifications.create({
                  type: 'basic',
                  iconUrl: chrome.runtime.getURL('assets/icon.png'),
                  title: 'DeceptiTech: New Dark Patterns Detected',
                  message: `Found ${count} new dark pattern${count > 1 ? 's' : ''} on this page`
                }, (notificationId) => {
                  if (chrome.runtime.lastError) {
                    console.warn("[background] Notification creation failed:", chrome.runtime.lastError);
                  }
                });
              } catch (err) {
                console.warn("[background] Notification error:", err);
              }
              
              // Update badge with total count
              chrome.storage.local.get(['totalPatternCount'], (result) => {
                const total = (result.totalPatternCount || 0) + count;
                chrome.storage.local.set({ totalPatternCount: total });
                chrome.action.setBadgeText({ text: total > 0 ? total.toString() : '' });
                chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
              });
            }
            sendResponse({ success: true });
            return;
          }

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
          return;
      }
    } catch (e) {
      console.error("[background] message handler error:", e);
      sendResponse({ success: false, error: String(e) });
    }
  })();

  // must return true when you call sendResponse asynchronously (we do in some branches)
  return true;
});

// Handle dark pattern detection results (preserve original behaviour)
function handleDarkPatternDetection(data, sender) {
  console.log("Dark pattern detected:", data);

  // Store detection results
  chrome.storage.local.get(['detectionHistory'], (result) => {
    const history = result.detectionHistory || [];
    history.push({
      ...data,
      timestamp: Date.now(),
      tabId: sender.tab ? sender.tab.id : null,
      url: sender.tab ? sender.tab.url : null
    });

    // Keep only last 100 detections
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }

    chrome.storage.local.set({ detectionHistory: history });
  });
}

// Handle scan requests from popup or content script
function handleScanRequest(data, sender, sendResponse) {
  // Check if we have a valid tab
  if (!sender.tab || !sender.tab.id) {
    sendResponse({ error: 'No active tab found' });
    return;
  }

  // Forward scan request to content script
  chrome.tabs.sendMessage(sender.tab.id, {
    type: 'PERFORM_SCAN',
    data: data
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Error sending scan request:", chrome.runtime.lastError);
      sendResponse({ error: chrome.runtime.lastError.message });
    } else {
      sendResponse(response || { error: 'No response from content script' });
    }
  });
}

// Handle tab updates - DISABLED auto-scan (only scan on user button click)
// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//   // Auto-scan disabled - user must click button to scan
// });
