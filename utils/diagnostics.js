/**
 * Diagnostic data collection and export system for qBittorrent browser extension
 * Provides comprehensive system information gathering for troubleshooting and support
 *
 * @class Diagnostics
 * @since 1.0.0
 * @example
 * // Collect diagnostic data
 * const data = await Diagnostics.collect();
 *
 * // Export for support
 * const exportData = await Diagnostics.exportForSupport();
 *
 * // Get quick system summary
 * const summary = Diagnostics.getSystemSummary();
 */
class Diagnostics {
    static COLLECTION_TIMEOUT = 30000; // 30 seconds
    static MAX_LOG_ENTRIES = 100;
    static MAX_EXPORT_SIZE_MB = 10;

    static PRIVACY_MODES = {
        FULL: 'full',
        ANONYMOUS: 'anonymous',
        MINIMAL: 'minimal'
    };

    static SENSITIVE_FIELDS = [
        'password', 'token', 'key', 'secret', 'auth', 'credential',
        'session', 'cookie', 'username', 'email', 'ip', 'hostname'
    ];

    /**
     * Collect comprehensive diagnostic data
     * @param {object} [options] - Collection options
     * @param {string} [options.privacyMode] - Privacy mode for data collection
     * @param {boolean} [options.includeLogs] - Include log data
     * @param {boolean} [options.includePerformance] - Include performance metrics
     * @param {boolean} [options.includeStorage] - Include storage information
     * @returns {object} Diagnostic data
     */
    static async collect(options = {}) {
        const {
            privacyMode = Diagnostics.PRIVACY_MODES.ANONYMOUS,
            includeLogs = true,
            includePerformance = true,
            includeStorage = true
        } = options;

        const startTime = Date.now();
        const diagnostics = {
            collection: {
                timestamp: new Date().toISOString(),
                privacyMode,
                version: '1.0.0'
            }
        };

        try {
            // Core system information
            diagnostics.system = await Diagnostics._collectSystemInfo(privacyMode);
            
            // Extension information
            diagnostics.extension = await Diagnostics._collectExtensionInfo(privacyMode);
            
            // Storage information
            if (includeStorage) {
                diagnostics.storage = await Diagnostics._collectStorageInfo(privacyMode);
            }
            
            // Performance metrics
            if (includePerformance) {
                diagnostics.performance = await Diagnostics._collectPerformanceInfo();
            }
            
            // Health status
            diagnostics.health = await Diagnostics._collectHealthInfo();
            
            // Error statistics
            diagnostics.errors = await Diagnostics._collectErrorInfo();
            
            // Logs
            if (includeLogs) {
                diagnostics.logs = await Diagnostics._collectLogInfo(privacyMode);
            }
            
            // Configuration
            diagnostics.configuration = await Diagnostics._collectConfigurationInfo(privacyMode);
            
            // Connection status
            diagnostics.connectivity = await Diagnostics._collectConnectivityInfo(privacyMode);

            diagnostics.collection.completedIn = Date.now() - startTime;
            diagnostics.collection.success = true;

        } catch (error) {
            diagnostics.collection.error = error.message;
            diagnostics.collection.success = false;
            diagnostics.collection.completedIn = Date.now() - startTime;

            if (typeof window !== 'undefined' && window.ErrorHandler) {
                window.ErrorHandler.handle(error, 'diagnostics', { operation: 'collect' });
            }
        }

        return diagnostics;
    }

    /**
     * Export diagnostic data for support purposes
     * @param {object} [options] - Export options
     * @returns {object} Export package
     */
    static async exportForSupport(options = {}) {
        const {
            privacyMode = Diagnostics.PRIVACY_MODES.ANONYMOUS,
            format = 'json',
            compress = true
        } = options;

        try {
            const diagnostics = await Diagnostics.collect({
                privacyMode,
                includeLogs: true,
                includePerformance: true,
                includeStorage: true
            });

            const exportPackage = {
                exportInfo: {
                    timestamp: new Date().toISOString(),
                    format,
                    privacyMode,
                    compressed: compress,
                    version: '1.0.0'
                },
                data: diagnostics,
                instructions: {
                    description: 'qBittorrent Extension Diagnostic Export',
                    howToUse: 'Send this file to support for troubleshooting assistance',
                    privacyNote: `Data collected in ${privacyMode} privacy mode`
                }
            };

            // Add size information
            const jsonString = JSON.stringify(exportPackage);
            exportPackage.exportInfo.sizeBytes = new Blob([jsonString]).size;
            exportPackage.exportInfo.sizeMB = (exportPackage.exportInfo.sizeBytes / (1024 * 1024)).toFixed(2);

            return exportPackage;

        } catch (error) {
            if (typeof window !== 'undefined' && window.ErrorHandler) {
                window.ErrorHandler.handle(error, 'diagnostics', { operation: 'export' });
            }
            throw error;
        }
    }

