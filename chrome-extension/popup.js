let extractedData = null;
let appUrl = 'http://localhost:3000'; // Default

// DOM elements
const extractBtn = document.getElementById('extractBtn');
const sendBtn = document.getElementById('sendBtn');
const copyBtn = document.getElementById('copyBtn');
const loading = document.getElementById('loading');
const success = document.getElementById('success');
const notZillow = document.getElementById('notZillow');
const dataPreview = document.getElementById('dataPreview');

// Load app URL from settings
chrome.storage.sync.get(['appUrl'], (result) => {
  if (result.appUrl) {
    appUrl = result.appUrl;
  }
});

// Check if we're on a Zillow page
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentTab = tabs[0];
  if (!currentTab.url.includes('zillow.com/homedetails')) {
    notZillow.classList.remove('hidden');
    extractBtn.disabled = true;
  }
});

// Extract data from page
extractBtn.addEventListener('click', async () => {
  loading.classList.remove('hidden');
  success.classList.add('hidden');
  notZillow.classList.add('hidden');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id, { action: 'extractData' }, (response) => {
    loading.classList.add('hidden');

    if (chrome.runtime.lastError) {
      notZillow.textContent = '❌ Error: ' + chrome.runtime.lastError.message;
      notZillow.classList.remove('hidden');
      return;
    }

    if (response && response.success) {
      extractedData = response.data;
      success.classList.remove('hidden');
      sendBtn.disabled = false;
      copyBtn.disabled = false;

      // Show preview
      displayDataPreview(extractedData);
    } else {
      notZillow.textContent = '❌ Failed to extract data';
      notZillow.classList.remove('hidden');
    }
  });
});

// Display data preview
function displayDataPreview(data) {
  const fields = [
    { label: 'Address', value: data.address || 'Not found' },
    { label: 'Price', value: data.price ? `$${parseInt(data.price).toLocaleString()}` : 'Not found' },
    { label: 'Beds', value: data.beds || 'Not found' },
    { label: 'Baths', value: data.baths || 'Not found' },
    { label: 'Sqft', value: data.sqft ? parseInt(data.sqft).toLocaleString() : 'Not found' }
  ];

  dataPreview.innerHTML = fields.map(field => `
    <div class="field">
      <span class="label">${field.label}:</span>
      <span class="value">${field.value}</span>
    </div>
  `).join('');

  dataPreview.classList.remove('hidden');
}

// Send to app
sendBtn.addEventListener('click', async () => {
  if (!extractedData) return;

  success.textContent = '✅ Sending to app...';
  success.classList.remove('hidden');

  // Ensure we have the latest app URL
  const settings = await chrome.storage.sync.get(['appUrl']);
  const currentAppUrl = settings.appUrl || appUrl;

  // Find tabs matching the app URL
  const tabs = await chrome.tabs.query({});
  const appTabs = tabs.filter(tab => tab.url && tab.url.startsWith(currentAppUrl));

  if (appTabs.length > 0) {
    // App is already open - send message directly to the bridge content script
    chrome.tabs.sendMessage(appTabs[0].id, {
      action: 'sendListingData',
      data: extractedData
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
        // Fallback: save to storage and reload
        chrome.storage.local.set({ pendingListing: extractedData }, () => {
          chrome.tabs.reload(appTabs[0].id);
          chrome.tabs.update(appTabs[0].id, { active: true });
        });
      } else {
        chrome.tabs.update(appTabs[0].id, { active: true });
      }
    });

    // Close popup after 1 second
    setTimeout(() => window.close(), 1000);
  } else {
    // App is not open - save to storage and open new tab
    chrome.storage.local.set({ pendingListing: extractedData }, () => {
      chrome.tabs.create({ url: currentAppUrl });

      // Close popup after 1 second
      setTimeout(() => window.close(), 1000);
    });
  }
});

// Copy to clipboard
copyBtn.addEventListener('click', () => {
  if (!extractedData) return;

  const text = `Address: ${extractedData.address || 'N/A'}
Price: ${extractedData.price || 'N/A'}
Beds: ${extractedData.beds || 'N/A'}
Baths: ${extractedData.baths || 'N/A'}
Sqft: ${extractedData.sqft || 'N/A'}
URL: ${extractedData.url || 'N/A'}`;

  navigator.clipboard.writeText(text).then(() => {
    copyBtn.textContent = '✓ Copied!';
    setTimeout(() => {
      copyBtn.textContent = 'Copy Data to Clipboard';
    }, 2000);
  });
});
