/**
 * Test utilities and helper functions
 * Provides common functionality for testing browser extension components
 */

/**
 * Creates a mock DOM element with specified attributes and properties
 * @param {string} tagName - The HTML tag name
 * @param {Object} attributes - Element attributes to set
 * @param {Object} properties - Element properties to set
 * @returns {Object} Mock DOM element
 */
function createMockElement(tagName, attributes = {}, properties = {}) {
  const element = {
    tagName: tagName.toUpperCase(),
    attributes: new Map(),
    style: {},
    classList: {
      contains: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
      toggle: jest.fn()
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    insertBefore: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(),
    getAttribute: jest.fn(),
    setAttribute: jest.fn(),
    removeAttribute: jest.fn(),
    hasAttribute: jest.fn(),
    ...properties
  };

  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    element.attributes.set(key, value);
    element[key] = value;
  });

  // Mock getAttribute/setAttribute
  element.getAttribute = jest.fn((name) => element.attributes.get(name));
  element.setAttribute = jest.fn((name, value) => {
    element.attributes.set(name, value);
    element[name] = value;
  });
  element.hasAttribute = jest.fn((name) => element.attributes.has(name));

  return element;
}

/**
 * Creates a mock Chrome storage object with tracking
 * @returns {Object} Mock Chrome storage with get/set tracking
 */
function createMockStorage() {
  const storage = new Map();
  const calls = { get: [], set: [], remove: [], clear: [] };

  return {
    data: storage,
    calls,
    get: jest.fn().mockImplementation((keys) => {
      calls.get.push(keys);
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: storage.get(keys) });
      } else if (Array.isArray(keys)) {
        const result = {};
        keys.forEach(key => {
          if (storage.has(key)) {
            result[key] = storage.get(key);
          }
        });
        return Promise.resolve(result);
      } else if (keys === null || keys === undefined) {
        return Promise.resolve(Object.fromEntries(storage));
      }
      return Promise.resolve({});
    }),
    set: jest.fn().mockImplementation((items) => {
      calls.set.push(items);
      Object.entries(items).forEach(([key, value]) => {
        storage.set(key, value);
      });
      return Promise.resolve();
    }),
    remove: jest.fn().mockImplementation((keys) => {
      calls.remove.push(keys);
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach(key => storage.delete(key));
      return Promise.resolve();
    }),
    clear: jest.fn().mockImplementation(() => {
      calls.clear.push(true);
      storage.clear();
      return Promise.resolve();
    })
  };
}

/**
 * Creates a mock Chrome tabs API
 * @returns {Object} Mock Chrome tabs API
 */
function createMockTabs() {
  const tabs = [
    { id: 1, url: 'https://example.com', active: true, windowId: 1 },
    { id: 2, url: 'https://torrents.example.com', active: false, windowId: 1 }
  ];

  return {
    data: tabs,
    query: jest.fn().mockImplementation((queryInfo) => {
      let filteredTabs = [...tabs];
      
      if (queryInfo.active !== undefined) {
        filteredTabs = filteredTabs.filter(tab => tab.active === queryInfo.active);
      }
      if (queryInfo.currentWindow !== undefined && queryInfo.currentWindow) {
        filteredTabs = filteredTabs.filter(tab => tab.windowId === 1);
      }
      
      return Promise.resolve(filteredTabs);
    }),
    sendMessage: jest.fn().mockResolvedValue({ success: true }),
    create: jest.fn().mockImplementation((createProperties) => {
      const newTab = {
        id: Math.max(...tabs.map(t => t.id)) + 1,
        url: createProperties.url,
        active: createProperties.active !== false,
        windowId: 1
      };
      tabs.push(newTab);
      return Promise.resolve(newTab);
    }),
    update: jest.fn().mockImplementation((tabId, updateProperties) => {
      const tab = tabs.find(t => t.id === tabId);
      if (tab) {
        Object.assign(tab, updateProperties);
        return Promise.resolve(tab);
      }
      return Promise.reject(new Error('Tab not found'));
    })
  };
}

/**
 * Creates a mock fetch response
 * @param {*} data - Response data
 * @param {number} status - HTTP status code
 * @param {Object} headers - Response headers
 * @returns {Object} Mock fetch response
 */
function createMockResponse(data, status = 200, headers = {}) {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {
      get: jest.fn().mockImplementation((header) => headers[header.toLowerCase()]),
      has: jest.fn().mockImplementation((header) => headers.hasOwnProperty(header.toLowerCase())),
      entries: jest.fn().mockReturnValue(Object.entries(headers)),
      forEach: jest.fn().mockImplementation((callback) => {
        Object.entries(headers).forEach(([key, value]) => callback(value, key));
      })
    },
    json: jest.fn().mockResolvedValue(typeof data === 'object' ? data : JSON.parse(data)),
    text: jest.fn().mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data)),
    blob: jest.fn().mockResolvedValue(new Blob([data])),
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
  };

  return response;
}

/**
 * Waits for a condition to be true with timeout
 * @param {Function} condition - Function that returns true when condition is met
 * @param {number} timeout - Maximum time to wait in milliseconds
 * @param {number} interval - Check interval in milliseconds
 * @returns {Promise<boolean>} Resolves to true if condition met, false if timeout
 */