    /**
     * Get quick system summary
     * @returns {object} System summary
     */
    static getSystemSummary() {
        const summary = {
            timestamp: new Date().toISOString(),
            browser: Diagnostics._getBrowserInfo(),
            extension: Diagnostics._getExtensionVersion(),
            connectivity: 'unknown',
            health: 'unknown'
        };

        // Add health status if monitor is available
        if (typeof window !== 'undefined' && window.Monitor) {
            try {
                const healthStatus = window.Monitor.getHealthStatus();
                summary.health = healthStatus?.overall ? 'healthy' : 'unhealthy';
            } catch (e) {
                summary.health = 'error';
            }
        }

        return summary;
    }

    /**
     * Collect system information
     * @private
     */
    static async _collectSystemInfo(privacyMode) {
        const info = {
            timestamp: new Date().toISOString(),
            browser: Diagnostics._getBrowserInfo(),
            platform: Diagnostics._getPlatformInfo(),
            memory: Diagnostics._getMemoryInfo(),
            timing: Diagnostics._getTimingInfo()
        };

        if (privacyMode === Diagnostics.PRIVACY_MODES.FULL) {
            info.userAgent = navigator.userAgent;
            info.language = navigator.language;
            info.languages = navigator.languages;
            info.cookieEnabled = navigator.cookieEnabled;
            info.onLine = navigator.onLine;
        }

        return info;
    }

    /**
     * Collect extension information
     * @private
     */
    static async _collectExtensionInfo(privacyMode) {
        const info = {
            version: Diagnostics._getExtensionVersion(),
            manifest: null,
            permissions: [],
            context: 'unknown'
        };

        try {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                const manifest = chrome.runtime.getManifest();
                info.manifest = {
                    name: manifest.name,
                    version: manifest.version,
                    manifestVersion: manifest.manifest_version
                };

                if (privacyMode === Diagnostics.PRIVACY_MODES.FULL) {
                    info.permissions = manifest.permissions || [];
                    info.hostPermissions = manifest.host_permissions || [];
                }

                info.context = chrome.runtime.id ? 'valid' : 'invalid';
                info.extensionId = privacyMode === Diagnostics.PRIVACY_MODES.FULL ? chrome.runtime.id : '[REDACTED]';
            }
        } catch (error) {
            info.error = error.message;
        }

