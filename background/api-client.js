// Atomic operations for authentication cookie handling to prevent race conditions
const authState = {
    cookie: null,
    lastAuthTime: 0,
    isAuthenticating: false // Flag to prevent concurrent authentication
};
const AUTH_TIMEOUT = 30 * 60 * 1000;

async function getSettings() {
    // Use secure storage if available, fallback to regular storage
    let serverConfig;
    try {
        if (typeof SecureStorageManager !== 'undefined') {
            serverConfig = await SecureStorageManager.getCredentials();
        } else {
            const result = await chrome.storage.sync.get(['server']);
            serverConfig = result.server || {};
        }
    } catch (error) {
        console.error('Error getting credentials:', error);
        const result = await chrome.storage.sync.get(['server']);
        serverConfig = result.server || {};
    }

    const result = await chrome.storage.sync.get(['options']);
    return {
        server: serverConfig,
        options: result.options
    };
}

async function authenticate() {
    const timer = window.Logger ? window.Logger.startTimer('authentication') : null;

    try {
        const { server } = await getSettings();

        if (!server.url || !server.username) {
            const error = new Error('Server configuration not found');
            if (window.Logger) {
                window.Logger.error('Authentication failed - no server config', error);
            }
            throw error;
        }

        // Check if we have a valid auth cookie (atomic check to prevent race conditions)
        if (authState.cookie && (Date.now() - authState.lastAuthTime) < AUTH_TIMEOUT) {
            if (window.Logger) {
                window.Logger.debug('Using cached authentication', {
                    cacheAge: Date.now() - authState.lastAuthTime
                });
            }
            if (timer) {timer.end({ success: true, cached: true });}
            return authState.cookie;
        }

        // Prevent concurrent authentication attempts
        if (authState.isAuthenticating) {
            // Wait for ongoing authentication to complete
            let retries = 0;
            while (authState.isAuthenticating && retries < 50) { // Max 5 seconds wait
                await new Promise(resolve => {
                    setTimeout(resolve, 100);
                });
                retries++;
            }
            // Return the result of the ongoing authentication
            if (authState.cookie && (Date.now() - authState.lastAuthTime) < AUTH_TIMEOUT) {
                return authState.cookie;
            }
        }

        // Set authentication in progress flag
        authState.isAuthenticating = true;

        if (window.Logger) {
            window.Logger.info('Authenticating with qBittorrent server', {
                serverUrl: server.url,
                username: server.username
            });
        }

        const loginUrl = `${server.url}/api/v2/auth/login`;
        const formData = new FormData();
        formData.append('username', server.username);
        formData.append('password', server.password || '');

        const response = await fetch(loginUrl, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Authentication failed: ${response.status}`);
        }

        const responseText = await response.text();

        if (responseText !== 'Ok.') {
            throw new Error('Invalid credentials');
        }

        // Extract cookie from response headers (atomic update)
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
            authState.cookie = setCookieHeader.split(';')[0];
            authState.lastAuthTime = Date.now();
        }

        if (timer) {timer.end({ success: true, cached: false });}

        if (window.Logger) {
            window.Logger.info('Authentication successful', {
                serverUrl: server.url
            });
        }

        return authState.cookie;
    } catch (error) {
        if (timer) {timer.end({ success: false, error: error.message });}

        if (window.ErrorHandler) {
            const { server: errorServer } = await getSettings().catch(() => ({ server: {} }));
            window.ErrorHandler.handle(error, 'authentication', {
                serverUrl: errorServer?.url,
                username: errorServer?.username
            });
        } else {
            console.error('Authentication error:', error);
        }

        // Don't expose internal error details
        throw new Error('Authentication failed. Please check your credentials.');
    } finally {
        // Always clear the authentication flag to prevent deadlock
        authState.isAuthenticating = false;
    }
}

async function makeAuthenticatedRequest(endpoint, options = {}) {
    const { server } = await getSettings();
    const cookie = await authenticate();

    const url = `${server.url}/api/v2/${endpoint}`;
    const requestOptions = {
        ...options,
        headers: {
            ...options.headers,
            'Cookie': cookie
        }
    };

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
        // Don't expose detailed server error information
        if (response.status === 401) {
            throw new Error('Authentication required');
        } else if (response.status === 403) {
            throw new Error('Access denied');
        } else if (response.status >= 500) {
            throw new Error('Server error occurred');
        } else {
            throw new Error('Request failed');
        }
    }

    return response;
}

async function sendTorrent(torrentUrl, customOptions = {}) {
    // Validate torrent URL
    if (typeof InputValidator !== 'undefined') {
        if (!InputValidator.validateMagnetLink(torrentUrl) && !InputValidator.validateTorrentUrl(torrentUrl)) {
            throw new Error('Invalid torrent URL or magnet link');
        }
    }

    const { options } = await getSettings();

    const formData = new FormData();

    if (torrentUrl.startsWith('magnet:')) {
        formData.append('urls', torrentUrl);
    } else {
        // Handle .torrent file URL
        const torrentResponse = await fetch(torrentUrl);
        const torrentBlob = await torrentResponse.blob();

        // Validate blob size (prevent excessively large files)
        if (torrentBlob.size > 10 * 1024 * 1024) { // 10MB limit
            throw new Error('Torrent file too large');
        }

        formData.append('torrents', torrentBlob, 'download.torrent');
    }

    // Add options
    if (options.category || customOptions.category) {
        formData.append('category', customOptions.category || options.category);
    }

    if (options.savePath || customOptions.savePath) {
        formData.append('savepath', customOptions.savePath || options.savePath);
    }

    if (options.paused || customOptions.paused) {
        formData.append('paused', 'true');
    }

    if (options.skipHashCheck || customOptions.skipHashCheck) {
        formData.append('skip_checking', 'true');
    }

    const response = await makeAuthenticatedRequest('torrents/add', {
        method: 'POST',
        body: formData
    });

    const responseText = await response.text();

    if (responseText !== 'Ok.') {
        throw new Error(`Failed to add torrent: ${responseText}`);
    }

    return { success: true, name: extractTorrentName(torrentUrl) };
}

async function sendMultipleTorrents(torrentUrls, customOptions = {}) {
    const results = [];

    for (const url of torrentUrls) {
        try {
            const result = await sendTorrent(url, customOptions);
            results.push({ url, success: true, result });
        } catch (error) {
            results.push({ url, success: false, error: error.message });
        }
    }

    return results;
}

async function testConnection() {
    try {
        const response = await makeAuthenticatedRequest('app/version');
        const version = await response.text();
        return { connected: true, version };
    } catch (error) {
        return { connected: false, error: error.message };
    }
}

async function getServerInfo() {
    try {
        const [versionResponse, preferencesResponse] = await Promise.all([
            makeAuthenticatedRequest('app/version'),
            makeAuthenticatedRequest('app/preferences')
        ]);

        const version = await versionResponse.text();
        const preferences = await preferencesResponse.json();

        return {
            version,
            webPort: preferences.web_ui_port,
            categories: preferences.categories || {}
        };
    } catch (error) {
        throw new Error(`Failed to get server info: ${error.message}`);
    }
}

function extractTorrentName(url) {
    if (url.startsWith('magnet:')) {
        const match = url.match(/dn=([^&]+)/);
        return match ? decodeURIComponent(match[1]) : 'Magnet Link';
    }
        const urlParts = url.split('/');
        return urlParts[urlParts.length - 1].replace('.torrent', '');

}

// Export functions for use in service worker
window.sendTorrent = sendTorrent;
window.sendMultipleTorrents = sendMultipleTorrents;
window.testConnection = testConnection;
window.getServerInfo = getServerInfo;