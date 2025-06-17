/**
 * @jest-environment jsdom
 */

const Logger = require('../../../utils/logger.js');

// Mock chrome storage API
const mockChromeStorage = {
    local: {
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
        getBytesInUse: jest.fn(),
        QUOTA_BYTES: 5242880 // 5MB
    },
    sync: {
        get: jest.fn()
    }
};

// Mock chrome runtime API
const mockChromeRuntime = {
    getManifest: jest.fn(() => ({
        version: '1.0.0',
        name: 'Test Extension'
    })),
    id: 'test-extension-id'
};

global.chrome = {
    storage: mockChromeStorage,
    runtime: mockChromeRuntime
};

// Mock performance API
global.performance = {
    now: jest.fn(() => 1000),
    memory: {
        usedJSHeapSize: 1024 * 1024,
        totalJSHeapSize: 2 * 1024 * 1024,
        jsHeapSizeLimit: 4 * 1024 * 1024
    }
};

describe('Logger', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockChromeStorage.local.get.mockResolvedValue({});
        mockChromeStorage.sync.get.mockResolvedValue({});
        mockChromeStorage.local.getBytesInUse.mockResolvedValue(1024);

        // Reset singleton
        Logger._instance = null;
        Logger._initialized = false;
    });

    afterEach(() => {
        // Clean up any timers
        jest.clearAllTimers();
    });

    describe('Singleton Pattern', () => {
        test('should return same instance on multiple calls', () => {
            const instance1 = Logger.getInstance();
            const instance2 = Logger.getInstance();
            expect(instance1).toBe(instance2);
        });

        test('should create new instance with constructor', () => {
            const instance1 = new Logger();
            const instance2 = new Logger();
            expect(instance1).toBe(instance2);
        });
    });

    describe('Log Levels', () => {
        test('should log error messages', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            Logger.error('Test error message', new Error('Test error'));

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        test('should log warning messages', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            Logger.warn('Test warning message');

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        test('should log info messages', async () => {
            const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

            Logger.info('Test info message');

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        test('should log debug messages when debug level is enabled', async () => {
            const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

            // Set debug level
            await Logger.updateSettings({ logLevel: Logger.LOG_LEVELS.DEBUG });
            Logger.debug('Test debug message');

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        test('should not log debug messages when debug level is disabled', async () => {
            const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

            // Set info level
            await Logger.updateSettings({ logLevel: Logger.LOG_LEVELS.INFO });
            Logger.debug('Test debug message');

            expect(consoleSpy).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('Performance Timing', () => {
        test('should start and end performance timers', () => {
            const timer = Logger.startTimer('test_operation');
            expect(timer).toBeDefined();
            expect(typeof timer.end).toBe('function');

            timer.end({ additional: 'context' });
            // Should not throw
        });

        test('should handle timer end without start', () => {
            const timer = { end: () => {} };
            expect(() => timer.end()).not.toThrow();
        });
    });

    describe('Health Recording', () => {
        test('should record health metrics', () => {
            Logger.recordHealth('test_component', true, { metric: 'value' });
            // Should not throw
        });

        test('should record unhealthy status', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            Logger.recordHealth('test_component', false, { error: 'Component failed' });

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('Diagnostics', () => {
        test('should collect diagnostic data', async () => {
            const diagnostics = await Logger.getDiagnostics();

            expect(diagnostics).toBeDefined();
            expect(diagnostics.timestamp).toBeDefined();
            expect(diagnostics.extensionInfo).toBeDefined();
            expect(diagnostics.systemInfo).toBeDefined();
        });

        test('should export diagnostic data', async () => {
            const exportData = await Logger.exportDiagnostics();

            expect(exportData).toBeDefined();
            expect(exportData.exportDate).toBeDefined();
            expect(exportData.extensionVersion).toBeDefined();
            expect(exportData.diagnostics).toBeDefined();
            expect(exportData.logs).toBeDefined();
        });
    });

    describe('Settings Management', () => {
        test('should update logger settings', async () => {
            const newSettings = {
                logLevel: Logger.LOG_LEVELS.DEBUG,
                maxLogEntries: 500
            };

            await Logger.updateSettings(newSettings);

            expect(mockChromeStorage.local.set).toHaveBeenCalledWith({
                [Logger.STORAGE_KEYS.SETTINGS]: expect.objectContaining(newSettings)
            });
        });

        test('should load settings from storage', async () => {
            const savedSettings = {
                logLevel: Logger.LOG_LEVELS.ERROR,
                maxLogEntries: 2000
            };

            mockChromeStorage.local.get.mockResolvedValue({
                [Logger.STORAGE_KEYS.SETTINGS]: savedSettings
            });

            const instance = Logger.getInstance();
            await instance._loadSettings();

            expect(instance.settings.logLevel).toBe(savedSettings.logLevel);
            expect(instance.settings.maxLogEntries).toBe(savedSettings.maxLogEntries);
        });
    });

    describe('Storage Management', () => {
        test('should enforce log entry limits', async () => {
            const instance = Logger.getInstance();
            instance.settings.maxLogEntries = 2;

            // Add more logs than the limit
            Logger.info('Log 1');
            Logger.info('Log 2');
            Logger.info('Log 3');

            await instance._flushLogs();

            expect(mockChromeStorage.local.set).toHaveBeenCalled();
        });

        test('should cleanup old logs', async () => {
            const instance = Logger.getInstance();
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 10);

            const oldLogs = [
                { timestamp: oldDate.toISOString(), message: 'Old log' },
                { timestamp: new Date().toISOString(), message: 'New log' }
            ];

            mockChromeStorage.local.get.mockResolvedValue({
                [Logger.STORAGE_KEYS.LOGS]: oldLogs
            });

            await instance._cleanupOldLogs();

            expect(mockChromeStorage.local.set).toHaveBeenCalledWith({
                [Logger.STORAGE_KEYS.LOGS]: expect.arrayContaining([
                    expect.objectContaining({ message: 'New log' })
                ])
            });
        });
    });

    describe('Error Handling', () => {
        test('should handle storage errors gracefully', async () => {
            mockChromeStorage.local.set.mockRejectedValue(new Error('Storage error'));

            const instance = Logger.getInstance();
            await expect(instance._flushLogs()).resolves.not.toThrow();
        });

        test('should handle missing chrome API gracefully', async () => {
            // Temporarily remove chrome API
            const originalChrome = global.chrome;
            delete global.chrome;

            const instance = new Logger();
            await expect(instance._loadSettings()).resolves.not.toThrow();

            // Restore chrome API
            global.chrome = originalChrome;
        });
    });

    describe('Context Detection', () => {
        test('should detect component from stack trace', () => {
            const instance = Logger.getInstance();
            const component = instance._detectComponent();

            expect(typeof component).toBe('string');
        });

        test('should sanitize sensitive context data', () => {
            const instance = Logger.getInstance();
            const context = {
                username: 'testuser',
                password: 'secret123',
                normalData: 'value'
            };

            const sanitized = instance._sanitizeContext(context);

            expect(sanitized.password).toBe('[REDACTED]');
            expect(sanitized.normalData).toBe('value');
        });
    });

    describe('Memory Monitoring', () => {
        test('should collect memory metrics when available', () => {
            const instance = Logger.getInstance();
            const metrics = instance._getCurrentPerformanceMetrics();

            expect(metrics).toBeDefined();
            expect(metrics.memory).toBeDefined();
            expect(metrics.memory.usedJSHeapSize).toBeDefined();
        });

        test('should handle missing performance API', () => {
            const originalPerformance = global.performance;
            delete global.performance;

            const instance = Logger.getInstance();
            const metrics = instance._getCurrentPerformanceMetrics();

            expect(metrics).toBeNull();

            global.performance = originalPerformance;
        });
    });
});