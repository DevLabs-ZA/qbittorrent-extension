// Import scripts for Manifest V3
importScripts(
    'utils/constants.js',
    'utils/crypto.js',
    'utils/validation.js',
    'utils/logger.js',
    'utils/error-handler.js',
    'utils/monitor.js',
    'utils/diagnostics.js',
    'background/api-client.js'
);

/* global Logger, Monitor, ErrorHandler, ApiClient, Validator, Diagnostics */

// Initialize rate limiter
const rateLimiter = new RateLimiter();

// Initialize logging and monitoring
// Initialize logging and monitoring (use global window references in service worker)
if (typeof Logger !== 'undefined') {
    Logger.info('Background service worker loaded');
}
if (typeof Monitor !== 'undefined') {
    Monitor.start();
}

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
    if (typeof Logger !== 'undefined') {
        Logger.info('Extension installed/reloaded');
    }
    // Create context menus
    chrome.contextMenus.create({
        id: 'send-to-qbittorrent',
        title: 'Send to qBittorrent',
        contexts: ['link'],
        targetUrlPatterns: ['*magnet:*', '*.torrent']
    });

    chrome.contextMenus.create({
        id: 'send-all-torrents',
        title: 'Send all torrents on page',
        contexts: ['page']
    });

    // Set default settings
    setDefaultSettings();
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    switch (info.menuItemId) {
        case 'send-to-qbittorrent':
            await sendSingleTorrent(info.linkUrl);
            break;
        case 'send-all-torrents':
            await sendAllTorrentsOnPage(tab.id);
            break;
    }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'send_all_torrents') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await sendAllTorrentsOnPage(tab.id);
    }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse);
    return true; // Keep the message channel open for async response
});

async function handleMessage(message, sender, sendResponse) {
    const timer = window.Logger ? window.Logger.startTimer('message_handling') : null;
    
    try {
        // Log incoming message
        if (window.Logger) {
            window.Logger.debug('Message received', {
                action: message.action,
                sender: sender.tab ? 'content_script' : 'popup',
                tabId: sender.tab?.id,
                url: sender.tab?.url
            });
        }

        // Rate limiting - prevent abuse
        const senderKey = sender.tab ? sender.tab.id.toString() : 'popup';
        if (!rateLimiter.isAllowed(senderKey, 20, 60000)) { // 20 requests per minute
            if (window.Logger) {
                window.Logger.warn('Rate limit exceeded', { senderKey, action: message.action });
            }
            sendResponse({ success: false, error: 'Rate limit exceeded' });
            return;
        }

        switch (message.action) {
            case 'SEND_TORRENT': {
                const result = await sendTorrent(message.url, message.options);
                sendResponse({ success: true, result });
                break;
            }

            case 'SEND_MULTIPLE': {
                const results = await sendMultipleTorrents(message.urls, message.options);
                sendResponse({ success: true, results });
                break;
            }

            case 'TEST_CONNECTION': {
                const connectionTest = await testConnection();
                sendResponse({ success: true, connected: connectionTest });
                break;
            }

            case 'GET_SERVER_INFO': {
                const serverInfo = await getServerInfo();
                sendResponse({ success: true, info: serverInfo });
                break;
            }

            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
    } catch (error) {
        // Handle error with comprehensive logging
        if (window.ErrorHandler) {
            const errorInfo = window.ErrorHandler.handle(error, null, {
                action: message.action,
                sender: sender.tab ? 'content_script' : 'popup',
                tabId: sender.tab?.id
            });
            sendResponse({ success: false, error: errorInfo.message });
        } else {
            console.error('Background script error:', error);
            sendResponse({ success: false, error: error.message });
        }
    } finally {
        // End performance timer
        if (timer) {
            timer.end({ action: message.action });
        }
    }
}

async function sendSingleTorrent(url) {
    try {
        const result = await sendTorrent(url);
        showNotification('success', `Torrent sent successfully: ${result.name || 'Unknown'}`)
    } catch (error) {
        showNotification('error', `Failed to send torrent: ${error.message}`)
    }
}

async function sendAllTorrentsOnPage(tabId) {
    try {
        // Get all torrent links from the page
        const response = await chrome.tabs.sendMessage(tabId, { action: 'GET_ALL_TORRENTS' });

        if (response.torrents && response.torrents.length > 0) {
            const results = await sendMultipleTorrents(response.torrents);
            const successCount = results.filter(r => r.success).length;
            showNotification('success', `Sent ${successCount}/${results.length} torrents successfully`);
        } else {
            showNotification('info', 'No torrent links found on this page');
        }
    } catch (error) {
        showNotification('error', `Failed to send torrents: ${error.message}`);
    }
}

async function setDefaultSettings() {
    const settings = await chrome.storage.sync.get();

    if (!settings.server) {
        await chrome.storage.sync.set({
            server: {
                url: 'http://localhost:8080',
                username: 'admin',
                password: '',
                useHttps: false,
                customPort: 8080
            },
            options: {
                category: '',
                savePath: '',
                paused: false,
                skipHashCheck: false,
                autoDownload: true,
                showNotifications: true
            }
        });
    }
}

function showNotification(type, message) {
    const icons = {
        success: 'icons/icon48.png',
        error: 'icons/icon48.png',
        info: 'icons/icon48.png'
    };

    chrome.notifications.create({
        type: 'basic',
        iconUrl: icons[type],
        title: 'qBittorrent Integration',
        message: message
    });
}