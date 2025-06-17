/**
 * Background monitoring and health check service for qBittorrent browser extension
 * Provides continuous monitoring, performance tracking, and system health assessment
 *
 * @class Monitor
 * @since 1.0.0
 * @example
 * // Start monitoring
 * Monitor.start();
 *
 * // Get current health status
 * const health = await Monitor.getHealthStatus();
 *
 * // Record custom metric
 * Monitor.recordMetric('api_response_time', 150, { endpoint: '/login' });
 */
class Monitor {
    static HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
    static PERFORMANCE_SAMPLE_INTERVAL = 30 * 1000; // 30 seconds
    static STORAGE_CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes
    static CONNECTION_CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutes

    static HEALTH_THRESHOLDS = {
        MEMORY_MB: 100, // Max memory usage in MB
        STORAGE_MB: 50, // Max storage usage in MB
        ERROR_RATE: 0.1, // Max error rate (10%)
        RESPONSE_TIME_MS: 5000, // Max API response time
        CONNECTION_TIMEOUT_MS: 10000 // Connection timeout
    };

    static METRIC_TYPES = {
        COUNTER: 'counter',
        GAUGE: 'gauge',
        HISTOGRAM: 'histogram',
        TIMER: 'timer'
    };

    static _instance = null;
    static _isRunning = false;

    constructor() {
        if (Monitor._instance) {
            return Monitor._instance;
        }

        this.healthChecks = new Map();
        this.metrics = new Map();
        this.performanceHistory = [];
        this.connectionHistory = [];
        this.intervals = new Map();
        this.lastHealthCheck = null;
        this.startTime = Date.now();

        Monitor._instance = this;
    }

    /**
     * Get singleton instance
     * @returns {Monitor} Monitor instance
     */
    static getInstance() {
        if (!Monitor._instance) {
            Monitor._instance = new Monitor();
        }
        return Monitor._instance;
    }

    /**
     * Start the monitoring service
     */
    static start() {
        const instance = Monitor.getInstance();
        if (Monitor._isRunning) {
            return;
        }

        instance._startMonitoring();
        Monitor._isRunning = true;

        if (typeof window !== 'undefined' && window.Logger) {
            window.Logger.info('Monitor service started');
        }
    }

    /**
     * Stop the monitoring service
     */
    static stop() {
        const instance = Monitor.getInstance();
        instance._stopMonitoring();
        Monitor._isRunning = false;

        if (typeof window !== 'undefined' && window.Logger) {
            window.Logger.info('Monitor service stopped');
        }
    }

    /**
     * Start all monitoring intervals
     * @private
     */
    _startMonitoring() {
        // Health checks
        this.intervals.set('health', setInterval(() => {
            this._performHealthChecks();
        }, Monitor.HEALTH_CHECK_INTERVAL));

        // Performance sampling
        this.intervals.set('performance', setInterval(() => {
            this._samplePerformance();
        }, Monitor.PERFORMANCE_SAMPLE_INTERVAL));

        // Storage monitoring
        this.intervals.set('storage', setInterval(() => {
            this._checkStorage();
        }, Monitor.STORAGE_CHECK_INTERVAL));

        // Connection monitoring
        this.intervals.set('connection', setInterval(() => {
            this._checkConnection();
        }, Monitor.CONNECTION_CHECK_INTERVAL));

        // Initial checks
        this._performHealthChecks();
        this._samplePerformance();
        this._checkStorage();
        this._checkConnection();
    }

    /**
     * Stop all monitoring intervals
     * @private
     */
    _stopMonitoring() {
        for (const [name, intervalId] of this.intervals) {
            clearInterval(intervalId);
        }
        this.intervals.clear();
    }

    /**
     * Perform comprehensive health checks
     * @private
     */
    async _performHealthChecks() {
        const checks = {
            timestamp: new Date().toISOString(),
            extension: await this._checkExtensionHealth(),
            storage: await this._checkStorageHealth(),
            memory: this._checkMemoryHealth(),
            api: await this._checkApiHealth(),
            overall: true
        };

        // Determine overall health
        checks.overall = Object.values(checks)
            .filter(v => typeof v === 'object' && v.healthy !== undefined)
            .every(check => check.healthy);

        this.lastHealthCheck = checks;

        // Log health issues
        if (!checks.overall && typeof window !== 'undefined' && window.Logger) {
            const failedChecks = Object.entries(checks)
                .filter(([key, value]) => typeof value === 'object' && value.healthy === false)
                .map(([key]) => key);

            window.Logger.warn('Health check failed', { failedChecks, checks });
        }

        // Store health check results
        if (typeof window !== 'undefined' && window.Logger) {
            window.Logger.recordHealth('overall', checks.overall, checks);
        }
    }

