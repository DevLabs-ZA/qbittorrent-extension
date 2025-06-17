/**
 * Comprehensive error handling and recovery system for qBittorrent browser extension
 * Provides error categorization, context collection, recovery mechanisms, and user-friendly messaging
 *
 * @class ErrorHandler
 * @since 1.0.0
 * @example
 * // Handle and categorize errors
 * ErrorHandler.handle(error, 'authentication', { username: 'admin' });
 *
 * // Set up global error handlers
 * ErrorHandler.setupGlobalHandlers();
 *
 * // Get user-friendly error message
 * const userMessage = ErrorHandler.getUserMessage(error);
 */
class ErrorHandler {
    static ERROR_CATEGORIES = {
        NETWORK: 'network',
        AUTHENTICATION: 'authentication',
        VALIDATION: 'validation',
        EXTENSION_API: 'extension_api',
        STORAGE: 'storage',
        PARSING: 'parsing',
        PERMISSION: 'permission',
        TIMEOUT: 'timeout',
        RATE_LIMIT: 'rate_limit',
        TORRENT: 'torrent',
        UNKNOWN: 'unknown'
    };

    static RETRY_POLICIES = {
        [ErrorHandler.ERROR_CATEGORIES.NETWORK]: { attempts: 3, delay: 1000, backoff: 2 },
        [ErrorHandler.ERROR_CATEGORIES.AUTHENTICATION]: { attempts: 2, delay: 2000, backoff: 1 },
        [ErrorHandler.ERROR_CATEGORIES.TIMEOUT]: { attempts: 3, delay: 2000, backoff: 1.5 },
        [ErrorHandler.ERROR_CATEGORIES.RATE_LIMIT]: { attempts: 2, delay: 5000, backoff: 1 },
        [ErrorHandler.ERROR_CATEGORIES.TORRENT]: { attempts: 2, delay: 1000, backoff: 1 }
    };

    static USER_MESSAGES = {
        [ErrorHandler.ERROR_CATEGORIES.NETWORK]: {
            title: 'Connection Problem',
            message: 'Unable to connect to your qBittorrent server. Please check your server settings and network connection.',
            action: 'Check server settings'
        },
        [ErrorHandler.ERROR_CATEGORIES.AUTHENTICATION]: {
            title: 'Authentication Failed',
            message: 'Unable to log in to your qBittorrent server. Please verify your username and password.',
            action: 'Update credentials'
        },
        [ErrorHandler.ERROR_CATEGORIES.VALIDATION]: {
            title: 'Invalid Input',
            message: 'The provided information is not valid. Please check your input and try again.',
            action: 'Correct input'
        },
        [ErrorHandler.ERROR_CATEGORIES.EXTENSION_API]: {
            title: 'Extension Error',
            message: 'An internal extension error occurred. Please try refreshing the page or restarting your browser.',
            action: 'Refresh page'
        },
        [ErrorHandler.ERROR_CATEGORIES.STORAGE]: {
            title: 'Storage Error',
            message: 'Unable to save or retrieve data. Please check your browser storage permissions.',
            action: 'Check permissions'
        },
        [ErrorHandler.ERROR_CATEGORIES.PARSING]: {
            title: 'Data Error',
            message: 'Unable to process the torrent or magnet link. Please verify the link is valid.',
            action: 'Check torrent link'
        },
        [ErrorHandler.ERROR_CATEGORIES.PERMISSION]: {
            title: 'Permission Denied',
            message: 'The extension does not have the required permissions to complete this action.',
            action: 'Grant permissions'
        },
        [ErrorHandler.ERROR_CATEGORIES.TIMEOUT]: {
            title: 'Operation Timeout',
            message: 'The operation took too long to complete. Please try again.',
            action: 'Try again'
        },
        [ErrorHandler.ERROR_CATEGORIES.RATE_LIMIT]: {
            title: 'Too Many Requests',
            message: 'Too many requests were made too quickly. Please wait a moment and try again.',
            action: 'Wait and retry'
        },
        [ErrorHandler.ERROR_CATEGORIES.TORRENT]: {
            title: 'Torrent Error',
            message: 'Unable to add the torrent to qBittorrent. Please check the torrent file or magnet link.',
            action: 'Verify torrent'
        },
        [ErrorHandler.ERROR_CATEGORIES.UNKNOWN]: {
            title: 'Unexpected Error',
            message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
            action: 'Try again'
        }
    };

