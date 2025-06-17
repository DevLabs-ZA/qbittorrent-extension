/**
 * Comprehensive logging and monitoring system for qBittorrent browser extension
 * Provides centralized logging, error tracking, performance monitoring, and diagnostics
 *
 * @class Logger
 * @since 1.0.0
 * @example
 * // Basic logging
 * Logger.info('Extension initialized', { version: '1.0.0' });
 * Logger.error('Authentication failed', error, { username: 'admin' });
 *
 * // Performance monitoring
 * const timer = Logger.startTimer('api_request');
 * // ... perform operation
 * timer.end({ endpoint: '/api/v2/auth/login' });
 *
 * // Health monitoring
 * Logger.recordHealth('api_connectivity', true, { latency: 150 });
 */

class Logger {
    static LOG_LEVELS = {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3
    };

    static LOG_LEVEL_NAMES = ['ERROR', 'WARN', 'INFO', 'DEBUG'];

    static STORAGE_KEYS = {
        LOGS: 'extension_logs',
        SETTINGS: 'logging_settings',
        METRICS: 'performance_metrics',
        HEALTH: 'health_checks',
        DIAGNOSTICS: 'diagnostic_data'
    };

    static DEFAULT_SETTINGS = {
        logLevel: 2, // INFO level
        maxLogEntries: 1000,
        maxStorageMB: 5,
        enablePerformanceLogging: true,
        enableHealthMonitoring: true,
        enableDiagnostics: true,
        enableConsoleOutput: true,
        retentionDays: 7,
        compressionEnabled: true
    };

    static _instance = null;
    static _initialized = false;

    constructor() {
        if (Logger._instance) {
            return Logger._instance;
        }

        this.settings = { ...Logger.DEFAULT_SETTINGS };
        this.timers = new Map();
        this.healthMetrics = new Map();
        this.performanceBuffer = [];
        this.logBuffer = [];
        this.isDebugMode = false;
        
        Logger._instance = this;
        this._initializeAsync();
    }

    /**
     * Get singleton instance of Logger
     * @returns {Logger} Logger instance
     */
    static getInstance() {
        if (!Logger._instance) {
            Logger._instance = new Logger();
        }
        return Logger._instance;
    }

