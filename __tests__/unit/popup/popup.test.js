/**
 * Unit tests for Popup Component
 * Tests popup functionality, UI interactions, and settings management
 */

describe('Popup Component', () => {
  let mockChrome;
  let mockDocument;
  let mockElements;

  beforeAll(() => {
    // Mock DOM elements
    mockElements = {
      savePathInput: {
        value: '',
        addEventListener: jest.fn()
      },
      pausedCheckbox: {
        checked: false,
        addEventListener: jest.fn()
      },
      categorySelect: {
        value: '',
        innerHTML: '',
        appendChild: jest.fn(),
        addEventListener: jest.fn()
      },
      connectionStatus: {
        textContent: '',
        className: ''
      },
      torrentCount: {
        textContent: '0'
      },
      sendAllBtn: {
        disabled: true,
        textContent: '',
        addEventListener: jest.fn()
      },
      refreshBtn: {
        addEventListener: jest.fn()
      },
      testConnectionBtn: {
        addEventListener: jest.fn()
      },
      optionsBtn: {
        addEventListener: jest.fn()
      },
      notification: {
        textContent: '',
        className: '',
        classList: {
          remove: jest.fn(),
          add: jest.fn()
        }
      }
    };

    // Mock document
    mockDocument = {
      getElementById: jest.fn().mockImplementation((id) => {
        const elementMap = {
          'save-path-input': mockElements.savePathInput,
          'paused-checkbox': mockElements.pausedCheckbox,
          'category-select': mockElements.categorySelect,
          'connection-status': mockElements.connectionStatus,
          'torrent-count': mockElements.torrentCount,
          'send-all-btn': mockElements.sendAllBtn,
          'refresh-btn': mockElements.refreshBtn,
          'test-connection-btn': mockElements.testConnectionBtn,
          'options-btn': mockElements.optionsBtn,
          'notification': mockElements.notification
        };
        return elementMap[id] || null;
      }),
      createElement: jest.fn(),
      addEventListener: jest.fn()
    };

    // Mock Chrome APIs
    mockChrome = {
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn()
        }
      },
      runtime: {
        sendMessage: jest.fn(),
        openOptionsPage: jest.fn()
      },
      tabs: {
        query: jest.fn(),
        sendMessage: jest.fn()
      }
    };

    global.document = mockDocument;
    global.chrome = mockChrome;

    // Mock setTimeout for notifications
    global.setTimeout = jest.fn((fn, delay) => {
      if (delay <= 100) {
        fn(); // Execute immediately for short delays
      }
      return 1;
    });

    // Load popup script logic
    eval(`
      async function loadSettings() {
        try {
          const result = await chrome.storage.sync.get(['options']);
          const options = result.options || {};
          
          document.getElementById('save-path-input').value = options.savePath || '';
          document.getElementById('paused-checkbox').checked = options.paused || false;
        } catch (error) {
          console.error('Error loading settings:', error);
        }
      }

      async function checkConnectionStatus() {
        const statusElement = document.getElementById('connection-status');
        statusElement.textContent = 'Checking...';
        statusElement.className = 'status-value checking';
        
        try {
          const response = await chrome.runtime.sendMessage({ action: 'TEST_CONNECTION' });
          
          if (response.success && response.connected) {
            statusElement.textContent = 'Connected';
            statusElement.className = 'status-value connected';
          } else {
            statusElement.textContent = 'Disconnected';
            statusElement.className = 'status-value disconnected';
          }
        } catch (error) {
          statusElement.textContent = 'Error';
          statusElement.className = 'status-value disconnected';
          console.error('Connection test failed:', error);
        }
      }

      async function updateTorrentCount() {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_ALL_TORRENTS' });
          
          const count = response.torrents ? response.torrents.length : 0;
          document.getElementById('torrent-count').textContent = count;
          
          const sendAllBtn = document.getElementById('send-all-btn');
          sendAllBtn.disabled = count === 0;
          sendAllBtn.textContent = count > 0 ? \`Send \${count} Torrent\${count > 1 ? 's' : ''}\` : 'No Torrents Found';
        } catch (error) {
          console.error('Error getting torrent count:', error);
          document.getElementById('torrent-count').textContent = '0';
        }
      }

      async function loadCategories() {
        try {
          const response = await chrome.runtime.sendMessage({ action: 'GET_SERVER_INFO' });
          
          if (response.success && response.info.categories) {
            const categorySelect = document.getElementById('category-select');
            
            categorySelect.innerHTML = '<option value="">Default</option>';
            
            Object.keys(response.info.categories).forEach(category => {
              const option = document.createElement('option');
              option.value = category;
              option.textContent = category;
              categorySelect.appendChild(option);
            });
          }
        } catch (error) {
          console.error('Error loading categories:', error);
        }
      }

      function getCurrentOptions() {
        return {
          category: document.getElementById('category-select').value,
          savePath: document.getElementById('save-path-input').value,
          paused: document.getElementById('paused-checkbox').checked
        };
      }

      async function saveCurrentOptions() {
        const options = getCurrentOptions();
        
        try {
          const result = await chrome.storage.sync.get(['options']);
          const currentOptions = result.options || {};
          
          await chrome.storage.sync.set({
            options: { ...currentOptions, ...options }
          });
        } catch (error) {
          console.error('Error saving options:', error);
          showNotification('error', 'Failed to save settings');
        }
      }

      function showNotification(type, message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = \`notification \${type}\`;
        
        setTimeout(() => {
          notification.classList.remove('hidden');
        }, 100);
        
        setTimeout(() => {
          notification.classList.add('hidden');
        }, 3100);
      }

      // Export functions for testing
      global.popupFunctions = {
        loadSettings,
        checkConnectionStatus,
        updateTorrentCount,
        loadCategories,
        getCurrentOptions,
        saveCurrentOptions,
        showNotification
      };
    `);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset element states
    Object.values(mockElements).forEach(element => {
      if (element.value !== undefined) element.value = '';
      if (element.checked !== undefined) element.checked = false;
      if (element.textContent !== undefined) element.textContent = '';
      if (element.className !== undefined) element.className = '';
      if (element.disabled !== undefined) element.disabled = false;
      if (element.innerHTML !== undefined) element.innerHTML = '';
    });
  });

  describe('loadSettings', () => {
    it('should load settings from storage and populate form fields', async () => {
      const mockOptions = {
        savePath: '/downloads/torrents',
        paused: true,
        category: 'Movies'
      };

      mockChrome.storage.sync.get.mockResolvedValue({ options: mockOptions });

      await global.popupFunctions.loadSettings();

      expect(mockChrome.storage.sync.get).toHaveBeenCalledWith(['options']);
      expect(mockElements.savePathInput.value).toBe('/downloads/torrents');
      expect(mockElements.pausedCheckbox.checked).toBe(true);
    });

    it('should handle missing options gracefully', async () => {
      mockChrome.storage.sync.get.mockResolvedValue({});

      await global.popupFunctions.loadSettings();

      expect(mockElements.savePathInput.value).toBe('');
      expect(mockElements.pausedCheckbox.checked).toBe(false);
    });

    it('should handle storage errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockChrome.storage.sync.get.mockRejectedValue(new Error('Storage error'));

      await global.popupFunctions.loadSettings();

      expect(consoleSpy).toHaveBeenCalledWith('Error loading settings:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('checkConnectionStatus', () => {
    it('should show connected status on successful connection', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        connected: { connected: true, version: 'v4.4.0' }
      });

      await global.popupFunctions.checkConnectionStatus();

      expect(mockElements.connectionStatus.textContent).toBe('Connected');
      expect(mockElements.connectionStatus.className).toBe('status-value connected');
    });

    it('should show disconnected status on failed connection', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: false,
        connected: { connected: false, error: 'Connection refused' }
      });

      await global.popupFunctions.checkConnectionStatus();

      expect(mockElements.connectionStatus.textContent).toBe('Disconnected');
      expect(mockElements.connectionStatus.className).toBe('status-value disconnected');
    });

    it('should show error status on exception', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error('Network error'));

      await global.popupFunctions.checkConnectionStatus();

      expect(mockElements.connectionStatus.textContent).toBe('Error');
      expect(mockElements.connectionStatus.className).toBe('status-value disconnected');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should show checking status initially', async () => {
      // Don't resolve the promise to test intermediate state
      mockChrome.runtime.sendMessage.mockImplementation(() => new Promise(() => {}));

      global.popupFunctions.checkConnectionStatus();

      expect(mockElements.connectionStatus.textContent).toBe('Checking...');
      expect(mockElements.connectionStatus.className).toBe('status-value checking');
    });
  });

  describe('updateTorrentCount', () => {
    it('should update torrent count and enable send button', async () => {
      const mockTorrents = [
        'magnet:?xt=urn:btih:abc123',
        'magnet:?xt=urn:btih:def456',
        'http://example.com/test.torrent'
      ];

      mockChrome.tabs.query.mockResolvedValue([{ id: 1 }]);
      mockChrome.tabs.sendMessage.mockResolvedValue({ torrents: mockTorrents });

      await global.popupFunctions.updateTorrentCount();

      expect(mockElements.torrentCount.textContent).toBe('3');
      expect(mockElements.sendAllBtn.disabled).toBe(false);
      expect(mockElements.sendAllBtn.textContent).toBe('Send 3 Torrents');
    });

    it('should handle single torrent correctly', async () => {
      const mockTorrents = ['magnet:?xt=urn:btih:abc123'];

      mockChrome.tabs.query.mockResolvedValue([{ id: 1 }]);
      mockChrome.tabs.sendMessage.mockResolvedValue({ torrents: mockTorrents });

      await global.popupFunctions.updateTorrentCount();

      expect(mockElements.sendAllBtn.textContent).toBe('Send 1 Torrent');
    });

    it('should disable send button when no torrents found', async () => {
      mockChrome.tabs.query.mockResolvedValue([{ id: 1 }]);
      mockChrome.tabs.sendMessage.mockResolvedValue({ torrents: [] });

      await global.popupFunctions.updateTorrentCount();

      expect(mockElements.torrentCount.textContent).toBe('0');
      expect(mockElements.sendAllBtn.disabled).toBe(true);
      expect(mockElements.sendAllBtn.textContent).toBe('No Torrents Found');
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockChrome.tabs.query.mockRejectedValue(new Error('Tab error'));

      await global.popupFunctions.updateTorrentCount();

      expect(mockElements.torrentCount.textContent).toBe('0');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('loadCategories', () => {
    it('should load categories from server and populate select', async () => {
      const mockServerInfo = {
        categories: {
          'Movies': { savePath: '/movies' },
          'TV Shows': { savePath: '/tv' },
          'Games': { savePath: '/games' }
        }
      };

      const mockOption1 = { value: '', textContent: '' };
      const mockOption2 = { value: '', textContent: '' };
      const mockOption3 = { value: '', textContent: '' };
      const mockOption4 = { value: '', textContent: '' };

      mockDocument.createElement.mockReturnValueOnce(mockOption1)
        .mockReturnValueOnce(mockOption2)
        .mockReturnValueOnce(mockOption3)
        .mockReturnValueOnce(mockOption4);

      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        info: mockServerInfo
      });

      await global.popupFunctions.loadCategories();

      expect(mockElements.categorySelect.innerHTML).toBe('<option value="">Default</option>');
      expect(mockDocument.createElement).toHaveBeenCalledTimes(3);
      expect(mockElements.categorySelect.appendChild).toHaveBeenCalledTimes(3);
    });

    it('should handle server error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error('Server error'));

      await global.popupFunctions.loadCategories();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle response without categories', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        info: {}
      });

      await global.popupFunctions.loadCategories();

      expect(mockDocument.createElement).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentOptions', () => {
    it('should return current form values', () => {
      mockElements.categorySelect.value = 'Movies';
      mockElements.savePathInput.value = '/downloads';
      mockElements.pausedCheckbox.checked = true;

      const options = global.popupFunctions.getCurrentOptions();

      expect(options).toEqual({
        category: 'Movies',
        savePath: '/downloads',
        paused: true
      });
    });

    it('should return empty values when form is empty', () => {
      const options = global.popupFunctions.getCurrentOptions();

      expect(options).toEqual({
        category: '',
        savePath: '',
        paused: false
      });
    });
  });

  describe('saveCurrentOptions', () => {
    it('should save options to storage', async () => {
      const existingOptions = { autoDownload: true };
      const newOptions = {
        category: 'Movies',
        savePath: '/downloads',
        paused: true
      };

      mockElements.categorySelect.value = newOptions.category;
      mockElements.savePathInput.value = newOptions.savePath;
      mockElements.pausedCheckbox.checked = newOptions.paused;

      mockChrome.storage.sync.get.mockResolvedValue({ options: existingOptions });
      mockChrome.storage.sync.set.mockResolvedValue();

      await global.popupFunctions.saveCurrentOptions();

      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        options: { ...existingOptions, ...newOptions }
      });
    });

    it('should handle storage errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockChrome.storage.sync.get.mockRejectedValue(new Error('Storage error'));

      await global.popupFunctions.saveCurrentOptions();

      expect(consoleSpy).toHaveBeenCalledWith('Error saving options:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('showNotification', () => {
    it('should display notification with correct content and style', () => {
      global.popupFunctions.showNotification('success', 'Settings saved');

      expect(mockElements.notification.textContent).toBe('Settings saved');
      expect(mockElements.notification.className).toBe('notification success');
      expect(global.setTimeout).toHaveBeenCalledTimes(2);
    });

    it('should handle error notifications', () => {
      global.popupFunctions.showNotification('error', 'Connection failed');

      expect(mockElements.notification.textContent).toBe('Connection failed');
      expect(mockElements.notification.className).toBe('notification error');
    });

    it('should handle info notifications', () => {
      global.popupFunctions.showNotification('info', 'Page rescanned');

      expect(mockElements.notification.textContent).toBe('Page rescanned');
      expect(mockElements.notification.className).toBe('notification info');
    });

    it('should call setTimeout for show and hide timing', () => {
      global.popupFunctions.showNotification('success', 'Test message');

      expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 100);
      expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 3100);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle full popup initialization workflow', async () => {
      // Mock all required API responses
      mockChrome.storage.sync.get.mockResolvedValue({
        options: { savePath: '/torrents', paused: false }
      });
      
      mockChrome.runtime.sendMessage.mockImplementation((message) => {
        if (message.action === 'TEST_CONNECTION') {
          return Promise.resolve({
            success: true,
            connected: { connected: true, version: 'v4.4.0' }
          });
        } else if (message.action === 'GET_SERVER_INFO') {
          return Promise.resolve({
            success: true,
            info: { categories: { Movies: {}, TV: {} } }
          });
        }
        return Promise.resolve({ success: false });
      });

      mockChrome.tabs.query.mockResolvedValue([{ id: 1 }]);
      mockChrome.tabs.sendMessage.mockResolvedValue({
        torrents: ['magnet:?xt=urn:btih:abc123', 'magnet:?xt=urn:btih:def456']
      });

      // Execute initialization sequence
      await global.popupFunctions.loadSettings();
      await global.popupFunctions.checkConnectionStatus();
      await global.popupFunctions.updateTorrentCount();
      await global.popupFunctions.loadCategories();

      // Verify all components initialized correctly
      expect(mockElements.savePathInput.value).toBe('/torrents');
      expect(mockElements.connectionStatus.textContent).toBe('Connected');
      expect(mockElements.torrentCount.textContent).toBe('2');
      expect(mockElements.sendAllBtn.disabled).toBe(false);
    });

    it('should handle offline scenario gracefully', async () => {
      mockChrome.storage.sync.get.mockResolvedValue({ options: {} });
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error('Network error'));
      mockChrome.tabs.query.mockRejectedValue(new Error('Tab access error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await global.popupFunctions.loadSettings();
      await global.popupFunctions.checkConnectionStatus();
      await global.popupFunctions.updateTorrentCount();
      await global.popupFunctions.loadCategories();

      expect(mockElements.connectionStatus.textContent).toBe('Error');
      expect(mockElements.torrentCount.textContent).toBe('0');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});