    static _instance = null;
    static _globalHandlersSetup = false;

    constructor() {
        if (ErrorHandler._instance) {
            return ErrorHandler._instance;
        }

        this.errorCounts = new Map();
        this.retryQueues = new Map();
        this.circuitBreakers = new Map();
        
        ErrorHandler._instance = this;
    }

    /**
     * Get singleton instance
     * @returns {ErrorHandler} ErrorHandler instance
     */
    static getInstance() {
        if (!ErrorHandler._instance) {
            ErrorHandler._instance = new ErrorHandler();
        }
        return ErrorHandler._instance;
    }

    /**
     * Handle an error with automatic categorization and logging
     * @param {Error|string} error - Error object or message
     * @param {string} [category] - Error category (auto-detected if not provided)
     * @param {object} [context] - Additional context information
     * @param {object} [options] - Handling options
     * @returns {object} Handled error information
     */
    static handle(error, category = null, context = {}, options = {}) {
        return ErrorHandler.getInstance()._handle(error, category, context, options);
    }

    _handle(error, category = null, context = {}, options = {}) {
        const errorInfo = this._analyzeError(error, category, context);
        
        // Log the error
        if (typeof window !== 'undefined' && window.Logger) {
            window.Logger.error(errorInfo.message, errorInfo.originalError, {
                category: errorInfo.category,
                context: errorInfo.context,
                userAgent: errorInfo.userAgent,
                timestamp: errorInfo.timestamp
            });
        }

        // Update error statistics
        this._updateErrorStats(errorInfo.category);

        // Check circuit breaker
        if (this._shouldCircuitBreak(errorInfo.category)) {
            errorInfo.circuitBreakerTripped = true;
            return errorInfo;
        }

        // Attempt recovery if enabled
        if (options.enableRecovery !== false) {
            this._attemptRecovery(errorInfo, options);
        }

        return errorInfo;
    }

    /**
     * Analyze and categorize an error
     * @private
     */
    _analyzeError(error, category = null, context = {}) {
        const errorInfo = {
            id: this._generateErrorId(),
            timestamp: new Date().toISOString(),
            originalError: error,
            message: this._extractMessage(error),
            category: category || this._categorizeError(error),
            context: this._enrichContext(context),
            stack: this._extractStack(error),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
            severity: this._determineSeverity(error, category),
            recoverable: true,
            circuitBreakerTripped: false
        };

        return errorInfo;
    }

    /**
     * Extract error message from various error types
     * @private
     */
    _extractMessage(error) {
        if (typeof error === 'string') return error;
        if (error instanceof Error) return error.message;
        if (error && typeof error.message === 'string') return error.message;
        if (error && typeof error.toString === 'function') return error.toString();
        return 'Unknown error occurred';
    }

