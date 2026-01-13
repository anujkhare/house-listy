// Default app URL
const DEFAULT_APP_URL = 'http://localhost:3000';

// DOM elements
const appUrlInput = document.getElementById('appUrl');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const statusDiv = document.getElementById('status');

// Load saved settings
function loadSettings() {
  chrome.storage.sync.get(['appUrl'], (result) => {
    appUrlInput.value = result.appUrl || DEFAULT_APP_URL;
  });
}

// Show status message
function showStatus(message, isError = false) {
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + (isError ? 'error' : 'success');
  statusDiv.style.display = 'block';

  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}

// Validate URL
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// Normalize URL (remove trailing slash)
function normalizeUrl(url) {
  return url.replace(/\/$/, '');
}

// Save settings
saveBtn.addEventListener('click', () => {
  const appUrl = appUrlInput.value.trim();

  // Validate URL
  if (!appUrl) {
    showStatus('Please enter a URL', true);
    return;
  }

  if (!isValidUrl(appUrl)) {
    showStatus('Please enter a valid URL (must start with http:// or https://)', true);
    return;
  }

  const normalizedUrl = normalizeUrl(appUrl);

  // Save to chrome.storage.sync
  chrome.storage.sync.set({ appUrl: normalizedUrl }, () => {
    showStatus('✓ Settings saved! Please reload the extension for changes to take effect.');

    // Also update the input to show normalized URL
    appUrlInput.value = normalizedUrl;

    // Notify background script to update content scripts
    chrome.runtime.sendMessage({
      action: 'updateAppUrl',
      appUrl: normalizedUrl
    });
  });
});

// Reset to default
resetBtn.addEventListener('click', () => {
  appUrlInput.value = DEFAULT_APP_URL;

  chrome.storage.sync.set({ appUrl: DEFAULT_APP_URL }, () => {
    showStatus('✓ Reset to default URL');

    // Notify background script to update content scripts
    chrome.runtime.sendMessage({
      action: 'updateAppUrl',
      appUrl: DEFAULT_APP_URL
    });
  });
});

// Load settings on page load
loadSettings();

// Allow Enter key to save
appUrlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveBtn.click();
  }
});