    /**
     * Check extension health
     * @private
     */
    async _checkExtensionHealth() {
        try {
            const healthy = typeof chrome !== 'undefined' &&
                           chrome.runtime &&
                           !chrome.runtime.lastError;

            const context = {
                runtimeAvailable: typeof chrome !== 'undefined' && Boolean(chrome.runtime),
                lastError: chrome.runtime?.lastError?.message || null,
                extensionId: chrome.runtime?.id || null
            };

            return { healthy, context };
        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                context: { error: 'Extension context check failed' }
            };
        }
    }

    /**
     * Check storage health
     * @private
     */
    async _checkStorageHealth() {
        try {
            if (!chrome.storage) {
                return {
                    healthy: false,
                    context: { error: 'Storage API not available' }
                };
            }

            // Test storage read/write
            const testKey = 'monitor_health_test';
            const testValue = Date.now().toString();

            await chrome.storage.local.set({ [testKey]: testValue });
            const result = await chrome.storage.local.get([testKey]);
            await chrome.storage.local.remove([testKey]);

            const healthy = result[testKey] === testValue;
            const bytesInUse = await chrome.storage.local.getBytesInUse();

            return {
                healthy,
                context: {
                    bytesInUse,
                    testPassed: healthy,
                    storageOverLimit: bytesInUse > Monitor.HEALTH_THRESHOLDS.STORAGE_MB * 1024 * 1024
                }
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                context: { error: 'Storage health check failed' }
            };
        }
    }

    /**
     * Check memory health
     * @private
     */
    _checkMemoryHealth() {
        try {
            if (typeof performance === 'undefined' || !performance.memory) {
                return {
                    healthy: true,
                    context: { error: 'Memory API not available' }
                };
            }

            const {memory} = performance;
            const usedMB = memory.usedJSHeapSize / (1024 * 1024);
            const totalMB = memory.totalJSHeapSize / (1024 * 1024);
            const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);

            const healthy = usedMB < Monitor.HEALTH_THRESHOLDS.MEMORY_MB;

            return {
                healthy,
                context: {
                    usedMB: Math.round(usedMB),
                    totalMB: Math.round(totalMB),
                    limitMB: Math.round(limitMB),
                    utilizationPercent: Math.round((usedMB / limitMB) * 100)
                }
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                context: { error: 'Memory health check failed' }
            };
        }
    }

    /**
     * Check API connectivity health
     * @private
     */
    async _checkApiHealth() {
        try {
            // Get server settings
            const settings = await this._getServerSettings();
            if (!settings || !settings.url) {
                return {
                    healthy: false,
                    context: { error: 'No server settings configured' }
                };
            }

            // Test connection with timeout
            const startTime = performance.now();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), Monitor.HEALTH_THRESHOLDS.CONNECTION_TIMEOUT_MS);

            try {
                const response = await fetch(`${settings.url}/api/v2/app/version`, {
                    method: 'GET',
                    signal: controller.signal,
                    credentials: 'omit'
                });

                clearTimeout(timeoutId);
                const responseTime = performance.now() - startTime;
                const healthy = responseTime < Monitor.HEALTH_THRESHOLDS.RESPONSE_TIME_MS;

                return {
                    healthy,
                    context: {
                        responseTime: Math.round(responseTime),
                        statusCode: response.status,
                        serverUrl: settings.url
                    }
                };
            } catch (fetchError) {
                clearTimeout(timeoutId);
                return {
                    healthy: false,
                    context: {
                        error: fetchError.name === 'AbortError' ? 'Connection timeout' : fetchError.message,
                        serverUrl: settings.url
                    }
                };
            }
        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                context: { error: 'API health check failed' }
            };
        }
    }

    /**
     * Sample current performance metrics
     * @private
     */
    _samplePerformance() {
        const sample = {
            timestamp: new Date().toISOString(),
            memory: this._getMemoryMetrics(),
            timing: this._getTimingMetrics(),
            uptime: Date.now() - this.startTime
        };

        this.performanceHistory.push(sample);

        // Keep only last hour of samples
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        this.performanceHistory = this.performanceHistory.filter(
            s => new Date(s.timestamp).getTime() > oneHourAgo
        );
    }

    /**
     * Check storage usage and cleanup if necessary
     * @private
     */
    async _checkStorage() {
        try {
            if (!chrome.storage) {return;}

            const bytesInUse = await chrome.storage.local.getBytesInUse();
            const maxBytes = Monitor.HEALTH_THRESHOLDS.STORAGE_MB * 1024 * 1024;

            if (bytesInUse > maxBytes) {
                if (typeof window !== 'undefined' && window.Logger) {
                    window.Logger.warn('Storage usage exceeded threshold', {
                        bytesInUse,
                        maxBytes,
                        utilizationPercent: (bytesInUse / maxBytes) * 100
                    });
                }

                // Trigger cleanup if Logger is available
                if (typeof window !== 'undefined' && window.Logger && typeof window.Logger._performStorageCleanup === 'function') {
                    await window.Logger._performStorageCleanup();
                }
            }

            this.recordMetric('storage_usage_bytes', bytesInUse, Monitor.METRIC_TYPES.GAUGE);
        } catch (error) {
            if (typeof window !== 'undefined' && window.ErrorHandler) {
                window.ErrorHandler.handle(error, 'storage', { operation: 'storage_check' });
            }
        }
    }

    /**
     * Check connection quality
     * @private
     */
    async _checkConnection() {
        try {
            const settings = await this._getServerSettings();
            if (!settings || !settings.url) {return;}

            const startTime = performance.now();

            try {
                const response = await fetch(`${settings.url}/api/v2/app/version`, {
                    method: 'HEAD',
                    cache: 'no-cache'
                });

                const responseTime = performance.now() - startTime;
                const connectionQuality = {
                    timestamp: new Date().toISOString(),
                    responseTime,
                    success: response.ok,
                    statusCode: response.status
                };

                this.connectionHistory.push(connectionQuality);

                // Keep only last 100 connection attempts
                if (this.connectionHistory.length > 100) {
                    this.connectionHistory.shift();
                }

                this.recordMetric('api_response_time', responseTime, Monitor.METRIC_TYPES.HISTOGRAM);
                this.recordMetric('api_success_rate', response.ok ? 1 : 0, Monitor.METRIC_TYPES.COUNTER);

            } catch (error) {
                const connectionQuality = {
                    timestamp: new Date().toISOString(),
                    responseTime: performance.now() - startTime,
                    success: false,
                    error: error.message
                };

                this.connectionHistory.push(connectionQuality);
                this.recordMetric('api_success_rate', 0, Monitor.METRIC_TYPES.COUNTER);
            }
        } catch (error) {
            if (typeof window !== 'undefined' && window.ErrorHandler) {
                window.ErrorHandler.handle(error, 'network', { operation: 'connection_check' });
            }
        }
    }

    /**
     * Record a custom metric
     * @param {string} name - Metric name
     * @param {number} value - Metric value
     * @param {string} [type] - Metric type
     * @param {object} [tags] - Additional tags
     */
    static recordMetric(name, value, type = Monitor.METRIC_TYPES.GAUGE, tags = {}) {
        Monitor.getInstance()._recordMetric(name, value, type, tags);
    }

    _recordMetric(name, value, type, tags) {
        const metric = {
            name,
            value,
            type,
            tags,
            timestamp: new Date().toISOString()
        };

        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }

        const metricHistory = this.metrics.get(name);
        metricHistory.push(metric);

        // Keep only last 1000 entries per metric
        if (metricHistory.length > 1000) {
            metricHistory.shift();
        }
    }

    /**
     * Get current health status
     * @returns {object} Health status
     */
    static async getHealthStatus() {
        const instance = Monitor.getInstance();
        return instance.lastHealthCheck || await instance._performHealthChecks();
    }

    /**
     * Get performance metrics summary
     * @returns {object} Performance summary
     */
    static getPerformanceMetrics() {
        const instance = Monitor.getInstance();

        const summary = {
            uptime: Date.now() - instance.startTime,
            memoryUsage: instance._getMemoryMetrics(),
            connectionQuality: instance._getConnectionQuality(),
            customMetrics: instance._getMetricsSummary()
        };

        return summary;
    }

    /**
     * Get connection quality metrics
     * @private
     */
    _getConnectionQuality() {
        if (this.connectionHistory.length === 0) {
            return { noData: true };
        }

        const recent = this.connectionHistory.slice(-10); // Last 10 attempts
        const successful = recent.filter(c => c.success).length;
        const avgResponseTime = recent
            .filter(c => c.responseTime)
            .reduce((sum, c) => sum + c.responseTime, 0) / recent.length;

        return {
            successRate: successful / recent.length,
            averageResponseTime: Math.round(avgResponseTime),
            totalAttempts: recent.length,
            lastCheck: recent[recent.length - 1]?.timestamp
        };
    }

    /**
     * Get metrics summary
     * @private
     */
    _getMetricsSummary() {
        const summary = {};

        for (const [name, history] of this.metrics) {
            if (history.length === 0) {continue;}

            const values = history.map(m => m.value);
            summary[name] = {
                current: values[values.length - 1],
                min: Math.min(...values),
                max: Math.max(...values),
                avg: values.reduce((sum, v) => sum + v, 0) / values.length,
                count: values.length
            };
        }

        return summary;
    }

    /**
     * Export monitoring data for diagnostics
     * @returns {object} Monitoring data
     */
    static exportData() {
        const instance = Monitor.getInstance();

        return {
            healthStatus: instance.lastHealthCheck,
            performanceHistory: instance.performanceHistory,
            connectionHistory: instance.connectionHistory,
            metrics: Object.fromEntries(instance.metrics),
            uptime: Date.now() - instance.startTime,
            isRunning: Monitor._isRunning
        };
    }

    // Utility methods

    async _getServerSettings() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.sync.get(['server']);
                return result.server;
            }
        } catch (error) {
            return null;
        }
    }

    _getMemoryMetrics() {
        if (typeof performance === 'undefined' || !performance.memory) {
            return null;
        }

        return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
    }

    _getTimingMetrics() {
        if (typeof performance === 'undefined' || !performance.now) {
            return null;
        }

        return {
            now: performance.now(),
            timeOrigin: performance.timeOrigin || Date.now()
        };
    }
}

// Auto-start monitoring when loaded in background context
if (typeof window !== 'undefined') {
    window.Monitor = Monitor;

    // Start monitoring if this is likely a background script
    if (typeof chrome !== 'undefined' && chrome.runtime && !window.location) {
        Monitor.start();
    }
}