    /**
     * Automatically categorize error based on content and type
     * @private
     */
    _categorizeError(error) {
        const message = this._extractMessage(error).toLowerCase();
        
        // Network-related errors
        if (message.includes('fetch') || message.includes('network') || 
            message.includes('connection') || message.includes('cors') ||
            error instanceof TypeError && message.includes('failed to fetch')) {
            return ErrorHandler.ERROR_CATEGORIES.NETWORK;
        }

        // Authentication errors
        if (message.includes('auth') || message.includes('unauthorized') ||
            message.includes('login') || message.includes('credential') ||
            message.includes('401') || message.includes('403')) {
            return ErrorHandler.ERROR_CATEGORIES.AUTHENTICATION;
        }

        // Validation errors
        if (message.includes('invalid') || message.includes('validation') ||
            message.includes('required') || message.includes('format')) {
            return ErrorHandler.ERROR_CATEGORIES.VALIDATION;
        }

        // Storage errors
        if (message.includes('storage') || message.includes('quota') ||
            message.includes('chrome.storage')) {
            return ErrorHandler.ERROR_CATEGORIES.STORAGE;
        }

        // Extension API errors
        if (message.includes('chrome.') || message.includes('extension') ||
            message.includes('runtime') || message.includes('tabs')) {
            return ErrorHandler.ERROR_CATEGORIES.EXTENSION_API;
        }

        // Timeout errors
        if (message.includes('timeout') || message.includes('aborted')) {
            return ErrorHandler.ERROR_CATEGORIES.TIMEOUT;
        }

        // Rate limiting
        if (message.includes('rate limit') || message.includes('too many requests') ||
            message.includes('429')) {
            return ErrorHandler.ERROR_CATEGORIES.RATE_LIMIT;
        }

        // Torrent-specific errors
        if (message.includes('torrent') || message.includes('magnet') ||
            message.includes('tracker') || message.includes('hash')) {
            return ErrorHandler.ERROR_CATEGORIES.TORRENT;
        }

        // Parsing errors
        if (message.includes('parse') || message.includes('json') ||
            message.includes('syntax') || error instanceof SyntaxError) {
            return ErrorHandler.ERROR_CATEGORIES.PARSING;
        }

        // Permission errors
        if (message.includes('permission') || message.includes('denied') ||
            message.includes('blocked')) {
            return ErrorHandler.ERROR_CATEGORIES.PERMISSION;
        }

        return ErrorHandler.ERROR_CATEGORIES.UNKNOWN;
    }

