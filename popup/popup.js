document.addEventListener('DOMContentLoaded', initializePopup);

async function initializePopup() {
  // Load current settings
  await loadSettings();
  
  // Check connection status
  await checkConnectionStatus();
  
  // Get torrent count from current page
  await updateTorrentCount();
  
  // Load categories
  await loadCategories();
  
  // Setup event listeners
  setupEventListeners();
}

async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['options']);
    const options = result.options || {};
    
    document.getElementById('save-path-input').value = options.savePath || '';
    document.getElementById('paused-checkbox').checked = options.paused || false;
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

async function checkConnectionStatus() {
  const statusElement = document.getElementById('connection-status');
  statusElement.textContent = 'Checking...';
  statusElement.className = 'status-value checking';
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'TEST_CONNECTION' });
    
    if (response.success && response.connected) {
      statusElement.textContent = 'Connected';
      statusElement.className = 'status-value connected';
    } else {
      statusElement.textContent = 'Disconnected';
      statusElement.className = 'status-value disconnected';
    }
  } catch (error) {
    statusElement.textContent = 'Error';
    statusElement.className = 'status-value disconnected';
    console.error('Connection test failed:', error);
  }
}

async function updateTorrentCount() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_ALL_TORRENTS' });
    
    const count = response.torrents ? response.torrents.length : 0;
    document.getElementById('torrent-count').textContent = count;
    
    const sendAllBtn = document.getElementById('send-all-btn');
    sendAllBtn.disabled = count === 0;
    sendAllBtn.textContent = count > 0 ? `Send ${count} Torrent${count > 1 ? 's' : ''}` : 'No Torrents Found';
  } catch (error) {
    console.error('Error getting torrent count:', error);
    document.getElementById('torrent-count').textContent = '0';
  }
}

async function loadCategories() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'GET_SERVER_INFO' });
    
    if (response.success && response.info.categories) {
      const categorySelect = document.getElementById('category-select');
      
      // Clear existing options except default
      categorySelect.innerHTML = '<option value="">Default</option>';
      
      // Add categories from server
      Object.keys(response.info.categories).forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

function setupEventListeners() {
  // Send all torrents button
  document.getElementById('send-all-btn').addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_ALL_TORRENTS' });
      
      if (response.torrents && response.torrents.length > 0) {
        const options = getCurrentOptions();
        
        const result = await chrome.runtime.sendMessage({
          action: 'SEND_MULTIPLE',
          urls: response.torrents,
          options: options
        });
        
        if (result.success) {
          const successCount = result.results.filter(r => r.success).length;
          showNotification('success', `Sent ${successCount}/${result.results.length} torrents`);
        } else {
          showNotification('error', 'Failed to send torrents');
        }
      }
    } catch (error) {
      showNotification('error', `Error: ${error.message}`);
    }
  });
  
  // Refresh button
  document.getElementById('refresh-btn').addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { action: 'RESCAN_PAGE' });
      await updateTorrentCount();
      showNotification('info', 'Page rescanned');
    } catch (error) {
      console.error('Failed to refresh:', error);
      showNotification('error', 'Failed to refresh');
    }
  });
  
  // Test connection button
  document.getElementById('test-connection-btn').addEventListener('click', async () => {
    await checkConnectionStatus();
    const statusElement = document.getElementById('connection-status');
    
    if (statusElement.classList.contains('connected')) {
      showNotification('success', 'Connection successful');
    } else {
      showNotification('error', 'Connection failed');
    }
  });
  
  // Options button
  document.getElementById('options-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Save settings when changed
  document.getElementById('save-path-input').addEventListener('change', saveCurrentOptions);
  document.getElementById('paused-checkbox').addEventListener('change', saveCurrentOptions);
  document.getElementById('category-select').addEventListener('change', saveCurrentOptions);
}

function getCurrentOptions() {
  return {
    category: document.getElementById('category-select').value,
    savePath: document.getElementById('save-path-input').value,
    paused: document.getElementById('paused-checkbox').checked
  };
}

async function saveCurrentOptions() {
  const options = getCurrentOptions();
  
  try {
    const result = await chrome.storage.sync.get(['options']);
    const currentOptions = result.options || {};
    
    await chrome.storage.sync.set({
      options: { ...currentOptions, ...options }
    });
  } catch (error) {
    console.error('Error saving options:', error);
    showNotification('error', 'Failed to save settings');
  }
}

function showNotification(type, message) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type}`;
  
  // Show notification
  setTimeout(() => {
    notification.classList.remove('hidden');
  }, 100);
  
  // Hide after 3 seconds
  setTimeout(() => {
    notification.classList.add('hidden');
  }, 3100);
}