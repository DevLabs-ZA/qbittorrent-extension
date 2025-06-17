const CONSTANTS = {
    // Extension info
    EXTENSION_NAME: 'qBittorrent Web Integration',
    VERSION: '1.0.0',

    // API endpoints
    API_ENDPOINTS: {
        LOGIN: '/api/v2/auth/login',
        LOGOUT: '/api/v2/auth/logout',
        VERSION: '/api/v2/app/version',
        PREFERENCES: '/api/v2/app/preferences',
        ADD_TORRENT: '/api/v2/torrents/add',
        TORRENT_LIST: '/api/v2/torrents/info'
    },

    // Patterns for link detection
    PATTERNS: {
        MAGNET: /magnet:\?xt=urn:btih:[a-zA-Z0-9]{32,40}/gi,
        TORRENT_FILE: /\.torrent(\?[^"'\s]*)?$/i,
        HASH: /[a-fA-F0-9]{40}/
    },

    // Default settings
    DEFAULTS: {
        SERVER: {
            url: 'http://localhost:8080',
            username: 'admin',
            password: '',
            useHttps: false,
            customPort: 8080
        },
        OPTIONS: {
            category: '',
            savePath: '',
            paused: false,
            skipHashCheck: false,
            autoDownload: true,
            showNotifications: true,
            showIndicators: true,
            scanDynamicContent: true
        },
        ADVANCED: {
            connectionTimeout: 30,
            retryAttempts: 3,
            debugLogging: false
        }
    },

    // Timeouts and intervals
    TIMEOUTS: {
        AUTH_CACHE: 30 * 60 * 1000, // 30 minutes
        CONNECTION_TEST: 10 * 1000, // 10 seconds
        NOTIFICATION: 4000, // 4 seconds
        SCAN_INTERVAL: 5000 // 5 seconds
    }
};

// Export for browser environment
if (typeof window !== 'undefined') {
    window.CONSTANTS = CONSTANTS;
}

// utils/storage.js
class StorageManager {
    static async get(keys = null) {
        return new Promise((resolve) => {
            chrome.storage.sync.get(keys, resolve);
        });
    }

    static async set(items) {
        return new Promise((resolve) => {
            chrome.storage.sync.set(items, resolve);
        });
    }

    static async remove(keys) {
        return new Promise((resolve) => {
            chrome.storage.sync.remove(keys, resolve);
        });
    }

    static async clear() {
        return new Promise((resolve) => {
            chrome.storage.sync.clear(resolve);
        });
    }

    static async getServerSettings() {
        const result = await this.get(['server']);
        return result.server || CONSTANTS.DEFAULTS.SERVER;
    }

    static async getOptions() {
        const result = await this.get(['options']);
        return { ...CONSTANTS.DEFAULTS.OPTIONS, ...result.options };
    }

    static async getAdvancedSettings() {
        const result = await this.get(['advanced']);
        return { ...CONSTANTS.DEFAULTS.ADVANCED, ...result.advanced };
    }

    static async getSiteSettings() {
        const result = await this.get(['siteSettings']);
        return result.siteSettings || { whitelist: [], blacklist: [] };
    }
}

// Export for browser environment
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}