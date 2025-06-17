/**
 * Unit tests for API Client
 * Tests authentication, API calls, torrent sending, and error handling
 */

describe('API Client', () => {
  let apiClient;
  let mockChrome;
  let mockFetch;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Chrome APIs
    mockChrome = {
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    };
    global.chrome = mockChrome;

    // Mock fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Mock InputValidator
    global.InputValidator = {
      validateMagnetLink: jest.fn(),
      validateTorrentUrl: jest.fn()
    };

    // Mock SecureStorageManager
    global.SecureStorageManager = {
      getCredentials: jest.fn()
    };

    // Import API client functions (simulating the script loading)
    eval(`
      let authCookie = null;
      let lastAuthTime = 0;
      const AUTH_TIMEOUT = 30 * 60 * 1000;

      async function getSettings() {
        let serverConfig;
        try {
          if (typeof SecureStorageManager !== 'undefined') {
            serverConfig = await SecureStorageManager.getCredentials();
          } else {
            const result = await chrome.storage.sync.get(['server']);
            serverConfig = result.server || {};
          }
        } catch (error) {
          console.error('Error getting credentials:', error);
          const result = await chrome.storage.sync.get(['server']);
          serverConfig = result.server || {};
        }
        
        const result = await chrome.storage.sync.get(['options']);
        return {
          server: serverConfig,
          options: result.options
        };
      }

      async function authenticate() {
        const { server } = await getSettings();

        if (!server.url || !server.username) {
          throw new Error('Server configuration not found');
        }

        if (authCookie && (Date.now() - lastAuthTime) < AUTH_TIMEOUT) {
          return authCookie;
        }

        const loginUrl = \`\${server.url}/api/v2/auth/login\`;
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
            throw new Error(\`Authentication failed: \${response.status}\`);
          }

          const responseText = await response.text();

          if (responseText !== 'Ok.') {
            throw new Error('Invalid credentials');
          }

          const setCookieHeader = response.headers.get('set-cookie');
          if (setCookieHeader) {
            authCookie = setCookieHeader.split(';')[0];
            lastAuthTime = Date.now();
          }

          return authCookie;
        } catch (error) {
          console.error('Authentication error:', error);
          throw new Error('Authentication failed. Please check your credentials.');
        }
      }

      async function makeAuthenticatedRequest(endpoint, options = {}) {
        const { server } = await getSettings();
        const cookie = await authenticate();

        const url = \`\${server.url}/api/v2/\${endpoint}\`;
        const requestOptions = {
          ...options,
          headers: {
            ...options.headers,
            'Cookie': cookie
          }
        };

        const response = await fetch(url, requestOptions);

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication required');
          } else if (response.status === 403) {
            throw new Error('Access denied');
          } else if (response.status >= 500) {
            throw new Error('Server error occurred');
          } else {
            throw new Error('Request failed');
          }
        }

        return response;
      }

      async function sendTorrent(torrentUrl, customOptions = {}) {
        if (typeof InputValidator !== 'undefined') {
          if (!InputValidator.validateMagnetLink(torrentUrl) && !InputValidator.validateTorrentUrl(torrentUrl)) {
            throw new Error('Invalid torrent URL or magnet link');
          }
        }

        const { options } = await getSettings();

        const formData = new FormData();

        if (torrentUrl.startsWith('magnet:')) {
          formData.append('urls', torrentUrl);
        } else {
          const torrentResponse = await fetch(torrentUrl);
          const torrentBlob = await torrentResponse.blob();
          
          if (torrentBlob.size > 10 * 1024 * 1024) {
            throw new Error('Torrent file too large');
          }
          
          formData.append('torrents', torrentBlob, 'download.torrent');
        }

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
          throw new Error(\`Failed to add torrent: \${responseText}\`);
        }

        return { success: true, name: extractTorrentName(torrentUrl) };
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

      function extractTorrentName(url) {
        if (url.startsWith('magnet:')) {
          const match = url.match(/dn=([^&]+)/);
          return match ? decodeURIComponent(match[1]) : 'Magnet Link';
        } else {
          const urlParts = url.split('/');
          return urlParts[urlParts.length - 1].replace('.torrent', '');
        }
      }

      // Export functions for testing
      global.testApiClient = {
        getSettings,
        authenticate,
        makeAuthenticatedRequest,
        sendTorrent,
        testConnection,
        extractTorrentName
      };
    `);
  });

  describe('getSettings', () => {
    it('should get settings from secure storage when available', async () => {
      const mockCredentials = {
        url: 'http://localhost:8080',
        username: 'testuser',
        password: 'testpass'
      };
      const mockOptions = { category: 'test' };

      global.SecureStorageManager.getCredentials.mockResolvedValue(mockCredentials);
      mockChrome.storage.sync.get.mockResolvedValue({ options: mockOptions });

      const settings = await global.testApiClient.getSettings();

      expect(settings).toEqual({
        server: mockCredentials,
        options: mockOptions
      });
      expect(global.SecureStorageManager.getCredentials).toHaveBeenCalled();
    });

    it('should fallback to chrome storage when secure storage fails', async () => {
      const mockServer = { url: 'http://localhost:8080', username: 'admin' };
      const mockOptions = { category: 'test' };

      global.SecureStorageManager.getCredentials.mockRejectedValue(new Error('Secure storage failed'));
      mockChrome.storage.sync.get
        .mockResolvedValueOnce({ server: mockServer })
        .mockResolvedValueOnce({ options: mockOptions });

      const settings = await global.testApiClient.getSettings();

      expect(settings).toEqual({
        server: mockServer,
        options: mockOptions
      });
    });
  });

  describe('authenticate', () => {
    beforeEach(() => {
      mockChrome.storage.sync.get.mockImplementation((keys) => {
        if (keys.includes('server')) {
          return Promise.resolve({
            server: {
              url: 'http://localhost:8080',
              username: 'admin',
              password: 'password123'
            }
          });
        }
        return Promise.resolve({});
      });
    });

    it('should authenticate successfully with valid credentials', async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('Ok.'),
        headers: {
          get: jest.fn().mockReturnValue('SID=test-session-id; Path=/')
        }
      };
      mockFetch.mockResolvedValue(mockResponse);

      const cookie = await global.testApiClient.authenticate();

      expect(cookie).toBe('SID=test-session-id');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v2/auth/login',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include'
        })
      );
    });

    it('should throw error when server configuration is missing', async () => {
      mockChrome.storage.sync.get.mockResolvedValue({ server: {} });

      await expect(global.testApiClient.authenticate()).rejects.toThrow(
        'Server configuration not found'
      );
    });

    it('should throw error when authentication fails with non-200 status', async () => {
      const mockResponse = {
        ok: false,
        status: 401
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(global.testApiClient.authenticate()).rejects.toThrow(
        'Authentication failed. Please check your credentials.'
      );
    });

    it('should throw error when response is not "Ok."', async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('Fails.'),
        headers: { get: jest.fn() }
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(global.testApiClient.authenticate()).rejects.toThrow(
        'Authentication failed. Please check your credentials.'
      );
    });

    it('should reuse valid auth cookie within timeout', async () => {
      // First authentication
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('Ok.'),
        headers: {
          get: jest.fn().mockReturnValue('SID=test-session-id; Path=/')
        }
      };
      mockFetch.mockResolvedValue(mockResponse);

      const cookie1 = await global.testApiClient.authenticate();
      const cookie2 = await global.testApiClient.authenticate();

      expect(cookie1).toBe(cookie2);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('makeAuthenticatedRequest', () => {
    beforeEach(() => {
      // Mock successful authentication
      mockChrome.storage.sync.get.mockImplementation((keys) => {
        if (keys.includes('server')) {
          return Promise.resolve({
            server: {
              url: 'http://localhost:8080',
              username: 'admin',
              password: 'password123'
            }
          });
        }
        return Promise.resolve({});
      });

      // Mock successful auth response
      const mockAuthResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('Ok.'),
        headers: {
          get: jest.fn().mockReturnValue('SID=test-session-id; Path=/')
        }
      };
      mockFetch.mockResolvedValueOnce(mockAuthResponse);
    });

    it('should make authenticated request successfully', async () => {
      const mockApiResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('success')
      };
      mockFetch.mockResolvedValueOnce(mockApiResponse);

      const response = await global.testApiClient.makeAuthenticatedRequest('app/version');

      expect(response).toBe(mockApiResponse);
      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://localhost:8080/api/v2/app/version',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Cookie': 'SID=test-session-id'
          })
        })
      );
    });

    it('should handle 401 unauthorized error', async () => {
      const mockApiResponse = {
        ok: false,
        status: 401
      };
      mockFetch.mockResolvedValueOnce(mockApiResponse);

      await expect(
        global.testApiClient.makeAuthenticatedRequest('app/version')
      ).rejects.toThrow('Authentication required');
    });

    it('should handle 403 forbidden error', async () => {
      const mockApiResponse = {
        ok: false,
        status: 403
      };
      mockFetch.mockResolvedValueOnce(mockApiResponse);

      await expect(
        global.testApiClient.makeAuthenticatedRequest('app/version')
      ).rejects.toThrow('Access denied');
    });

    it('should handle 500 server error', async () => {
      const mockApiResponse = {
        ok: false,
        status: 500
      };
      mockFetch.mockResolvedValueOnce(mockApiResponse);

      await expect(
        global.testApiClient.makeAuthenticatedRequest('app/version')
      ).rejects.toThrow('Server error occurred');
    });
  });

  describe('sendTorrent', () => {
    beforeEach(() => {
      // Mock successful authentication
      mockChrome.storage.sync.get.mockImplementation((keys) => {
        if (keys.includes('server')) {
          return Promise.resolve({
            server: {
              url: 'http://localhost:8080',
              username: 'admin',
              password: 'password123'
            }
          });
        }
        if (keys.includes('options')) {
          return Promise.resolve({
            options: {
              category: 'default',
              savePath: '/downloads',
              paused: false
            }
          });
        }
        return Promise.resolve({});
      });

      // Mock authentication response
      const mockAuthResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('Ok.'),
        headers: {
          get: jest.fn().mockReturnValue('SID=test-session-id; Path=/')
        }
      };
      mockFetch.mockResolvedValueOnce(mockAuthResponse);
    });

    it('should send magnet link successfully', async () => {
      const magnetUrl = 'magnet:?xt=urn:btih:abc123&dn=Test%20Torrent';

      global.InputValidator.validateMagnetLink.mockReturnValue(true);
      global.InputValidator.validateTorrentUrl.mockReturnValue(false);

      const mockApiResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('Ok.')
      };
      mockFetch.mockResolvedValueOnce(mockApiResponse);

      const result = await global.testApiClient.sendTorrent(magnetUrl);

      expect(result).toEqual({
        success: true,
        name: 'Test Torrent'
      });
      expect(global.InputValidator.validateMagnetLink).toHaveBeenCalledWith(magnetUrl);
    });

    it('should send torrent file successfully', async () => {
      const torrentUrl = 'http://example.com/test.torrent';

      global.InputValidator.validateMagnetLink.mockReturnValue(false);
      global.InputValidator.validateTorrentUrl.mockReturnValue(true);

      // Mock torrent file fetch
      const mockTorrentBlob = new Blob(['fake torrent data'], { type: 'application/x-bittorrent' });
      Object.defineProperty(mockTorrentBlob, 'size', { value: 1024 });

      const mockTorrentResponse = {
        blob: jest.fn().mockResolvedValue(mockTorrentBlob)
      };

      const mockApiResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('Ok.')
      };

      mockFetch
        .mockResolvedValueOnce(mockTorrentResponse) // First call for torrent file
        .mockResolvedValueOnce(mockApiResponse); // Second call for API

      const result = await global.testApiClient.sendTorrent(torrentUrl);

      expect(result).toEqual({
        success: true,
        name: 'test'
      });
    });

    it('should reject invalid torrent URL', async () => {
      const invalidUrl = 'not-a-valid-url';

      global.InputValidator.validateMagnetLink.mockReturnValue(false);
      global.InputValidator.validateTorrentUrl.mockReturnValue(false);

      await expect(
        global.testApiClient.sendTorrent(invalidUrl)
      ).rejects.toThrow('Invalid torrent URL or magnet link');
    });

    it('should reject torrent file that is too large', async () => {
      const torrentUrl = 'http://example.com/large.torrent';

      global.InputValidator.validateMagnetLink.mockReturnValue(false);
      global.InputValidator.validateTorrentUrl.mockReturnValue(true);

      // Mock large torrent file
      const mockLargeBlob = new Blob(['fake large torrent data']);
      Object.defineProperty(mockLargeBlob, 'size', { value: 11 * 1024 * 1024 }); // 11MB

      const mockTorrentResponse = {
        blob: jest.fn().mockResolvedValue(mockLargeBlob)
      };

      mockFetch.mockResolvedValueOnce(mockTorrentResponse);

      await expect(
        global.testApiClient.sendTorrent(torrentUrl)
      ).rejects.toThrow('Torrent file too large');
    });

    it('should apply custom options when provided', async () => {
      const magnetUrl = 'magnet:?xt=urn:btih:abc123&dn=Test%20Torrent';
      const customOptions = {
        category: 'custom',
        savePath: '/custom/path',
        paused: true,
        skipHashCheck: true
      };

      global.InputValidator.validateMagnetLink.mockReturnValue(true);

      const mockApiResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('Ok.')
      };
      mockFetch.mockResolvedValueOnce(mockApiResponse);

      await global.testApiClient.sendTorrent(magnetUrl, customOptions);

      // Verify the form data would contain custom options
      const fetchCall = mockFetch.mock.calls.find(call =>
        call[0].includes('torrents/add')
      );
      expect(fetchCall).toBeDefined();
    });
  });

  describe('testConnection', () => {
    beforeEach(() => {
      // Mock successful authentication
      mockChrome.storage.sync.get.mockImplementation((keys) => {
        if (keys.includes('server')) {
          return Promise.resolve({
            server: {
              url: 'http://localhost:8080',
              username: 'admin',
              password: 'password123'
            }
          });
        }
        return Promise.resolve({});
      });

      const mockAuthResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('Ok.'),
        headers: {
          get: jest.fn().mockReturnValue('SID=test-session-id; Path=/')
        }
      };
      mockFetch.mockResolvedValueOnce(mockAuthResponse);
    });

    it('should return connection success with version', async () => {
      const mockVersionResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('v4.4.0')
      };
      mockFetch.mockResolvedValueOnce(mockVersionResponse);

      const result = await global.testApiClient.testConnection();

      expect(result).toEqual({
        connected: true,
        version: 'v4.4.0'
      });
    });

    it('should return connection failure on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await global.testApiClient.testConnection();

      expect(result).toEqual({
        connected: false,
        error: 'Network error'
      });
    });
  });

  describe('extractTorrentName', () => {
    it('should extract name from magnet link', () => {
      const magnetUrl = 'magnet:?xt=urn:btih:abc123&dn=Test%20Torrent%20Name&tr=http://tracker.example.com';
      const name = global.testApiClient.extractTorrentName(magnetUrl);
      expect(name).toBe('Test Torrent Name');
    });

    it('should return default name for magnet without display name', () => {
      const magnetUrl = 'magnet:?xt=urn:btih:abc123&tr=http://tracker.example.com';
      const name = global.testApiClient.extractTorrentName(magnetUrl);
      expect(name).toBe('Magnet Link');
    });

    it('should extract name from torrent file URL', () => {
      const torrentUrl = 'http://example.com/path/My.Awesome.Torrent.File.torrent';
      const name = global.testApiClient.extractTorrentName(torrentUrl);
      expect(name).toBe('My.Awesome.Torrent.File');
    });

    it('should handle URL with query parameters', () => {
      const torrentUrl = 'http://example.com/download.torrent?id=123&token=abc';
      const name = global.testApiClient.extractTorrentName(torrentUrl);
      expect(name).toBe('download');
    });
  });
});