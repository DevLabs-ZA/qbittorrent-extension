class InputValidator {
    static sanitizeHtml(input) {
        if (typeof input !== 'string') return '';
        
        // Remove HTML tags and decode entities
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&#x2F;/g, '/')
            .replace(/&amp;/g, '&');
    }

    static sanitizeUrl(url) {
        if (typeof url !== 'string') return '';
        
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

    static validateMagnetLink(magnetUrl) {
        if (typeof magnetUrl !== 'string') return false;
        
        const magnetPattern = /^magnet:\?xt=urn:btih:[a-fA-F0-9]{32,40}(&[^&=]*=[^&]*)*$/;
        return magnetPattern.test(magnetUrl);
    }

    static validateTorrentUrl(url) {
        if (typeof url !== 'string') return false;
        
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

    static validateServerUrl(url) {
        if (typeof url !== 'string') return false;
        
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

    static sanitizeFilename(filename) {
        if (typeof filename !== 'string') return '';
        
        // Remove dangerous characters and limit length
        return filename
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/[^\x20-\x7E]/g, '') // Keep only printable ASCII
            .replace(/^\.+/, '') // Remove leading dots
            .substring(0, 255)
            .trim();
    }

    static sanitizeCategory(category) {
        if (typeof category !== 'string') return '';
        
        // Category names should be alphanumeric with limited special chars
        return category
            .replace(/[^a-zA-Z0-9_\-\s]/g, '')
            .substring(0, 100)
            .trim();
    }

    static sanitizePath(path) {
        if (typeof path !== 'string') return '';
        
        // Basic path sanitization - remove dangerous sequences
        return path
            .replace(/\.\./g, '') // Remove directory traversal
            .replace(/[<>"|?*]/g, '') // Remove invalid filename chars
            .replace(/[^\x20-\x7E]/g, '') // Remove control characters
            .substring(0, 500)
            .trim();
    }

    static validatePort(port) {
        const portNum = parseInt(port, 10);
        return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
    }

    static validateTimeout(timeout) {
        const timeoutNum = parseInt(timeout, 10);
        return !isNaN(timeoutNum) && timeoutNum >= 1 && timeoutNum <= 300;
    }

    static validateRetryAttempts(attempts) {
        const attemptsNum = parseInt(attempts, 10);
        return !isNaN(attemptsNum) && attemptsNum >= 1 && attemptsNum <= 10;
    }

    static sanitizeUsername(username) {
        if (typeof username !== 'string') return '';
        
        // Basic username sanitization
        return username
            .replace(/[<>&"']/g, '') // Remove HTML chars
            .substring(0, 100)
            .trim();
    }

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

// Rate limiting utility
class RateLimiter {
    constructor() {
        this.requests = new Map();
    }

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

    clear(key) {
        this.requests.delete(key);
    }

    clearAll() {
        this.requests.clear();
    }
}

// Export for browser environment
if (typeof window !== 'undefined') {
    window.InputValidator = InputValidator;
    window.RateLimiter = RateLimiter;
}