async function waitForCondition(condition, timeout = 1000, interval = 10) {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  return false;
}

/**
 * Simulates user interaction with delay
 * @param {Function} interaction - The interaction function to execute
 * @param {number} delay - Delay in milliseconds to simulate human timing
 * @returns {Promise} Resolves after interaction and delay
 */
async function simulateUserInteraction(interaction, delay = 100) {
  await interaction();
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Creates a test torrent data set
 * @param {number} count - Number of torrents to create
 * @returns {Array} Array of test torrent objects
 */
function createTestTorrents(count = 5) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Test Torrent ${i + 1}`,
    magnetUrl: `magnet:?xt=urn:btih:${(i + 1).toString().padStart(40, '0')}&dn=Test%20Torrent%20${i + 1}`,
    torrentUrl: `https://example.com/torrents/test-torrent-${i + 1}.torrent`,
    size: (i + 1) * 1024 * 1024, // Size in bytes
    seeders: (i + 1) * 10,
    leechers: (i + 1) * 5,
    category: i % 2 === 0 ? 'Movies' : 'TV',
    tags: [`tag${i + 1}`, 'test']
  }));
}

/**
 * Validates test torrent objects
 * @param {Object} torrent - Torrent object to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateTestTorrent(torrent) {
  const errors = [];
  
  if (!torrent.name || typeof torrent.name !== 'string') {
    errors.push('Invalid or missing torrent name');
  }
  
  if (torrent.magnetUrl && !torrent.magnetUrl.startsWith('magnet:')) {
    errors.push('Invalid magnet URL format');
  }
  
  if (torrent.torrentUrl && !torrent.torrentUrl.includes('.torrent')) {
    errors.push('Invalid torrent URL format');
  }
  
  if (torrent.size && (typeof torrent.size !== 'number' || torrent.size < 0)) {
    errors.push('Invalid torrent size');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Creates performance measurement helpers
 * @returns {Object} Performance measurement utilities
 */
function createPerformanceHelpers() {
  const measurements = new Map();
  
  return {
    start: (label) => {
      measurements.set(label, { start: performance.now() });
    },
    end: (label) => {
      const measurement = measurements.get(label);
      if (measurement) {
        measurement.end = performance.now();
        measurement.duration = measurement.end - measurement.start;
        return measurement.duration;
      }
      return 0;
    },
    get: (label) => {
      const measurement = measurements.get(label);
      return measurement ? measurement.duration : 0;
    },
    clear: () => {
      measurements.clear();
    },
    getAll: () => {
      const results = {};
      measurements.forEach((value, key) => {
        results[key] = value.duration || 0;
      });
      return results;
    }
  };
}

/**
 * Creates a mock WebExtensions browser object
 * @returns {Object} Mock browser API object
 */
function createMockBrowser() {
  const storage = createMockStorage();
  const tabs = createMockTabs();
  
  return {
    runtime: {
      sendMessage: jest.fn(),
      onMessage: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
        hasListener: jest.fn()
      },
      onInstalled: {
        addListener: jest.fn()
      },
      getURL: jest.fn().mockImplementation((path) => `moz-extension://test-id/${path}`),
      id: 'test-extension-id'
    },
    storage: {
      sync: storage,
      local: createMockStorage()
    },
    tabs,
    contextMenus: {
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      onClicked: {
        addListener: jest.fn()
      }
    },
    notifications: {
      create: jest.fn(),
      clear: jest.fn(),
      onClicked: {
        addListener: jest.fn()
      }
    }
  };
}

/**
 * Test data generators
 */
const generators = {
  /**
   * Generates random magnet URL
   * @returns {string} Random magnet URL
   */
  magnetUrl: () => {
    const hash = Math.random().toString(36).substring(2, 42).padEnd(40, '0');
    const name = `Test Torrent ${Math.floor(Math.random() * 1000)}`;
    return `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(name)}`;
  },
  
  /**
   * Generates random torrent file URL
   * @returns {string} Random torrent file URL
   */
  torrentUrl: () => {
    const id = Math.floor(Math.random() * 10000);
    return `https://example.com/torrents/file-${id}.torrent`;
  },
  
  /**
   * Generates random server configuration
   * @returns {Object} Random server config
   */
  serverConfig: () => ({
    url: `http://localhost:${8080 + Math.floor(Math.random() * 1000)}`,
    username: `user${Math.floor(Math.random() * 100)}`,
    password: Math.random().toString(36).substring(2, 15),
    useHttps: Math.random() > 0.5,
    customPort: 8080 + Math.floor(Math.random() * 1000)
  })
};

// Export all utilities
module.exports = {
  createMockElement,
  createMockStorage,
  createMockTabs,
  createMockResponse,
  createMockBrowser,
  createTestTorrents,
  createPerformanceHelpers,
  waitForCondition,
  simulateUserInteraction,
  validateTestTorrent,
  generators
};

// Also make available globally for tests
if (typeof global !== 'undefined') {
  global.testHelpers = module.exports;
}