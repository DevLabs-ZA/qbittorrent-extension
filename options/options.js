document.addEventListener('DOMContentLoaded', initializeOptions);

let currentSettings = {};

async function initializeOptions() {
    await loadSettings();
    await loadServerCategories();
    setupEventListeners();
}

async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get();
        currentSettings = result;

        // Server settings
        const server = result.server || {};
        document.getElementById('server-url').value = server.url || 'http://localhost:8080';
        document.getElementById('username').value = server.username || 'admin';
        document.getElementById('password').value = server.password || '';
        document.getElementById('use-https').checked = server.useHttps || false;

        // Download options
        const options = result.options || {};
        document.getElementById('default-category').value = options.category || '';
        document.getElementById('default-save-path').value = options.savePath || '';
        document.getElementById('start-paused').checked = options.paused || false;
        document.getElementById('skip-hash-check').checked = options.skipHashCheck || false;

        // Behavior settings
        document.getElementById('auto-download').checked = options.autoDownload !== false;
        document.getElementById('show-notifications').checked = options.showNotifications !== false;
        document.getElementById('show-indicators').checked = options.showIndicators !== false;
        document.getElementById('scan-dynamic-content').checked = options.scanDynamicContent !== false;

        // Site-specific settings
        const siteSettings = result.siteSettings || {};
        document.getElementById('whitelist').value = (siteSettings.whitelist || []).join('\n');
        document.getElementById('blacklist').value = (siteSettings.blacklist || []).join('\n');

        // Advanced settings
        const advanced = result.advanced || {};
        document.getElementById('connection-timeout').value = advanced.connectionTimeout || 30;
        document.getElementById('retry-attempts').value = advanced.retryAttempts || 3;
        document.getElementById('debug-logging').checked = advanced.debugLogging || false;

    } catch (error) {
        console.error('Error loading settings:', error);
        showNotification('error', 'Failed to load settings');
    }
}

async function loadServerCategories() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'GET_SERVER_INFO' });

        if (response.success && response.info.categories) {
            const categorySelect = document.getElementById('default-category');
            const currentValue = categorySelect.value;

            // Clear existing options safely using DOM manipulation
            while (categorySelect.firstChild) {
                categorySelect.removeChild(categorySelect.firstChild);
            }
            
            // Add "None" option safely
            const noneOption = document.createElement('option');
            noneOption.value = '';
            noneOption.textContent = 'None';
            categorySelect.appendChild(noneOption);

            // Add categories from server with input validation
            Object.keys(response.info.categories).forEach(category => {
                // Sanitize category name to prevent XSS
                const sanitizedCategory = typeof InputValidator !== 'undefined'
                    ? InputValidator.sanitizeCategory(category)
                    : category.replace(/[<>&"']/g, ''); // Fallback sanitization
                    
                if (sanitizedCategory) { // Only add non-empty categories
                    const option = document.createElement('option');
                    option.value = sanitizedCategory;
                    option.textContent = sanitizedCategory;
                    categorySelect.appendChild(option);
                }
            });

            // Restore selected value safely
            categorySelect.value = currentValue;
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function setupEventListeners() {
    // Test connection button
    document.getElementById('test-connection').addEventListener('click', testConnection);

    // Save settings button
    document.getElementById('save-settings').addEventListener('click', saveSettings);

    // Reset settings button
    document.getElementById('reset-settings').addEventListener('click', resetSettings);

    // Export settings button
    document.getElementById('export-settings').addEventListener('click', exportSettings);

    // Import settings button
    document.getElementById('import-settings').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });

    // Import file handler
    document.getElementById('import-file').addEventListener('change', importSettings);

    // Auto-save on certain changes
    ['server-url', 'username', 'password'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            // Clear cached auth when server settings change
            chrome.runtime.sendMessage({ action: 'CLEAR_AUTH_CACHE' });
        });
    });
}