    /**
     * Enrich context with additional system information
     * @private
     */
    _enrichContext(context) {
        const enriched = { ...context };

        // Add timestamp
        enriched.timestamp = new Date().toISOString();

        // Add extension version
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
                enriched.extensionVersion = chrome.runtime.getManifest().version;
            }
        } catch (e) {
            // Ignore
        }

        // Add page information if available
        if (typeof window !== 'undefined') {
            enriched.url = window.location ? window.location.href : 'unknown';
            enriched.userAgent = navigator.userAgent;
        }

        return enriched;
    }

    /**
     * Extract stack trace from error
     * @private
     */
    _extractStack(error) {
        if (error instanceof Error && error.stack) {
            return error.stack;
        }
        return null;
    }

    /**
     * Determine error severity
     * @private
     */
    _determineSeverity(error, category) {
        const criticalCategories = [
            ErrorHandler.ERROR_CATEGORIES.EXTENSION_API,
            ErrorHandler.ERROR_CATEGORIES.STORAGE
        ];

        const highCategories = [
            ErrorHandler.ERROR_CATEGORIES.AUTHENTICATION,
            ErrorHandler.ERROR_CATEGORIES.PERMISSION
        ];

        if (criticalCategories.includes(category)) return 'critical';
        if (highCategories.includes(category)) return 'high';
        return 'medium';
    }

    /**
     * Update error statistics for monitoring
     * @private
     */
    _updateErrorStats(category) {
        const current = this.errorCounts.get(category) || { count: 0, lastOccurred: null };
        current.count++;
        current.lastOccurred = new Date().toISOString();
        this.errorCounts.set(category, current);
    }

    /**
     * Check if circuit breaker should trip for a category
     * @private
     */
    _shouldCircuitBreak(category) {
        const stats = this.errorCounts.get(category);
        if (!stats) return false;

        // Trip circuit breaker if more than 10 errors in 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const lastError = new Date(stats.lastOccurred);

        if (stats.count >= 10 && lastError > fiveMinutesAgo) {
            this.circuitBreakers.set(category, {
                tripped: true,
                trippedAt: new Date().toISOString(),
                resetAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // Reset after 10 minutes
            });
            return true;
        }

        return false;
    }

    /**
     * Attempt automatic error recovery
     * @private
     */
    _attemptRecovery(errorInfo, options) {
        const retryPolicy = ErrorHandler.RETRY_POLICIES[errorInfo.category];
        if (!retryPolicy || !options.retryFunction) return;

        const queueKey = `${errorInfo.category}_${errorInfo.id}`;
        this.retryQueues.set(queueKey, {
            attempts: 0,
            maxAttempts: retryPolicy.attempts,
            delay: retryPolicy.delay,
            backoff: retryPolicy.backoff,
            retryFunction: options.retryFunction,
            context: errorInfo.context
        });

        this._scheduleRetry(queueKey);
    }

    /**
     * Schedule a retry attempt
     * @private
     */
    _scheduleRetry(queueKey) {
        const retryInfo = this.retryQueues.get(queueKey);
        if (!retryInfo || retryInfo.attempts >= retryInfo.maxAttempts) {
            this.retryQueues.delete(queueKey);
            return;
        }

        const delay = retryInfo.delay * Math.pow(retryInfo.backoff, retryInfo.attempts);
        
        setTimeout(async () => {
            try {
                retryInfo.attempts++;
                await retryInfo.retryFunction(retryInfo.context);
                
                // Success - remove from retry queue
                this.retryQueues.delete(queueKey);
                
                if (typeof window !== 'undefined' && window.Logger) {
                    window.Logger.info('Error recovery successful', {
                        queueKey,
                        attempts: retryInfo.attempts
                    });
                }
            } catch (error) {
                // Retry failed - schedule next attempt
                this._scheduleRetry(queueKey);
            }
        }, delay);
    }

    /**
     * Get user-friendly error message
     * @param {Error|object} error - Error or error info object
     * @returns {object} User-friendly message information
     */
    static getUserMessage(error) {
        const instance = ErrorHandler.getInstance();
        let category;

        if (error && error.category) {
            category = error.category;
        } else {
            category = instance._categorizeError(error);
        }

        const template = ErrorHandler.USER_MESSAGES[category] || ErrorHandler.USER_MESSAGES[ErrorHandler.ERROR_CATEGORIES.UNKNOWN];
        
        return {
            ...template,
            category,
            technicalDetails: instance._extractMessage(error),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Setup global error handlers for the extension
     */
    static setupGlobalHandlers() {
        if (ErrorHandler._globalHandlersSetup) return;

        const instance = ErrorHandler.getInstance();

        // Global error handler
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                instance._handle(event.error, null, {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            });

            // Unhandled promise rejection handler
            window.addEventListener('unhandledrejection', (event) => {
                instance._handle(event.reason, null, {
                    type: 'unhandled_promise_rejection'
                });
            });
        }

        // Chrome extension specific error handlers
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.onSuspend?.addListener(() => {
                if (typeof window !== 'undefined' && window.Logger) {
                    window.Logger.info('Extension suspended, flushing logs');
                }
            });
        }

        ErrorHandler._globalHandlersSetup = true;
    }

    /**
     * Get error statistics for monitoring
     * @returns {object} Error statistics
     */
    static getErrorStats() {
        const instance = ErrorHandler.getInstance();
        return {
            errorCounts: Object.fromEntries(instance.errorCounts),
            circuitBreakers: Object.fromEntries(instance.circuitBreakers),
            activeRetries: instance.retryQueues.size
        };
    }

    /**
     * Reset circuit breakers manually
     * @param {string} [category] - Specific category to reset, or all if not provided
     */
    static resetCircuitBreaker(category = null) {
        const instance = ErrorHandler.getInstance();
        
        if (category) {
            instance.circuitBreakers.delete(category);
        } else {
            instance.circuitBreakers.clear();
        }
    }

    /**
     * Clear error statistics
     */
    static clearStats() {
        const instance = ErrorHandler.getInstance();
        instance.errorCounts.clear();
        instance.circuitBreakers.clear();
        instance.retryQueues.clear();
    }

    // Utility methods

    _generateErrorId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Auto-setup when loaded
if (typeof window !== 'undefined') {
    window.ErrorHandler = ErrorHandler;
    // Setup global handlers
    ErrorHandler.setupGlobalHandlers();
}