let authCookie = null;
let lastAuthTime = 0;
const AUTH_TIMEOUT = 30 * 60 * 1000;

async function getSettings() {
    const result = await chrome.storage.sync.get(['server', 'options']);
    return result;
}

async function authenticate() {
    const { server } = await getSettings();

    if (!server.url || !server.username) {
        throw new Error('Server configuration not found');
    }

    // Check if we have a valid auth cookie
    if (authCookie && (Date.now() - lastAuthTime) < AUTH_TIMEOUT) {
        return authCookie;
    }

    const loginUrl = `${server.url}/api/v2/auth/login`;
    const formData = new FormData();
    formData.append('username', server.username);
    formData.append('password', server.password || '');

    try {
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

        // Extract cookie from response headers
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
            authCookie = setCookieHeader.split(';')[0];
            lastAuthTime = Date.now();
        }

        return authCookie;
    } catch (error) {
        console.error('Authentication error:', error);
        throw new Error(`Failed to authenticate: ${error.message}`);
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
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return response;
}

async function sendTorrent(torrentUrl, customOptions = {}) {
    const { options } = await getSettings();

    const formData = new FormData();

    if (torrentUrl.startsWith('magnet:')) {
        formData.append('urls', torrentUrl);
    } else {
        // Handle .torrent file URL
        const torrentResponse = await fetch(torrentUrl);
        const torrentBlob = await torrentResponse.blob();
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
    } else {
        const urlParts = url.split('/');
        return urlParts[urlParts.length - 1].replace('.torrent', '');
    }
}

// Export functions for use in service worker
window.sendTorrent = sendTorrent;
window.sendMultipleTorrents = sendMultipleTorrents;
window.testConnection = testConnection;
window.getServerInfo = getServerInfo;