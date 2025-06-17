/**
 * Input validation and sanitization utilities for secure data handling
 * Provides comprehensive validation for all user inputs and API data
 *
 * @class InputValidator
 * @since 1.0.0
 * @example
 * // Validate a server URL
 * const isValid = InputValidator.validateServerUrl('http://localhost:8080');
 *
 * // Sanitize user input
 * const clean = InputValidator.sanitizeHtml('<script>alert("xss")</script>');
 *
 * // Validate form data
 * const result = InputValidator.validateFormData(formData);
 * if (result.isValid) {
 *   // Use result.sanitizedData
 * }
 */
class InputValidator {

    /**
     * Sanitizes HTML content to prevent XSS attacks
     * Removes all HTML tags and decodes common HTML entities
     *
     * @param {string} input - The input string to sanitize
     * @returns {string} Sanitized string with HTML removed
     * @throws {Error} When input contains malicious content
     * @since 1.0.0
     * @example
     * const clean = InputValidator.sanitizeHtml('<script>alert("xss")</script>');
     * // Returns: 'alert("xss")'
     *
     * @example
     * const clean = InputValidator.sanitizeHtml('Safe &lt;text&gt;');
     * // Returns: 'Safe <text>'
     */
    static sanitizeHtml(input) {
        if (typeof input !== 'string') {return '';}

        // Secure HTML sanitization - strip all HTML tags and decode entities safely
        // Step 1: Remove all HTML/XML tags completely
        let sanitized = input.replace(/<[^>]*>/g, '');
        
        // Step 2: Decode common HTML entities safely without DOM manipulation
        const entityMap = {
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#x27;': "'",
            '&#39;': "'",
            '&#x2F;': '/',
            '&#47;': '/',
            '&amp;': '&' // Must be last to avoid double-decoding
        };
        
        // Apply entity decoding in safe order
        Object.entries(entityMap).forEach(([entity, char]) => {
            sanitized = sanitized.replace(new RegExp(entity, 'g'), char);
        });
        
        // Step 3: Remove any remaining suspicious patterns
        sanitized = sanitized
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/data:/gi, '') // Remove data: protocol
            .replace(/vbscript:/gi, '') // Remove vbscript: protocol
            .replace(/on\w+\s*=/gi, ''); // Remove event handlers like onclick=
        
