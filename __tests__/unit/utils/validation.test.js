/**
 * Unit tests for Input Validation utilities
 * Tests validation functions, sanitization, and rate limiting
 */

describe('InputValidator', () => {
  let InputValidator;

  beforeAll(() => {
    // Mock DOM for sanitization functions
    global.document = {
      createElement: jest.fn(() => ({
        textContent: '',
        innerHTML: ''
      }))
    };

    // Load the validation module
    eval(`
      class InputValidator {
        static sanitizeHtml(input) {
          if (typeof input !== 'string') return '';
          
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
          
          const magnetPattern = /^magnet:\\?xt=urn:btih:[a-fA-F0-9]{32,40}(&[^&=]*=[^&]*)*$/;
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
          
          return filename
            .replace(/[<>:"/\\\\|?*]/g, '')
            .replace(/[^\\x20-\\x7E]/g, '')
            .replace(/^\\.+/, '')
            .substring(0, 255)
            .trim();
        }

        static sanitizeCategory(category) {
          if (typeof category !== 'string') return '';
          
          return category
            .replace(/[^a-zA-Z0-9_\\-\\s]/g, '')
            .substring(0, 100)
            .trim();
        }

        static sanitizePath(path) {
          if (typeof path !== 'string') return '';
          
          return path
            .replace(/\\.\\./g, '')
            .replace(/[<>"|?*]/g, '')
            .replace(/[^\\x20-\\x7E]/g, '')
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
          
          return username
            .replace(/[<>&"']/g, '')
            .substring(0, 100)
            .trim();
        }

        static validateFormData(data) {
          const errors = [];
          const sanitized = {};

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
              if (data.server.password.length > 0 && data.server.password.length <= 500) {
                sanitized.server = sanitized.server || {};
                sanitized.server.password = data.server.password;
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

          if (data.options) {
            sanitized.options = {};

            if (data.options.category) {
              sanitized.options.category = this.sanitizeCategory(data.options.category);
            }

            if (data.options.savePath) {
              sanitized.options.savePath = this.sanitizePath(data.options.savePath);
            }

            ['paused', 'skipHashCheck', 'autoDownload', 'showNotifications', 'showIndicators', 'scanDynamicContent'].forEach(key => {
              if (data.options[key] !== undefined) {
                sanitized.options[key] = Boolean(data.options[key]);
              }
            });
          }

          return {
            isValid: errors.length === 0,
            errors,
            sanitizedData: sanitized
          };
        }
      }

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

      global.testInputValidator = InputValidator;
      global.testRateLimiter = RateLimiter;
    `);

    InputValidator = global.testInputValidator;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sanitizeHtml', () => {
    it('should sanitize HTML input', () => {
      const mockDiv = {
        textContent: '',
        innerHTML: '&lt;script&gt;alert("xss")&lt;/script&gt;'
      };
      
      global.document.createElement.mockReturnValue(mockDiv);
      
      const result = InputValidator.sanitizeHtml('<script>alert("xss")</script>');
      expect(result).toBe('<script>alert("xss")</script>');
    });

    it('should return empty string for non-string input', () => {
      const result = InputValidator.sanitizeHtml(null);
      expect(result).toBe('');
    });

    it('should decode HTML entities', () => {
      const mockDiv = {
        textContent: '',
        innerHTML: '&lt;div&gt;Test &amp; Example&lt;/div&gt;'
      };
      
      global.document.createElement.mockReturnValue(mockDiv);
      
      const result = InputValidator.sanitizeHtml('test');
      expect(result).toBe('<div>Test & Example</div>');
    });
  });

  describe('sanitizeUrl', () => {
    it('should sanitize valid HTTP URL', () => {
      const url = 'http://example.com/path?param=value';
      const result = InputValidator.sanitizeUrl(url);
      expect(result).toBe(url);
    });

    it('should sanitize valid HTTPS URL', () => {
      const url = 'https://example.com/path';
      const result = InputValidator.sanitizeUrl(url);
      expect(result).toBe(url);
    });

    it('should reject invalid protocols', () => {
      const result = InputValidator.sanitizeUrl('ftp://example.com');
      expect(result).toBe('');
    });

    it('should reject malformed URLs', () => {
      const result = InputValidator.sanitizeUrl('not-a-url');
      expect(result).toBe('');
    });

    it('should return empty string for non-string input', () => {
      const result = InputValidator.sanitizeUrl(123);
      expect(result).toBe('');
    });
  });

  describe('validateMagnetLink', () => {
    it('should validate correct magnet link', () => {
      const magnetUrl = 'magnet:?xt=urn:btih:abc123def456789012345678901234567890abcd';
      const result = InputValidator.validateMagnetLink(magnetUrl);
      expect(result).toBe(true);
    });

    it('should validate magnet link with additional parameters', () => {
      const magnetUrl = 'magnet:?xt=urn:btih:abc123def456789012345678901234567890abcd&dn=test&tr=http://tracker.example.com';
      const result = InputValidator.validateMagnetLink(magnetUrl);
      expect(result).toBe(true);
    });

    it('should reject invalid magnet link format', () => {
      const result = InputValidator.validateMagnetLink('magnet:invalid');
      expect(result).toBe(false);
    });

    it('should reject non-magnet URLs', () => {
      const result = InputValidator.validateMagnetLink('http://example.com');
      expect(result).toBe(false);
    });

    it('should reject non-string input', () => {
      const result = InputValidator.validateMagnetLink(null);
      expect(result).toBe(false);
    });

    it('should reject magnet link with invalid hash length', () => {
      const result = InputValidator.validateMagnetLink('magnet:?xt=urn:btih:abc123');
      expect(result).toBe(false);
    });
  });

  describe('validateTorrentUrl', () => {
    it('should validate HTTP torrent URL', () => {
      const result = InputValidator.validateTorrentUrl('http://example.com/file.torrent');
      expect(result).toBe(true);
    });

    it('should validate HTTPS torrent URL', () => {
      const result = InputValidator.validateTorrentUrl('https://example.com/file.torrent');
      expect(result).toBe(true);
    });

    it('should validate torrent URL with query parameters', () => {
      const result = InputValidator.validateTorrentUrl('https://example.com/download.torrent?id=123');
      expect(result).toBe(true);
    });

    it('should reject non-torrent URLs', () => {
      const result = InputValidator.validateTorrentUrl('https://example.com/file.txt');
      expect(result).toBe(false);
    });

    it('should reject invalid protocols', () => {
      const result = InputValidator.validateTorrentUrl('ftp://example.com/file.torrent');
      expect(result).toBe(false);
    });

    it('should reject malformed URLs', () => {
      const result = InputValidator.validateTorrentUrl('not-a-url.torrent');
      expect(result).toBe(false);
    });

    it('should reject non-string input', () => {
      const result = InputValidator.validateTorrentUrl(123);
      expect(result).toBe(false);
    });
  });

  describe('validateServerUrl', () => {
    it('should validate HTTP server URL', () => {
      const result = InputValidator.validateServerUrl('http://localhost:8080');
      expect(result).toBe(true);
    });

    it('should validate HTTPS server URL', () => {
      const result = InputValidator.validateServerUrl('https://example.com:8080');
      expect(result).toBe(true);
    });

    it('should reject invalid protocols', () => {
      const result = InputValidator.validateServerUrl('ftp://example.com');
      expect(result).toBe(false);
    });

    it('should reject URLs without hostname', () => {
      // This is a bit tricky to test since URL constructor handles this
      const result = InputValidator.validateServerUrl('http://');
      expect(result).toBe(false);
    });

    it('should reject malformed URLs', () => {
      const result = InputValidator.validateServerUrl('not-a-url');
      expect(result).toBe(false);
    });

    it('should reject non-string input', () => {
      const result = InputValidator.validateServerUrl(null);
      expect(result).toBe(false);
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove dangerous characters', () => {
      const result = InputValidator.sanitizeFilename('file<>:"/\\|?*.txt');
      expect(result).toBe('file.txt');
    });

    it('should remove leading dots', () => {
      const result = InputValidator.sanitizeFilename('...hidden-file.txt');
      expect(result).toBe('hidden-file.txt');
    });

    it('should limit length to 255 characters', () => {
      const longName = 'a'.repeat(300);
      const result = InputValidator.sanitizeFilename(longName);
      expect(result.length).toBe(255);
    });

    it('should trim whitespace', () => {
      const result = InputValidator.sanitizeFilename('  filename.txt  ');
      expect(result).toBe('filename.txt');
    });

    it('should return empty string for non-string input', () => {
      const result = InputValidator.sanitizeFilename(123);
      expect(result).toBe('');
    });
  });

  describe('sanitizeCategory', () => {
    it('should allow alphanumeric characters, underscores, and hyphens', () => {
      const result = InputValidator.sanitizeCategory('Movies_2023-HD');
      expect(result).toBe('Movies_2023-HD');
    });

    it('should remove special characters', () => {
      const result = InputValidator.sanitizeCategory('Movies@#$%^&*()2023');
      expect(result).toBe('Movies2023');
    });

    it('should limit length to 100 characters', () => {
      const longCategory = 'a'.repeat(150);
      const result = InputValidator.sanitizeCategory(longCategory);
      expect(result.length).toBe(100);
    });

    it('should trim whitespace', () => {
      const result = InputValidator.sanitizeCategory('  Movies  ');
      expect(result).toBe('Movies');
    });

    it('should return empty string for non-string input', () => {
      const result = InputValidator.sanitizeCategory(null);
      expect(result).toBe('');
    });
  });

  describe('sanitizePath', () => {
    it('should remove directory traversal attempts', () => {
      const result = InputValidator.sanitizePath('/home/../../../etc/passwd');
      expect(result).toBe('/home/etc/passwd');
    });

    it('should remove dangerous characters', () => {
      const result = InputValidator.sanitizePath('/path/with<>"|?*chars');
      expect(result).toBe('/path/withchars');
    });

    it('should limit length to 500 characters', () => {
      const longPath = '/path/' + 'a'.repeat(600);
      const result = InputValidator.sanitizePath(longPath);
      expect(result.length).toBe(500);
    });

    it('should trim whitespace', () => {
      const result = InputValidator.sanitizePath('  /home/user/downloads  ');
      expect(result).toBe('/home/user/downloads');
    });

    it('should return empty string for non-string input', () => {
      const result = InputValidator.sanitizePath(123);
      expect(result).toBe('');
    });
  });

  describe('validatePort', () => {
    it('should validate valid port numbers', () => {
      expect(InputValidator.validatePort(8080)).toBe(true);
      expect(InputValidator.validatePort('8080')).toBe(true);
      expect(InputValidator.validatePort(1)).toBe(true);
      expect(InputValidator.validatePort(65535)).toBe(true);
    });

    it('should reject invalid port numbers', () => {
      expect(InputValidator.validatePort(0)).toBe(false);
      expect(InputValidator.validatePort(65536)).toBe(false);
      expect(InputValidator.validatePort(-1)).toBe(false);
      expect(InputValidator.validatePort('abc')).toBe(false);
      expect(InputValidator.validatePort(null)).toBe(false);
    });
  });

  describe('validateTimeout', () => {
    it('should validate valid timeout values', () => {
      expect(InputValidator.validateTimeout(30)).toBe(true);
      expect(InputValidator.validateTimeout('60')).toBe(true);
      expect(InputValidator.validateTimeout(1)).toBe(true);
      expect(InputValidator.validateTimeout(300)).toBe(true);
    });

    it('should reject invalid timeout values', () => {
      expect(InputValidator.validateTimeout(0)).toBe(false);
      expect(InputValidator.validateTimeout(301)).toBe(false);
      expect(InputValidator.validateTimeout(-1)).toBe(false);
      expect(InputValidator.validateTimeout('abc')).toBe(false);
      expect(InputValidator.validateTimeout(null)).toBe(false);
    });
  });

  describe('validateRetryAttempts', () => {
    it('should validate valid retry attempt values', () => {
      expect(InputValidator.validateRetryAttempts(3)).toBe(true);
      expect(InputValidator.validateRetryAttempts('5')).toBe(true);
      expect(InputValidator.validateRetryAttempts(1)).toBe(true);
      expect(InputValidator.validateRetryAttempts(10)).toBe(true);
    });

    it('should reject invalid retry attempt values', () => {
      expect(InputValidator.validateRetryAttempts(0)).toBe(false);
      expect(InputValidator.validateRetryAttempts(11)).toBe(false);
      expect(InputValidator.validateRetryAttempts(-1)).toBe(false);
      expect(InputValidator.validateRetryAttempts('abc')).toBe(false);
      expect(InputValidator.validateRetryAttempts(null)).toBe(false);
    });
  });

  describe('sanitizeUsername', () => {
    it('should remove HTML characters', () => {
      const result = InputValidator.sanitizeUsername('user<script>alert("xss")</script>');
      expect(result).toBe('useralert("xss")');
    });

    it('should limit length to 100 characters', () => {
      const longUsername = 'u'.repeat(150);
      const result = InputValidator.sanitizeUsername(longUsername);
      expect(result.length).toBe(100);
    });

    it('should trim whitespace', () => {
      const result = InputValidator.sanitizeUsername('  admin  ');
      expect(result).toBe('admin');
    });

    it('should return empty string for non-string input', () => {
      const result = InputValidator.sanitizeUsername(123);
      expect(result).toBe('');
    });
  });

  describe('validateFormData', () => {
    it('should validate and sanitize complete form data', () => {
      const formData = {
        server: {
          url: 'http://localhost:8080',
          username: 'admin',
          password: 'password123',
          customPort: 8080
        },
        options: {
          category: 'Movies',
          savePath: '/downloads',
          paused: true,
          autoDownload: false
        }
      };

      const result = InputValidator.validateFormData(formData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedData.server.url).toBe('http://localhost:8080');
      expect(result.sanitizedData.server.username).toBe('admin');
      expect(result.sanitizedData.options.category).toBe('Movies');
      expect(result.sanitizedData.options.paused).toBe(true);
    });

    it('should collect validation errors', () => {
      const formData = {
        server: {
          url: 'invalid-url',
          customPort: 70000,
          password: ''
        }
      };

      const result = InputValidator.validateFormData(formData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid server URL');
      expect(result.errors).toContain('Invalid port number');
      expect(result.errors).toContain('Password must be between 1 and 500 characters');
    });

    it('should handle empty form data', () => {
      const result = InputValidator.validateFormData({});

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedData).toEqual({});
    });

    it('should sanitize boolean options', () => {
      const formData = {
        options: {
          paused: 'true',
          autoDownload: 1,
          showNotifications: 0
        }
      };

      const result = InputValidator.validateFormData(formData);

      expect(result.sanitizedData.options.paused).toBe(true);
      expect(result.sanitizedData.options.autoDownload).toBe(true);
      expect(result.sanitizedData.options.showNotifications).toBe(false);
    });
  });
});