        return info;
    }

    /**
     * Collect storage information
     * @private
     */
    static async _collectStorageInfo(privacyMode) {
        const info = {
            available: false,
            bytesInUse: 0,
            quota: null,
            keys: []
        };

        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                info.available = true;
                info.bytesInUse = await chrome.storage.local.getBytesInUse();
                
                if (chrome.storage.local.QUOTA_BYTES) {
                    info.quota = chrome.storage.local.QUOTA_BYTES;
                    info.utilizationPercent = (info.bytesInUse / info.quota) * 100;
                }

                if (privacyMode !== Diagnostics.PRIVACY_MODES.MINIMAL) {
                    const allData = await chrome.storage.local.get();
                    info.keys = Object.keys(allData);
                    info.keyCount = info.keys.length;
                }
            }
        } catch (error) {
            info.error = error.message;
        }

        return info;
    }

    /**
     * Collect performance information
     * @private
     */
    static async _collectPerformanceInfo() {
        const info = {
            memory: Diagnostics._getMemoryInfo(),
            timing: Diagnostics._getTimingInfo(),
            navigation: null,
            monitor: null
        };

        try {
            if (typeof performance !== 'undefined' && performance.getEntriesByType) {
                info.navigation = performance.getEntriesByType('navigation')[0] || null;
            }

            // Get monitor data if available
            if (typeof window !== 'undefined' && window.Monitor) {
                info.monitor = window.Monitor.getPerformanceMetrics();
            }
        } catch (error) {
            info.error = error.message;
        }

        return info;
    }

    /**
     * Collect health information
     * @private
     */
    static async _collectHealthInfo() {
        const info = {
            available: false,
            status: null
        };

        try {
            if (typeof window !== 'undefined' && window.Monitor) {
                info.available = true;
                info.status = await window.Monitor.getHealthStatus();
            }
        } catch (error) {
            info.error = error.message;
        }

        return info;
    }

    /**
     * Collect error information
     * @private
     */
    static async _collectErrorInfo() {
        const info = {
            available: false,
            statistics: null
        };

        try {
            if (typeof window !== 'undefined' && window.ErrorHandler) {
                info.available = true;
                info.statistics = window.ErrorHandler.getErrorStats();
            }
        } catch (error) {
            info.error = error.message;
        }

        return info;
    }

    /**
     * Collect log information
     * @private
     */
    static async _collectLogInfo(privacyMode) {
        const info = {
            available: false,
            recentLogs: [],
            count: 0
        };

        try {
            if (typeof window !== 'undefined' && window.Logger) {
                info.available = true;
                
                // Get recent logs
                const diagnostics = await window.Logger.getDiagnostics();
                if (diagnostics && diagnostics.recentLogs) {
                    info.recentLogs = diagnostics.recentLogs
                        .slice(-Diagnostics.MAX_LOG_ENTRIES)
                        .map(log => Diagnostics._sanitizeLogEntry(log, privacyMode));
                    info.count = info.recentLogs.length;
                }
            }
        } catch (error) {
            info.error = error.message;
        }

        return info;
    }

    /**
     * Collect configuration information
     * @private
     */
    static async _collectConfigurationInfo(privacyMode) {
        const info = {
            server: null,
            options: null,
            advanced: null,
            siteSettings: null
        };

        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.sync.get();
                
                info.server = Diagnostics._sanitizeServerConfig(result.server, privacyMode);
                info.options = result.options || null;
                info.advanced = result.advanced || null;
                info.siteSettings = privacyMode === Diagnostics.PRIVACY_MODES.FULL ? result.siteSettings : null;
            }
        } catch (error) {
            info.error = error.message;
        }

        return info;
    }

    /**
     * Collect connectivity information
     * @private
     */
    static async _collectConnectivityInfo(privacyMode) {
        const info = {
            online: navigator.onLine,
            connectionTest: null,
            serverReachable: false
        };

        try {
            // Test basic connectivity
            if (navigator.onLine) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                try {
                    const response = await fetch('https://www.google.com/favicon.ico', {
                        method: 'HEAD',
                        signal: controller.signal,
                        cache: 'no-cache'
                    });
                    
                    clearTimeout(timeoutId);
                    info.connectionTest = {
                        success: response.ok,
                        status: response.status
                    };
                } catch (fetchError) {
                    clearTimeout(timeoutId);
                    info.connectionTest = {
                        success: false,
                        error: fetchError.message
                    };
                }
            }

            // Test server connectivity if available
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.sync.get(['server']);
                if (result.server && result.server.url && privacyMode !== Diagnostics.PRIVACY_MODES.MINIMAL) {
                    try {
                        const serverUrl = privacyMode === Diagnostics.PRIVACY_MODES.FULL ? 
                            result.server.url : '[REDACTED]';
                        
                        const response = await fetch(`${result.server.url}/api/v2/app/version`, {
                            method: 'HEAD',
                            cache: 'no-cache'
                        });
                        
                        info.serverReachable = response.ok;
                        info.serverTest = {
                            url: serverUrl,
                            success: response.ok,
                            status: response.status
                        };
                    } catch (serverError) {
                        info.serverTest = {
                            url: privacyMode === Diagnostics.PRIVACY_MODES.FULL ? result.server.url : '[REDACTED]',
                            success: false,
                            error: serverError.message
                        };
                    }
                }
            }
        } catch (error) {
            info.error = error.message;
        }

        return info;
    }

    // Utility methods

    static _getBrowserInfo() {
        if (typeof navigator === 'undefined') return null;

        const userAgent = navigator.userAgent;
        let browser = 'Unknown';
        let version = 'Unknown';

        if (userAgent.includes('Chrome')) {
            browser = 'Chrome';
            const match = userAgent.match(/Chrome\/(\d+)/);
            version = match ? match[1] : 'Unknown';
        } else if (userAgent.includes('Firefox')) {
            browser = 'Firefox';
            const match = userAgent.match(/Firefox\/(\d+)/);
            version = match ? match[1] : 'Unknown';
        } else if (userAgent.includes('Safari')) {
            browser = 'Safari';
            const match = userAgent.match(/Version\/(\d+)/);
            version = match ? match[1] : 'Unknown';
        } else if (userAgent.includes('Edge')) {
            browser = 'Edge';
            const match = userAgent.match(/Edge\/(\d+)/);
            version = match ? match[1] : 'Unknown';
        }

        return { browser, version };
    }

    static _getPlatformInfo() {
        if (typeof navigator === 'undefined') return null;

        return {
            platform: navigator.platform,
            hardwareConcurrency: navigator.hardwareConcurrency,
            maxTouchPoints: navigator.maxTouchPoints
        };
    }

    static _getMemoryInfo() {
        if (typeof performance === 'undefined' || !performance.memory) {
            return null;
        }

        return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
    }

    static _getTimingInfo() {
        if (typeof performance === 'undefined') return null;

        return {
            now: performance.now(),
            timeOrigin: performance.timeOrigin
        };
    }

    static _getExtensionVersion() {
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
                return chrome.runtime.getManifest().version;
            }
        } catch (error) {
            // Fallback to constants
            if (typeof CONSTANTS !== 'undefined' && CONSTANTS.VERSION) {
                return CONSTANTS.VERSION;
            }
        }
        return 'unknown';
    }

    static _sanitizeLogEntry(log, privacyMode) {
        if (privacyMode === Diagnostics.PRIVACY_MODES.MINIMAL) {
            return {
                level: log.level,
                timestamp: log.timestamp,
                component: log.component
            };
        }

        const sanitized = { ...log };
        
        if (privacyMode !== Diagnostics.PRIVACY_MODES.FULL) {
            // Remove sensitive context data
            if (sanitized.context) {
                sanitized.context = Diagnostics._sanitizeObject(sanitized.context);
            }
            
            // Sanitize error details
            if (sanitized.error && sanitized.error.stack) {
                sanitized.error.stack = '[REDACTED]';
            }
        }

        return sanitized;
    }

    static _sanitizeServerConfig(serverConfig, privacyMode) {
        if (!serverConfig) return null;

        if (privacyMode === Diagnostics.PRIVACY_MODES.MINIMAL) {
            return {
                configured: !!serverConfig.url,
                useHttps: serverConfig.useHttps
            };
        }

        const sanitized = { ...serverConfig };
        
        if (privacyMode !== Diagnostics.PRIVACY_MODES.FULL) {
            if (sanitized.url) {
                try {
                    const url = new URL(sanitized.url);
                    sanitized.url = `${url.protocol}//[REDACTED]:${url.port}`;
                } catch {
                    sanitized.url = '[REDACTED]';
                }
            }
            sanitized.username = sanitized.username ? '[REDACTED]' : null;
            sanitized.password = sanitized.password ? '[REDACTED]' : null;
        }

        return sanitized;
    }

    static _sanitizeObject(obj) {
        if (!obj || typeof obj !== 'object') return obj;

        const sanitized = {};
        
        for (const [key, value] of Object.entries(obj)) {
            const keyLower = key.toLowerCase();
            const shouldRedact = Diagnostics.SENSITIVE_FIELDS.some(field => 
                keyLower.includes(field)
            );

            if (shouldRedact) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = Diagnostics._sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }
}

// Export for browser environment
if (typeof window !== 'undefined') {
    window.Diagnostics = Diagnostics;
}