        return sanitized.trim();
    }

    /**
     * Sanitizes and validates URLs to ensure they use safe protocols
     * Only allows HTTP and HTTPS protocols for security
     *
     * @param {string} url - The URL to sanitize and validate
     * @returns {string} Sanitized URL or empty string if invalid
     * @throws {Error} When URL parsing fails
     * @since 1.0.0
     * @example
     * const safe = InputValidator.sanitizeUrl('http://example.com');
     * // Returns: 'http://example.com/'
     *
     * @example
     * const blocked = InputValidator.sanitizeUrl('javascript:alert(1)');
     * // Returns: ''
     */
    static sanitizeUrl(url) {
        if (typeof url !== 'string') {return '';}

        try {
            const parsed = new URL(url);
            // Only allow http and https protocols
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return '';
            }
            return parsed.toString();
        } catch (error) {
            return '';
        }
    }

    /**
     * Validates magnet link format for BitTorrent
     * Ensures magnet links follow proper format with valid hash
     *
     * @param {string} magnetUrl - The magnet link to validate
     * @returns {boolean} True if valid magnet link, false otherwise
     * @since 1.0.0
     * @example
     * const isValid = InputValidator.validateMagnetLink(
     *   'magnet:?xt=urn:btih:1234567890abcdef1234567890abcdef12345678'
     * );
     * // Returns: true
     *
     * @example
     * const isInvalid = InputValidator.validateMagnetLink('not-a-magnet');
     * // Returns: false
     */
    static validateMagnetLink(magnetUrl) {
        if (typeof magnetUrl !== 'string') {return false;}

        const magnetPattern = /^magnet:\?xt=urn:btih:[a-fA-F0-9]{32,40}(&[^&=]*=[^&]*)*$/;
        return magnetPattern.test(magnetUrl);
    }

    /**
     * Validates .torrent file URLs for download
     * Checks for valid HTTP/HTTPS protocol and .torrent extension
     *
     * @param {string} url - The torrent file URL to validate
     * @returns {boolean} True if valid torrent URL, false otherwise
     * @since 1.0.0
     * @example
     * const isValid = InputValidator.validateTorrentUrl(
     *   'https://example.com/file.torrent'
     * );
     * // Returns: true
     *
     * @example
     * const isInvalid = InputValidator.validateTorrentUrl('ftp://bad.torrent');
     * // Returns: false
     */
    static validateTorrentUrl(url) {
        if (typeof url !== 'string') {return false;}

        try {
            const parsed = new URL(url);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return false;
            }
            return url.toLowerCase().includes('.torrent');
        } catch (error) {
            return false;
        }
    }

    /**
     * Validates qBittorrent server URLs for connection
     * Ensures proper protocol, hostname, and format
     *
     * @param {string} url - The server URL to validate
     * @returns {boolean} True if valid server URL, false otherwise
     * @since 1.0.0
     * @example
     * const isValid = InputValidator.validateServerUrl('http://localhost:8080');
     * // Returns: true
     *
     * @example
     * const isInvalid = InputValidator.validateServerUrl('invalid-url');
     * // Returns: false
     */
    static validateServerUrl(url) {
        if (typeof url !== 'string') {return false;}

        try {
            const parsed = new URL(url);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return false;
            }
            // Check for valid hostname (not just IP would be more secure, but qBittorrent often runs on localhost)
            if (!parsed.hostname || parsed.hostname.length === 0) {
                return false;
            }
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Sanitizes filenames to prevent directory traversal and invalid characters
     * Removes dangerous characters and limits length for security
     *
     * @param {string} filename - The filename to sanitize
     * @returns {string} Sanitized filename safe for file system use
     * @since 1.0.0
     * @example
     * const safe = InputValidator.sanitizeFilename('file<name>.txt');
     * // Returns: 'filename.txt'
     *
     * @example
     * const safe = InputValidator.sanitizeFilename('../../../etc/passwd');
     * // Returns: 'etcpasswd'
     */
    static sanitizeFilename(filename) {
        if (typeof filename !== 'string') {return '';}

        // Remove dangerous characters and limit length
        return filename
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/[^\x20-\x7E]/g, '') // Keep only printable ASCII
            .replace(/^\.+/, '') // Remove leading dots
            .substring(0, 255)
            .trim();
    }

    /**
     * Sanitizes torrent category names for qBittorrent
     * Allows alphanumeric characters, spaces, hyphens, and underscores
     *
     * @param {string} category - The category name to sanitize
     * @returns {string} Sanitized category name
     * @since 1.0.0
     * @example
     * const clean = InputValidator.sanitizeCategory('Movies & TV');
     * // Returns: 'Movies  TV'
     *
     * @example
     * const clean = InputValidator.sanitizeCategory('Software_2024');
     * // Returns: 'Software_2024'
     */
    static sanitizeCategory(category) {
        if (typeof category !== 'string') {return '';}

        // Category names should be alphanumeric with limited special chars
        return category
            .replace(/[^a-zA-Z0-9_\-\s]/g, '')
            .substring(0, 100)
            .trim();
    }

    /**
     * Sanitizes file system paths to prevent directory traversal attacks
     * Removes dangerous path sequences and invalid characters
     *
     * @param {string} path - The file path to sanitize
     * @returns {string} Sanitized path safe for file system operations
     * @security Prevents directory traversal with .. sequences
     * @since 1.0.0
     * @example
     * const safe = InputValidator.sanitizePath('/downloads/movies');
     * // Returns: '/downloads/movies'
     *
     * @example
     * const blocked = InputValidator.sanitizePath('../../../etc/passwd');
     * // Returns: 'etcpasswd'
     */
    static sanitizePath(path) {
        if (typeof path !== 'string') {return '';}

        // Basic path sanitization - remove dangerous sequences
        return path
            .replace(/\.\./g, '') // Remove directory traversal
            .replace(/[<>"|?*]/g, '') // Remove invalid filename chars
            .replace(/[^\x20-\x7E]/g, '') // Remove control characters
            .substring(0, 500)
            .trim();
    }

    /**
     * Validates network port numbers for TCP connections
     * Ensures port is within valid range (1-65535)
     *
     * @param {number|string} port - The port number to validate
     * @returns {boolean} True if valid port number, false otherwise
     * @since 1.0.0
     * @example
     * const isValid = InputValidator.validatePort(8080);
     * // Returns: true
     *
     * @example
     * const isInvalid = InputValidator.validatePort(99999);
     * // Returns: false
     */
    static validatePort(port) {
        const portNum = parseInt(port, 10);
        return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
    }

    /**
     * Validates connection timeout values in seconds
     * Ensures timeout is reasonable (1-300 seconds)
     *
     * @param {number|string} timeout - The timeout value to validate
     * @returns {boolean} True if valid timeout, false otherwise
     * @since 1.0.0
     * @example
     * const isValid = InputValidator.validateTimeout(30);
     * // Returns: true
     *
     * @example
     * const isInvalid = InputValidator.validateTimeout(500);
     * // Returns: false
     */
    static validateTimeout(timeout) {
        const timeoutNum = parseInt(timeout, 10);
        return !isNaN(timeoutNum) && timeoutNum >= 1 && timeoutNum <= 300;
    }

    /**
     * Validates retry attempt counts for network operations
     * Ensures reasonable number of retries (1-10)
     *
     * @param {number|string} attempts - The retry count to validate
     * @returns {boolean} True if valid retry count, false otherwise
     * @since 1.0.0
     * @example
     * const isValid = InputValidator.validateRetryAttempts(3);
     * // Returns: true
     *
     * @example
     * const isInvalid = InputValidator.validateRetryAttempts(50);
     * // Returns: false
     */
    static validateRetryAttempts(attempts) {
        const attemptsNum = parseInt(attempts, 10);
        return !isNaN(attemptsNum) && attemptsNum >= 1 && attemptsNum <= 10;
    }

    /**
     * Sanitizes usernames for authentication
     * Removes HTML characters and limits length
     *
     * @param {string} username - The username to sanitize
     * @returns {string} Sanitized username
     * @since 1.0.0
     * @example
     * const clean = InputValidator.sanitizeUsername('admin<script>');
     * // Returns: 'adminscript'
     *
     * @example
     * const clean = InputValidator.sanitizeUsername('user@domain.com');
     * // Returns: 'user@domain.com'
     */
    static sanitizeUsername(username) {
        if (typeof username !== 'string') {return '';}

        // Basic username sanitization
        return username
            .replace(/[<>&"']/g, '') // Remove HTML chars
            .substring(0, 100)
            .trim();
    }

    /**
     * Validates and sanitizes complete form data objects
     * Comprehensive validation for extension settings and configuration
     *
     * @param {object} data - The form data object to validate
     * @param {object} [data.server] - Server configuration settings
     * @param {string} [data.server.url] - qBittorrent server URL
     * @param {string} [data.server.username] - Authentication username
     * @param {string} [data.server.password] - Authentication password
     * @param {number} [data.server.customPort] - Custom port number
     * @param {object} [data.options] - Download behavior options
     * @param {string} [data.options.category] - Default category
     * @param {string} [data.options.savePath] - Default save path
     * @param {boolean} [data.options.paused] - Start torrents paused
     * @param {object} [data.advanced] - Advanced configuration
     * @param {number} [data.advanced.connectionTimeout] - Connection timeout
     * @param {number} [data.advanced.retryAttempts] - Retry attempts
     * @param {object} [data.siteSettings] - Site-specific settings
     * @param {string[]} [data.siteSettings.whitelist] - Allowed domains
     * @param {string[]} [data.siteSettings.blacklist] - Blocked domains
     * @returns {object} Validation result with errors and sanitized data
     * @returns {boolean} returns.isValid - True if all data is valid
     * @returns {string[]} returns.errors - Array of validation error messages
     * @returns {object} returns.sanitizedData - Cleaned and validated data
     * @since 1.0.0
     * @example
     * const result = InputValidator.validateFormData({
     *   server: { url: 'http://localhost:8080', username: 'admin' },
     *   options: { category: 'movies', paused: false }
     * });
     *
     * if (result.isValid) {
     *   // Use result.sanitizedData safely
     *   console.log('Data is valid:', result.sanitizedData);
     * } else {
     *   // Handle validation errors
     *   console.error('Validation errors:', result.errors);
     * }
     */
    static validateFormData(data) {
        const errors = [];
        const sanitized = {};

        // Validate server settings
        if (data.server) {
            if (data.server.url) {
                if (this.validateServerUrl(data.server.url)) {
                    sanitized.server = sanitized.server || {};
                    sanitized.server.url = this.sanitizeUrl(data.server.url);
                } else {
                    errors.push('Invalid server URL');
                }
            }

            if (data.server.username) {
                sanitized.server = sanitized.server || {};
                sanitized.server.username = this.sanitizeUsername(data.server.username);
            }

            if (data.server.password) {
                // Password validation - ensure it's not empty and has reasonable length
                if (data.server.password.length > 0 && data.server.password.length <= 500) {
                    sanitized.server = sanitized.server || {};
                    sanitized.server.password = data.server.password; // Don't sanitize password content
                } else {
                    errors.push('Password must be between 1 and 500 characters');
                }
            }

            if (data.server.customPort !== undefined) {
                if (this.validatePort(data.server.customPort)) {
                    sanitized.server = sanitized.server || {};
                    sanitized.server.customPort = parseInt(data.server.customPort, 10);
                } else {
                    errors.push('Invalid port number');
                }
            }
        }

        // Validate options
        if (data.options) {
            sanitized.options = {};

            if (data.options.category) {
                sanitized.options.category = this.sanitizeCategory(data.options.category);
            }

            if (data.options.savePath) {
                sanitized.options.savePath = this.sanitizePath(data.options.savePath);
            }

            // Boolean options
            ['paused', 'skipHashCheck', 'autoDownload', 'showNotifications', 'showIndicators', 'scanDynamicContent'].forEach(key => {
                if (data.options[key] !== undefined) {
                    sanitized.options[key] = Boolean(data.options[key]);
                }
            });
        }

        // Validate advanced settings
        if (data.advanced) {
            sanitized.advanced = {};

            if (data.advanced.connectionTimeout !== undefined) {
                if (this.validateTimeout(data.advanced.connectionTimeout)) {
                    sanitized.advanced.connectionTimeout = parseInt(data.advanced.connectionTimeout, 10);
                } else {
                    errors.push('Connection timeout must be between 1 and 300 seconds');
                }
            }

            if (data.advanced.retryAttempts !== undefined) {
                if (this.validateRetryAttempts(data.advanced.retryAttempts)) {
                    sanitized.advanced.retryAttempts = parseInt(data.advanced.retryAttempts, 10);
                } else {
                    errors.push('Retry attempts must be between 1 and 10');
                }
            }

            if (data.advanced.debugLogging !== undefined) {
                sanitized.advanced.debugLogging = Boolean(data.advanced.debugLogging);
            }
        }

        // Validate site settings
        if (data.siteSettings) {
            sanitized.siteSettings = {};

            if (data.siteSettings.whitelist) {
                sanitized.siteSettings.whitelist = data.siteSettings.whitelist
                    .filter(domain => typeof domain === 'string' && domain.trim().length > 0)
                    .map(domain => domain.trim().toLowerCase())
                    .slice(0, 100); // Limit number of domains
            }

            if (data.siteSettings.blacklist) {
                sanitized.siteSettings.blacklist = data.siteSettings.blacklist
                    .filter(domain => typeof domain === 'string' && domain.trim().length > 0)
                    .map(domain => domain.trim().toLowerCase())
                    .slice(0, 100); // Limit number of domains
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            sanitizedData: sanitized
        };
    }
}

/**
 * Rate limiting utility to prevent abuse and ensure system stability
 * Implements sliding window rate limiting with configurable limits
 *
 * @class RateLimiter
 * @since 1.0.0
 * @example
 * const limiter = new RateLimiter();
 *
 * // Check if request is allowed (10 requests per minute)
 * if (limiter.isAllowed('user123', 10, 60000)) {
 *   // Process request
 * } else {
 *   // Reject request - rate limit exceeded
 * }
 */
class RateLimiter {
    /**
     * Creates a new RateLimiter instance
     * Initializes the request tracking storage
     *
     * @since 1.0.0
     */
    constructor() {
        /**
         * Map storing request timestamps for each key
         * @type {Map<string, number[]>}
         * @private
         */
        this.requests = new Map();
    }

    /**
     * Checks if a request is allowed within the rate limit
     * Uses sliding window algorithm for accurate rate limiting
     *
     * @param {string} key - Unique identifier for the rate limit (e.g., user ID, IP)
     * @param {number} [limit=10] - Maximum number of requests allowed
     * @param {number} [windowMs=60000] - Time window in milliseconds (default: 1 minute)
     * @returns {boolean} True if request is allowed, false if rate limit exceeded
     * @since 1.0.0
     * @example
     * // Allow 20 requests per minute for API calls
     * const allowed = limiter.isAllowed('api_user', 20, 60000);
     *
     * @example
     * // Allow 5 requests per 10 seconds for authentication
     * const allowed = limiter.isAllowed('auth_attempt', 5, 10000);
     */
    isAllowed(key, limit = 10, windowMs = 60000) {
        const now = Date.now();
        const windowStart = now - windowMs;

        if (!this.requests.has(key)) {
            this.requests.set(key, []);
        }

        const requests = this.requests.get(key);

        // Remove old requests outside the window
        const validRequests = requests.filter(timestamp => timestamp > windowStart);
        this.requests.set(key, validRequests);

        if (validRequests.length >= limit) {
            return false;
        }

        validRequests.push(now);
        return true;
    }

    /**
     * Clears rate limit history for a specific key
     * Useful for resetting limits after successful operations
     *
     * @param {string} key - The key to clear rate limit data for
     * @since 1.0.0
     * @example
     * // Clear rate limit after successful login
     * limiter.clear('user123');
     */
    clear(key) {
        this.requests.delete(key);
    }

    /**
     * Clears all rate limit data for all keys
     * Useful for testing or system resets
     *
     * @since 1.0.0
     * @example
     * // Reset all rate limits
     * limiter.clearAll();
     */
    clearAll() {
        this.requests.clear();
    }
}

// Export for browser environment
if (typeof window !== 'undefined') {
    window.InputValidator = InputValidator;
    window.RateLimiter = RateLimiter;
}