async function testConnection() {
    const button = document.getElementById('test-connection');
    const statusElement = document.getElementById('connection-status');

    button.classList.add('loading');
    button.disabled = true;
    statusElement.textContent = 'Testing...';
    statusElement.className = 'status-indicator loading';

    try {
        // Save current server settings first
        await saveServerSettings();

        const response = await chrome.runtime.sendMessage({ action: 'TEST_CONNECTION' });

        if (response.success && response.connected) {
            statusElement.textContent = `Connected (qBittorrent ${response.connected.version})`;
            statusElement.className = 'status-indicator success';
            showNotification('success', 'Connection successful!');

            // Reload categories after successful connection
            await loadServerCategories();
        } else {
            statusElement.textContent = `Failed: ${response.connected?.error || 'Unknown error'}`;
            statusElement.className = 'status-indicator error';
            showNotification('error', 'Connection failed. Check your settings.');
        }
    } catch (error) {
        statusElement.textContent = `Error: ${error.message}`;
        statusElement.className = 'status-indicator error';
        showNotification('error', `Connection error: ${error.message}`);
    } finally {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

async function saveServerSettings() {
    const serverSettings = {
        url: document.getElementById('server-url').value.trim(),
        username: document.getElementById('username').value.trim(),
        password: document.getElementById('password').value,
        useHttps: document.getElementById('use-https').checked
    };

    // Use secure storage if available
    try {
        if (typeof SecureStorageManager !== 'undefined') {
            await SecureStorageManager.storeCredentials(serverSettings);
        } else {
            await chrome.storage.sync.set({ server: serverSettings });
        }
    } catch (error) {
        console.error('Error saving server settings:', error);
        // Fallback to regular storage
        await chrome.storage.sync.set({ server: serverSettings });
    }
}

async function saveSettings() {
    const button = document.getElementById('save-settings');

    try {
        button.classList.add('loading');
        button.disabled = true;

        const formData = {
            server: {
                url: document.getElementById('server-url').value.trim(),
                username: document.getElementById('username').value.trim(),
                password: document.getElementById('password').value,
                useHttps: document.getElementById('use-https').checked
            },
            options: {
                category: document.getElementById('default-category').value,
                savePath: document.getElementById('default-save-path').value.trim(),
                paused: document.getElementById('start-paused').checked,
                skipHashCheck: document.getElementById('skip-hash-check').checked,
                autoDownload: document.getElementById('auto-download').checked,
                showNotifications: document.getElementById('show-notifications').checked,
                showIndicators: document.getElementById('show-indicators').checked,
                scanDynamicContent: document.getElementById('scan-dynamic-content').checked
            },
            siteSettings: {
                whitelist: document.getElementById('whitelist').value
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line),
                blacklist: document.getElementById('blacklist').value
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line)
            },
            advanced: {
                connectionTimeout: parseInt(document.getElementById('connection-timeout').value),
                retryAttempts: parseInt(document.getElementById('retry-attempts').value),
                debugLogging: document.getElementById('debug-logging').checked
            }
        };

        // Validate and sanitize input data
        const validation = InputValidator.validateFormData(formData);

        if (!validation.isValid) {
            showNotification('error', `Validation failed: ${validation.errors.join(', ')}`);
            return;
        }

        const settings = validation.sanitizedData;

        // Use secure storage for server credentials
        if (settings.server) {
            try {
                if (typeof SecureStorageManager !== 'undefined') {
                    await SecureStorageManager.storeCredentials(settings.server);
                } else {
                    await chrome.storage.sync.set({ server: settings.server });
                }
            } catch (error) {
                console.error('Error saving server settings:', error);
                await chrome.storage.sync.set({ server: settings.server });
            }
        }

        // Save other settings to sync storage
        const syncSettings = {};
        if (settings.options) {syncSettings.options = settings.options;}
        if (settings.siteSettings) {syncSettings.siteSettings = settings.siteSettings;}
        if (settings.advanced) {syncSettings.advanced = settings.advanced;}

        await chrome.storage.sync.set(syncSettings);
        currentSettings = { ...currentSettings, ...settings };

        showNotification('success', 'Settings saved successfully!');

    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('error', `Failed to save settings: ${error.message}`);
    } finally {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

async function resetSettings() {
    // Use custom secure modal instead of confirm() to prevent automation bypass
    const userConfirmed = await showSecureConfirmDialog(
        'Reset All Settings',
        'Are you sure you want to reset all settings to defaults? This action cannot be undone.',
        'Reset Settings',
        'Cancel'
    );
    
    if (!userConfirmed) {
        return;
    }

    try {
        await chrome.storage.sync.clear();

        // Set default values
        const defaultSettings = {
            server: {
                url: 'http://localhost:8080',
                username: 'admin',
                password: '',
                useHttps: false
            },
            options: {
                category: '',
                savePath: '',
                paused: false,
                skipHashCheck: false,
                autoDownload: true,
                showNotifications: true,
                showIndicators: true,
                scanDynamicContent: true
            },
            siteSettings: {
                whitelist: [],
                blacklist: []
            },
            advanced: {
                connectionTimeout: 30,
                retryAttempts: 3,
                debugLogging: false
            }
        };

        await chrome.storage.sync.set(defaultSettings);
        await loadSettings();

        showNotification('success', 'Settings reset to defaults');

    } catch (error) {
        console.error('Error resetting settings:', error);
        showNotification('error', `Failed to reset settings: ${error.message}`);
    }
}

function exportSettings() {
    try {
        const exportData = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            settings: currentSettings
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qbittorrent-extension-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('success', 'Settings exported successfully!');

    } catch (error) {
        console.error('Error exporting settings:', error);
        showNotification('error', `Failed to export settings: ${error.message}`);
    }
}

async function importSettings(event) {
    const file = event.target.files[0];
    if (!file) {return;}

    try {
        const text = await file.text();
        const importData = JSON.parse(text);

        if (!importData.settings) {
            throw new Error('Invalid settings file format');
        }

        const userConfirmed = await showSecureConfirmDialog(
            'Import Settings',
            'This will overwrite your current settings. Do you want to continue?',
            'Import Settings',
            'Cancel'
        );
        
        if (!userConfirmed) {
            return;
        }

        await chrome.storage.sync.clear();
        await chrome.storage.sync.set(importData.settings);
        await loadSettings();

        showNotification('success', 'Settings imported successfully!');

    } catch (error) {
        console.error('Error importing settings:', error);
        showNotification('error', `Failed to import settings: ${error.message}`);
    } finally {
        // Clear the file input safely to prevent race conditions
        const fileInput = event.target;
        setTimeout(() => {
            fileInput.value = '';
        }, 0);
    }
}

/**
 * Secure confirmation dialog to prevent automation bypass
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {string} confirmText - Confirm button text
 * @param {string} cancelText - Cancel button text
 * @returns {Promise<boolean>} User's choice
 */
function showSecureConfirmDialog(title, message, confirmText, cancelText) {
    return new Promise((resolve) => {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        // Create modal dialog
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `;

        // Create dialog content
        modal.innerHTML = `
            <h3 style="margin: 0 0 16px 0; color: #333;">${title}</h3>
            <p style="margin: 0 0 24px 0; color: #666; line-height: 1.4;">${message}</p>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="secure-cancel" style="
                    padding: 8px 16px;
                    border: 1px solid #ddd;
                    background: white;
                    border-radius: 4px;
                    cursor: pointer;
                ">${cancelText}</button>
                <button id="secure-confirm" style="
                    padding: 8px 16px;
                    border: 1px solid #dc3545;
                    background: #dc3545;
                    color: white;
                    border-radius: 4px;
                    cursor: pointer;
                ">${confirmText}</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Add event listeners
        const confirmBtn = modal.querySelector('#secure-confirm');
        const cancelBtn = modal.querySelector('#secure-cancel');

        const cleanup = () => {
            document.body.removeChild(overlay);
        };

        confirmBtn.addEventListener('click', () => {
            cleanup();
            resolve(true);
        });

        cancelBtn.addEventListener('click', () => {
            cleanup();
            resolve(false);
        });

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cleanup();
                resolve(false);
            }
        });

        // Close on escape key
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleKeydown);
                cleanup();
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    });
}

function showNotification(type, message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;

    // Show notification
    setTimeout(() => {
        notification.classList.remove('hidden');
    }, 100);

    // Hide after 4 seconds
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 4100);
}