    /**
     * Initialize logger asynchronously
     * @private
     */
    async _initializeAsync() {
        if (Logger._initialized) return;

        try {
            await this._loadSettings();
            await this._setupStorage();
            await this._cleanupOldLogs();
            this._startPeriodicTasks();
            
            Logger._initialized = true;
            this.info('Logger initialized', { 
                settings: this.settings,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Logger initialization failed:', error);
        }
    }

    /**
     * Load logging settings from storage
     * @private
     */
    async _loadSettings() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.local.get([Logger.STORAGE_KEYS.SETTINGS]);
                if (result[Logger.STORAGE_KEYS.SETTINGS]) {
                    this.settings = { ...this.settings, ...result[Logger.STORAGE_KEYS.SETTINGS] };
                }
            }

            // Check if debug mode is enabled
            const advancedSettings = await this._getAdvancedSettings();
            this.isDebugMode = advancedSettings?.debugLogging || false;
            
            if (this.isDebugMode) {
                this.settings.logLevel = Logger.LOG_LEVELS.DEBUG;
                this.settings.enableConsoleOutput = true;
            }
        } catch (error) {
            console.warn('Failed to load logger settings:', error);
        }
    }

    /**
     * Get advanced settings from extension storage
     * @private
     */
    async _getAdvancedSettings() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.sync.get(['advanced']);
                return result.advanced;
            }
        } catch (error) {
            return null;
        }
    }

    /**
     * Setup storage structure
     * @private
     */
    async _setupStorage() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const keys = Object.values(Logger.STORAGE_KEYS);
                const result = await chrome.storage.local.get(keys);
                
                // Initialize empty arrays if they don't exist
                const updates = {};
                keys.forEach(key => {
                    if (!result[key]) {
                        updates[key] = [];
                    }
                });
                
                if (Object.keys(updates).length > 0) {
                    await chrome.storage.local.set(updates);
                }
            }
        } catch (error) {
            console.warn('Failed to setup logger storage:', error);
        }
    }

    /**
     * Clean up old log entries based on retention policy
     * @private
     */
    async _cleanupOldLogs() {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.settings.retentionDays);
            
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.local.get([Logger.STORAGE_KEYS.LOGS]);
                const logs = result[Logger.STORAGE_KEYS.LOGS] || [];
                
                const filteredLogs = logs.filter(log => 
                    new Date(log.timestamp) > cutoffDate
                );
                
                if (filteredLogs.length !== logs.length) {
                    await chrome.storage.local.set({
                        [Logger.STORAGE_KEYS.LOGS]: filteredLogs
                    });
                }
            }
        } catch (error) {
            console.warn('Failed to cleanup old logs:', error);
        }
    }

    /**
     * Start periodic maintenance tasks
     * @private
     */
    _startPeriodicTasks() {
        // Flush logs every 30 seconds
        setInterval(() => this._flushLogs(), 30000);
        
        // Cleanup and health check every 5 minutes
        setInterval(() => {
            this._cleanupOldLogs();
            this._performHealthCheck();
        }, 5 * 60 * 1000);
        
        // Storage size check every 10 minutes
        setInterval(() => this._checkStorageSize(), 10 * 60 * 1000);
    }

    /**
     * Log an error message
     * @param {string} message - Error message
     * @param {Error|object} error - Error object or additional context
     * @param {object} [context] - Additional context data
     */
    static error(message, error = null, context = {}) {
        Logger.getInstance()._log(Logger.LOG_LEVELS.ERROR, message, error, context);
    }

    /**
     * Log a warning message
     * @param {string} message - Warning message
     * @param {object} [context] - Additional context data
     */
    static warn(message, context = {}) {
        Logger.getInstance()._log(Logger.LOG_LEVELS.WARN, message, null, context);
    }

    /**
     * Log an info message
     * @param {string} message - Info message
     * @param {object} [context] - Additional context data
     */
    static info(message, context = {}) {
        Logger.getInstance()._log(Logger.LOG_LEVELS.INFO, message, null, context);
    }

    /**
     * Log a debug message
     * @param {string} message - Debug message
     * @param {object} [context] - Additional context data
     */
    static debug(message, context = {}) {
        Logger.getInstance()._log(Logger.LOG_LEVELS.DEBUG, message, null, context);
    }

    /**
     * Internal logging method
     * @private
     */
    _log(level, message, error = null, context = {}) {
        if (level > this.settings.logLevel) return;

        const logEntry = {
            id: this._generateId(),
            timestamp: new Date().toISOString(),
            level: Logger.LOG_LEVEL_NAMES[level],
            message: String(message),
            component: this._detectComponent(),
            context: this._sanitizeContext(context),
            error: error ? this._serializeError(error) : null,
            performance: this._getCurrentPerformanceMetrics(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
            extensionVersion: this._getExtensionVersion()
        };

        // Add to buffer
        this.logBuffer.push(logEntry);

        // Console output if enabled
        if (this.settings.enableConsoleOutput) {
            this._outputToConsole(logEntry);
        }

        // Flush buffer if it's getting large
        if (this.logBuffer.length >= 50) {
            this._flushLogs();
        }
    }

    /**
     * Start a performance timer
     * @param {string} operation - Operation name
     * @param {object} [context] - Additional context
     * @returns {object} Timer object with end() method
     */
    static startTimer(operation, context = {}) {
        return Logger.getInstance()._startTimer(operation, context);
    }

    _startTimer(operation, context = {}) {
        const timerId = this._generateId();
        const startTime = performance.now();
        
        this.timers.set(timerId, {
            operation,
            startTime,
            context
        });

        return {
            end: (additionalContext = {}) => {
                const timer = this.timers.get(timerId);
                if (timer) {
                    const duration = performance.now() - timer.startTime;
                    this.timers.delete(timerId);
                    
                    this._recordPerformance(timer.operation, duration, {
                        ...timer.context,
                        ...additionalContext
                    });
                }
            }
        };
    }

    /**
     * Record performance metric
     * @private
     */
    _recordPerformance(operation, duration, context = {}) {
        if (!this.settings.enablePerformanceLogging) return;

        const metric = {
            id: this._generateId(),
            timestamp: new Date().toISOString(),
            operation,
            duration,
            context,
            memoryUsage: this._getMemoryUsage()
        };

        this.performanceBuffer.push(metric);
        
        // Log slow operations
        if (duration > 1000) { // > 1 second
            this.warn(`Slow operation detected: ${operation}`, {
                duration,
                context
            });
        }
    }

    /**
     * Record health metric
     * @param {string} component - Component name
     * @param {boolean} healthy - Health status
     * @param {object} [metrics] - Additional metrics
     */
    static recordHealth(component, healthy, metrics = {}) {
        Logger.getInstance()._recordHealth(component, healthy, metrics);
    }

    _recordHealth(component, healthy, metrics = {}) {
        if (!this.settings.enableHealthMonitoring) return;

        const healthEntry = {
            id: this._generateId(),
            timestamp: new Date().toISOString(),
            component,
            healthy,
            metrics
        };

        this.healthMetrics.set(component, healthEntry);
        
        if (!healthy) {
            this.error(`Health check failed for ${component}`, null, metrics);
        }
    }

    /**
     * Get current system diagnostics
     * @returns {object} Diagnostic data
     */
    static async getDiagnostics() {
        return await Logger.getInstance()._getDiagnostics();
    }

    async _getDiagnostics() {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            extensionInfo: {
                version: this._getExtensionVersion(),
                manifest: await this._getManifestInfo()
            },
            systemInfo: {
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
                language: typeof navigator !== 'undefined' ? navigator.language : null,
                onLine: typeof navigator !== 'undefined' ? navigator.onLine : null,
                memory: this._getMemoryUsage()
            },
            storageInfo: await this._getStorageInfo(),
            healthStatus: Array.from(this.healthMetrics.values()),
            recentLogs: await this._getRecentLogs(20),
            performanceMetrics: this._getPerformanceSummary(),
            settings: this.settings
        };

        if (this.settings.enableDiagnostics) {
            await this._storeDiagnostics(diagnostics);
        }

        return diagnostics;
    }

    /**
     * Export logs and diagnostics for support
     * @returns {object} Export data
     */
    static async exportDiagnostics() {
        const logger = Logger.getInstance();
        const diagnostics = await logger._getDiagnostics();
        const allLogs = await logger._getAllLogs();
        
        return {
            exportDate: new Date().toISOString(),
            extensionVersion: logger._getExtensionVersion(),
            diagnostics,
            logs: allLogs,
            compressed: logger.settings.compressionEnabled
        };
    }

    /**
     * Update logger settings
     * @param {object} newSettings - New settings to apply
     */
    static async updateSettings(newSettings) {
        const logger = Logger.getInstance();
        logger.settings = { ...logger.settings, ...newSettings };
        
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({
                    [Logger.STORAGE_KEYS.SETTINGS]: logger.settings
                });
            }
            
            logger.info('Logger settings updated', { settings: newSettings });
        } catch (error) {
            logger.error('Failed to save logger settings', error);
        }
    }

    /**
     * Flush log buffer to storage
     * @private
     */
    async _flushLogs() {
        if (this.logBuffer.length === 0) return;

        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.local.get([Logger.STORAGE_KEYS.LOGS]);
                const existingLogs = result[Logger.STORAGE_KEYS.LOGS] || [];
                
                const allLogs = [...existingLogs, ...this.logBuffer];
                
                // Enforce max entries limit
                if (allLogs.length > this.settings.maxLogEntries) {
                    allLogs.splice(0, allLogs.length - this.settings.maxLogEntries);
                }
                
                await chrome.storage.local.set({
                    [Logger.STORAGE_KEYS.LOGS]: allLogs
                });
            }
            
            this.logBuffer = [];
        } catch (error) {
            console.error('Failed to flush logs:', error);
        }
    }

    /**
     * Perform system health check
     * @private
     */
    async _performHealthCheck() {
        try {
            // Check storage availability
            const storageHealthy = await this._checkStorageHealth();
            this._recordHealth('storage', storageHealthy);
            
            // Check memory usage
            const memoryUsage = this._getMemoryUsage();
            const memoryHealthy = !memoryUsage || memoryUsage.usedJSHeapSize < 50 * 1024 * 1024; // 50MB
            this._recordHealth('memory', memoryHealthy, { memoryUsage });
            
            // Check extension context
            const extensionHealthy = typeof chrome !== 'undefined' && chrome.runtime && !chrome.runtime.lastError;
            this._recordHealth('extension_context', extensionHealthy);
            
        } catch (error) {
            this.error('Health check failed', error);
        }
    }

    /**
     * Check storage health
     * @private
     */
    async _checkStorageHealth() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const testKey = 'health_check_test';
                const testValue = Date.now().toString();
                
                await chrome.storage.local.set({ [testKey]: testValue });
                const result = await chrome.storage.local.get([testKey]);
                await chrome.storage.local.remove([testKey]);
                
                return result[testKey] === testValue;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check storage size and cleanup if necessary
     * @private
     */
    async _checkStorageSize() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const bytesInUse = await chrome.storage.local.getBytesInUse();
                const maxBytes = this.settings.maxStorageMB * 1024 * 1024;
                
                if (bytesInUse > maxBytes) {
                    this.warn('Storage size limit exceeded, performing cleanup', {
                        bytesInUse,
                        maxBytes
                    });
                    
                    await this._performStorageCleanup();
                }
            }
        } catch (error) {
            this.error('Storage size check failed', error);
        }
    }

    /**
     * Perform storage cleanup
     * @private
     */
    async _performStorageCleanup() {
        try {
            // Remove old logs first
            const result = await chrome.storage.local.get([Logger.STORAGE_KEYS.LOGS]);
            const logs = result[Logger.STORAGE_KEYS.LOGS] || [];
            
            // Keep only the most recent 50% of logs
            const reducedLogs = logs.slice(-Math.floor(logs.length * 0.5));
            
            await chrome.storage.local.set({
                [Logger.STORAGE_KEYS.LOGS]: reducedLogs
            });
            
            this.info('Storage cleanup completed', {
                originalCount: logs.length,
                reducedCount: reducedLogs.length
            });
        } catch (error) {
            this.error('Storage cleanup failed', error);
        }
    }

    // Utility methods

    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    _detectComponent() {
        const stack = new Error().stack;
        if (!stack) return 'unknown';
        
        const lines = stack.split('\n');
        for (const line of lines) {
            if (line.includes('background/')) return 'background';
            if (line.includes('content/')) return 'content';
            if (line.includes('popup/')) return 'popup';
            if (line.includes('options/')) return 'options';
        }
        return 'unknown';
    }

    _sanitizeContext(context) {
        if (!context || typeof context !== 'object') return {};
        
        // Remove sensitive data
        const sanitized = { ...context };
        const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];
        
        Object.keys(sanitized).forEach(key => {
            if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                sanitized[key] = '[REDACTED]';
            }
        });
        
        return sanitized;
    }

    _serializeError(error) {
        if (error instanceof Error) {
            return {
                name: error.name,
                message: error.message,
                stack: error.stack
            };
        }
        return error;
    }

    _getCurrentPerformanceMetrics() {
        if (typeof performance !== 'undefined' && performance.memory) {
            return {
                timestamp: performance.now(),
                memory: {
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize
                }
            };
        }
        return null;
    }

    _getMemoryUsage() {
        if (typeof performance !== 'undefined' && performance.memory) {
            return {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }

    _getExtensionVersion() {
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

    async _getManifestInfo() {
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
                const manifest = chrome.runtime.getManifest();
                return {
                    name: manifest.name,
                    version: manifest.version,
                    manifestVersion: manifest.manifest_version,
                    permissions: manifest.permissions || []
                };
            }
        } catch (error) {
            return null;
        }
    }

    async _getStorageInfo() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const bytesInUse = await chrome.storage.local.getBytesInUse();
                return {
                    bytesInUse,
                    maxBytes: this.settings.maxStorageMB * 1024 * 1024,
                    utilizationPercent: (bytesInUse / (this.settings.maxStorageMB * 1024 * 1024)) * 100
                };
            }
        } catch (error) {
            return null;
        }
    }

    async _getRecentLogs(count = 20) {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.local.get([Logger.STORAGE_KEYS.LOGS]);
                const logs = result[Logger.STORAGE_KEYS.LOGS] || [];
                return logs.slice(-count);
            }
        } catch (error) {
            return [];
        }
    }

    async _getAllLogs() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.local.get([Logger.STORAGE_KEYS.LOGS]);
                return result[Logger.STORAGE_KEYS.LOGS] || [];
            }
        } catch (error) {
            return [];
        }
    }

    _getPerformanceSummary() {
        const summary = {
            totalMetrics: this.performanceBuffer.length,
            averageDuration: 0,
            slowOperations: 0
        };

        if (this.performanceBuffer.length > 0) {
            const totalDuration = this.performanceBuffer.reduce((sum, metric) => sum + metric.duration, 0);
            summary.averageDuration = totalDuration / this.performanceBuffer.length;
            summary.slowOperations = this.performanceBuffer.filter(metric => metric.duration > 1000).length;
        }

        return summary;
    }

    async _storeDiagnostics(diagnostics) {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({
                    [Logger.STORAGE_KEYS.DIAGNOSTICS]: diagnostics
                });
            }
        } catch (error) {
            console.error('Failed to store diagnostics:', error);
        }
    }

    _outputToConsole(logEntry) {
        const { level, message, context, error } = logEntry;
        const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
        const prefix = `[${timestamp}] [${level}] [${logEntry.component}]`;
        
        switch (level) {
            case 'ERROR':
                console.error(prefix, message, error || '', context);
                break;
            case 'WARN':
                console.warn(prefix, message, context);
                break;
            case 'INFO':
                console.info(prefix, message, context);
                break;
            case 'DEBUG':
                console.debug(prefix, message, context);
                break;
            default:
                console.log(prefix, message, context);
        }
    }
}

// Auto-initialize when loaded
if (typeof window !== 'undefined') {
    window.Logger = Logger;
    // Initialize singleton instance
    Logger.getInstance();
}
