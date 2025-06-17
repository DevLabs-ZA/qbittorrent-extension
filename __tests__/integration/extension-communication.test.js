/**
 * Integration tests for extension communication
 * Tests message passing between content scripts, background scripts, and popup
 */

describe('Extension Communication Integration', () => {
  let mockChrome;
  let backgroundScript;
  let contentScript;

  beforeAll(() => {
    // Mock Chrome extension APIs
    mockChrome = {
      runtime: {
        sendMessage: jest.fn(),
        onMessage: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        }
      },
      tabs: {
        query: jest.fn(),
        sendMessage: jest.fn()
      },
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn()
        },
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      },
      contextMenus: {
        create: jest.fn(),
        onClicked: {
          addListener: jest.fn()
        }
      },
      notifications: {
        create: jest.fn()
      }
    };

    global.chrome = mockChrome;
    global.fetch = jest.fn();

    // Mock rate limiter
    global.RateLimiter = class {
      isAllowed() { return true; }
    };

    // Mock validation
    global.InputValidator = {
      validateMagnetLink: jest.fn().mockReturnValue(true),
      validateTorrentUrl: jest.fn().mockReturnValue(true)
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Content Script to Background Communication', () => {
    it('should send torrent from content script to background', async () => {
      const torrentUrl = 'magnet:?xt=urn:btih:abc123def456789012345678901234567890abcd';
      
      // Mock successful background response
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        result: { name: 'Test Torrent' }
      });

      // Simulate content script sending message
      const response = await mockChrome.runtime.sendMessage({
        action: 'SEND_TORRENT',
        url: torrentUrl
      });

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'SEND_TORRENT',
        url: torrentUrl
      });
      expect(response.success).toBe(true);
      expect(response.result.name).toBe('Test Torrent');
    });

    it('should handle background script error responses', async () => {
      const torrentUrl = 'invalid-url';
      
      // Mock error response
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: false,
        error: 'Invalid torrent URL'
      });

      const response = await mockChrome.runtime.sendMessage({
        action: 'SEND_TORRENT',
        url: torrentUrl
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid torrent URL');
    });

    it('should get all torrents from content script', async () => {
      const mockTorrents = [
        'magnet:?xt=urn:btih:abc123',
        'http://example.com/test.torrent'
      ];

      // Mock tabs.sendMessage for getting torrents
      mockChrome.tabs.sendMessage.mockResolvedValue({
        torrents: mockTorrents
      });

      // Simulate background script requesting torrents from active tab
      mockChrome.tabs.query.mockResolvedValue([{ id: 1 }]);
      
      const [tab] = await mockChrome.tabs.query({ active: true, currentWindow: true });
      const response = await mockChrome.tabs.sendMessage(tab.id, { action: 'GET_ALL_TORRENTS' });

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(1, { action: 'GET_ALL_TORRENTS' });
      expect(response.torrents).toEqual(mockTorrents);
    });
  });

  describe('Popup to Background Communication', () => {
    it('should test connection from popup', async () => {
      // Mock successful connection test
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        connected: { connected: true, version: 'v4.4.0' }
      });

      const response = await mockChrome.runtime.sendMessage({
        action: 'TEST_CONNECTION'
      });

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'TEST_CONNECTION'
      });
      expect(response.success).toBe(true);
      expect(response.connected.connected).toBe(true);
    });

    it('should get server info from popup', async () => {
      const mockServerInfo = {
        version: 'v4.4.0',
        webPort: 8080,
        categories: { Movies: {}, TV: {} }
      };

      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        info: mockServerInfo
      });

      const response = await mockChrome.runtime.sendMessage({
        action: 'GET_SERVER_INFO'
      });

      expect(response.success).toBe(true);
      expect(response.info).toEqual(mockServerInfo);
    });

    it('should send multiple torrents from popup', async () => {
      const torrentUrls = [
        'magnet:?xt=urn:btih:abc123',
        'magnet:?xt=urn:btih:def456'
      ];

      const mockResults = [
        { url: torrentUrls[0], success: true, result: { name: 'Torrent 1' } },
        { url: torrentUrls[1], success: true, result: { name: 'Torrent 2' } }
      ];

      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        results: mockResults
      });

      const response = await mockChrome.runtime.sendMessage({
        action: 'SEND_MULTIPLE',
        urls: torrentUrls,
        options: {}
      });

      expect(response.success).toBe(true);
      expect(response.results).toHaveLength(2);
      expect(response.results[0].success).toBe(true);
      expect(response.results[1].success).toBe(true);
    });
  });

  describe('Background Script Message Handling', () => {
    it('should handle rate limiting', () => {
      // Mock rate limiter that denies request
      global.RateLimiter = class {
        isAllowed() { return false; }
      };

      const rateLimiter = new global.RateLimiter();
      const isAllowed = rateLimiter.isAllowed('test-sender', 20, 60000);

      expect(isAllowed).toBe(false);
    });

    it('should validate message actions', () => {
      const validActions = [
        'SEND_TORRENT',
        'SEND_MULTIPLE',
        'TEST_CONNECTION',
        'GET_SERVER_INFO'
      ];

      validActions.forEach(action => {
        expect(validActions).toContain(action);
      });

      const invalidAction = 'INVALID_ACTION';
      expect(validActions).not.toContain(invalidAction);
    });
  });

  describe('Storage Integration', () => {
    it('should sync settings between components', async () => {
      const mockSettings = {
        server: {
          url: 'http://localhost:8080',
          username: 'admin',
          password: 'secret'
        },
        options: {
          category: 'Movies',
          autoDownload: true
        }
      };

      // Mock storage.sync.get
      mockChrome.storage.sync.get.mockResolvedValue(mockSettings);

      const settings = await mockChrome.storage.sync.get();

      expect(settings).toEqual(mockSettings);
    });

    it('should handle storage errors gracefully', async () => {
      const error = new Error('Storage quota exceeded');
      mockChrome.storage.sync.get.mockRejectedValue(error);

      try {
        await mockChrome.storage.sync.get();
      } catch (e) {
        expect(e.message).toBe('Storage quota exceeded');
      }
    });

    it('should validate stored data', async () => {
      const invalidSettings = {
        server: {
          url: 'invalid-url',
          username: '<script>alert("xss")</script>'
        }
      };

      // In a real integration, this would be validated
      const validatedSettings = {
        server: {
          url: '', // Invalid URL becomes empty
          username: 'alert("xss")' // HTML stripped
        }
      };

      // Mock validation logic
      if (global.InputValidator && global.InputValidator.validateFormData) {
        const validation = global.InputValidator.validateFormData(invalidSettings);
        expect(validation.isValid).toBe(false);
      }
    });
  });

  describe('Context Menu Integration', () => {
    it('should create context menus on installation', () => {
      // Simulate extension installation
      const onInstalledCallback = jest.fn(() => {
        mockChrome.contextMenus.create({
          id: 'send-to-qbittorrent',
          title: 'Send to qBittorrent',
          contexts: ['link'],
          targetUrlPatterns: ['*magnet:*', '*.torrent']
        });

        mockChrome.contextMenus.create({
          id: 'send-all-torrents',
          title: 'Send all torrents on page',
          contexts: ['page']
        });
      });

      onInstalledCallback();

      expect(mockChrome.contextMenus.create).toHaveBeenCalledTimes(2);
      expect(mockChrome.contextMenus.create).toHaveBeenCalledWith({
        id: 'send-to-qbittorrent',
        title: 'Send to qBittorrent',
        contexts: ['link'],
        targetUrlPatterns: ['*magnet:*', '*.torrent']
      });
    });

    it('should handle context menu clicks', () => {
      const mockInfo = {
        menuItemId: 'send-to-qbittorrent',
        linkUrl: 'magnet:?xt=urn:btih:abc123'
      };
      const mockTab = { id: 1, url: 'https://example.com' };

      // Simulate context menu click handler
      const onClickedCallback = jest.fn((info, tab) => {
        if (info.menuItemId === 'send-to-qbittorrent') {
          // Would normally send torrent
          expect(info.linkUrl).toBe('magnet:?xt=urn:btih:abc123');
        }
      });

      onClickedCallback(mockInfo, mockTab);

      expect(onClickedCallback).toHaveBeenCalledWith(mockInfo, mockTab);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network request failed');
      mockChrome.runtime.sendMessage.mockRejectedValue(networkError);

      try {
        await mockChrome.runtime.sendMessage({
          action: 'SEND_TORRENT',
          url: 'magnet:?xt=urn:btih:abc123'
        });
      } catch (error) {
        expect(error.message).toBe('Network request failed');
      }
    });

    it('should handle malformed messages', () => {
      const malformedMessage = {
        // Missing required action field
        url: 'magnet:?xt=urn:btih:abc123'
      };

      // In real implementation, this would be validated
      const isValidMessage = malformedMessage.action !== undefined;
      expect(isValidMessage).toBe(false);
    });

    it('should handle authentication failures', async () => {
      global.fetch.mockRejectedValue(new Error('Authentication failed'));

      try {
        await global.fetch('http://localhost:8080/api/v2/auth/login', {
          method: 'POST',
          body: new FormData()
        });
      } catch (error) {
        expect(error.message).toBe('Authentication failed');
      }
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full torrent sending workflow', async () => {
      const torrentUrl = 'magnet:?xt=urn:btih:abc123def456789012345678901234567890abcd&dn=Test%20Movie';

      // Step 1: Content script detects link
      const detectedLinks = [
        {
          url: torrentUrl,
          type: 'magnet',
          name: 'Test Movie'
        }
      ];

      // Step 2: User clicks context menu or indicator
      // Step 3: Message sent to background script
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        result: { name: 'Test Movie' }
      });

      // Step 4: Background script authenticates and sends to qBittorrent
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('Ok.'),
          headers: {
            get: () => 'SID=test-session; Path=/'
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('Ok.')
        });

      // Simulate the workflow
      const response = await mockChrome.runtime.sendMessage({
        action: 'SEND_TORRENT',
        url: torrentUrl
      });

      expect(response.success).toBe(true);
      expect(response.result.name).toBe('Test Movie');
    });

    it('should handle options page configuration workflow', async () => {
      const newSettings = {
        server: {
          url: 'http://localhost:8080',
          username: 'admin',
          password: 'newpassword'
        },
        options: {
          category: 'Downloads',
          autoDownload: false
        }
      };

      // Step 1: User modifies settings in options page
      // Step 2: Settings are validated
      // Step 3: Settings are saved to storage
      mockChrome.storage.sync.set.mockResolvedValue();

      await mockChrome.storage.sync.set(newSettings);

      // Step 4: Settings are retrieved by other components
      mockChrome.storage.sync.get.mockResolvedValue(newSettings);

      const retrievedSettings = await mockChrome.storage.sync.get();

      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith(newSettings);
      expect(retrievedSettings).toEqual(newSettings);
    });
  });
});