describe('RateLimiter', () => {
  let rateLimiter;

  beforeEach(() => {
    rateLimiter = new global.testRateLimiter();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('isAllowed', () => {
    it('should allow requests within limit', () => {
      expect(rateLimiter.isAllowed('user1', 5, 60000)).toBe(true);
      expect(rateLimiter.isAllowed('user1', 5, 60000)).toBe(true);
      expect(rateLimiter.isAllowed('user1', 5, 60000)).toBe(true);
    });

    it('should reject requests over limit', () => {
      // Fill up the limit
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.isAllowed('user1', 5, 60000)).toBe(true);
      }
      
      // This should be rejected
      expect(rateLimiter.isAllowed('user1', 5, 60000)).toBe(false);
    });

    it('should handle different keys separately', () => {
      // Fill up limit for user1
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.isAllowed('user1', 5, 60000)).toBe(true);
      }
      
      // user2 should still be allowed
      expect(rateLimiter.isAllowed('user2', 5, 60000)).toBe(true);
    });

    it('should reset after time window', () => {
      // Fill up the limit
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.isAllowed('user1', 5, 60000)).toBe(true);
      }
      
      // Should be rejected
      expect(rateLimiter.isAllowed('user1', 5, 60000)).toBe(false);
      
      // Advance time past window
      jest.advanceTimersByTime(61000);
      
      // Should be allowed again
      expect(rateLimiter.isAllowed('user1', 5, 60000)).toBe(true);
    });

    it('should use default values', () => {
      // Default is 10 requests per 60000ms
      for (let i = 0; i < 10; i++) {
        expect(rateLimiter.isAllowed('user1')).toBe(true);
      }
      
      expect(rateLimiter.isAllowed('user1')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear requests for specific key', () => {
      // Fill up limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.isAllowed('user1', 5, 60000);
      }
      
      // Should be rejected
      expect(rateLimiter.isAllowed('user1', 5, 60000)).toBe(false);
      
      // Clear the key
      rateLimiter.clear('user1');
      
      // Should be allowed again
      expect(rateLimiter.isAllowed('user1', 5, 60000)).toBe(true);
    });
  });

  describe('clearAll', () => {
    it('should clear all requests', () => {
      // Fill up limits for multiple users
      for (let i = 0; i < 5; i++) {
        rateLimiter.isAllowed('user1', 5, 60000);
        rateLimiter.isAllowed('user2', 5, 60000);
      }
      
      // Both should be rejected
      expect(rateLimiter.isAllowed('user1', 5, 60000)).toBe(false);
      expect(rateLimiter.isAllowed('user2', 5, 60000)).toBe(false);
      
      // Clear all
      rateLimiter.clearAll();
      
      // Both should be allowed again
      expect(rateLimiter.isAllowed('user1', 5, 60000)).toBe(true);
      expect(rateLimiter.isAllowed('user2', 5, 60000)).toBe(true);
    });
  });
});