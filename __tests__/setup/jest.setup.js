/**
 * Jest setup file for qBittorrent Browser Extension testing
 * Configures Chrome extension API mocks and global test environment
 */

const sinon = require('sinon');
require('jest-webextension-mock');
require('whatwg-fetch');
require('fake-indexeddb/auto');

// Mock Chrome Extension APIs
global.chrome = {
  runtime: {
    sendMessage: sinon.stub(),
    onMessage: {
      addListener: sinon.stub(),
      removeListener: sinon.stub(),
      hasListener: sinon.stub()
    },
    onInstalled: {
      addListener: sinon.stub()
    },
    openOptionsPage: sinon.stub(),
    getURL: sinon.stub().callsFake((path) => `chrome-extension://test-id/${path}`)
  },
  
  storage: {
    sync: {
      get: sinon.stub(),
      set: sinon.stub(),
      remove: sinon.stub(),
      clear: sinon.stub()
    },
    local: {
      get: sinon.stub(),
      set: sinon.stub(),
      remove: sinon.stub(),
      clear: sinon.stub()
    }
  },
  
  tabs: {
    query: sinon.stub(),
    sendMessage: sinon.stub(),
    create: sinon.stub(),
    update: sinon.stub()
  },
  
  contextMenus: {
    create: sinon.stub(),
    update: sinon.stub(),
    remove: sinon.stub(),
    onClicked: {
      addListener: sinon.stub()
    }
  },
  
  commands: {
    onCommand: {
      addListener: sinon.stub()
    }
  },
  
  notifications: {
    create: sinon.stub(),
    clear: sinon.stub(),
    onClicked: {
      addListener: sinon.stub()
    }
  },
  
  webRequest: {
    onBeforeRequest: {
      addListener: sinon.stub(),
      removeListener: sinon.stub()
    }
  }
};

// Mock browser namespace (WebExtensions standard)
global.browser = global.chrome;

// Mock Web Crypto API for crypto tests
global.crypto = {
  subtle: {
    generateKey: sinon.stub(),
    exportKey: sinon.stub(),
    importKey: sinon.stub(),
    encrypt: sinon.stub(),
    decrypt: sinon.stub(),
    deriveKey: sinon.stub(),
    deriveBits: sinon.stub()
  },
  getRandomValues: sinon.stub().callsFake((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  })
};

// Mock TextEncoder/TextDecoder
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Mock Blob and URL APIs
global.Blob = class MockBlob {
  constructor(parts, options) {
    this.parts = parts;
    this.type = options?.type || '';
    this.size = parts?.reduce((size, part) => size + part.length, 0) || 0;
  }
  
  text() {
    return Promise.resolve(this.parts.join(''));
  }
  
  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(this.size));
  }
};

global.URL = {
  createObjectURL: sinon.stub().returns('blob:test-url'),
  revokeObjectURL: sinon.stub()
};

// Mock FormData
global.FormData = class MockFormData {
  constructor() {
    this.data = new Map();
  }
  
  append(key, value, filename) {
    if (!this.data.has(key)) {
      this.data.set(key, []);
    }
    this.data.get(key).push({ value, filename });
  }
  
  get(key) {
    const values = this.data.get(key);
    return values ? values[0].value : null;
  }
  
  getAll(key) {
    const values = this.data.get(key);
    return values ? values.map(v => v.value) : [];
  }
  
  has(key) {
    return this.data.has(key);
  }
  
  delete(key) {
    this.data.delete(key);
  }
};

// Mock fetch for API testing
global.fetch = sinon.stub();

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub(),
  info: sinon.stub(),
  debug: sinon.stub()
};

// Mock setTimeout/setInterval for timer tests
global.setTimeout = sinon.stub().callsFake((fn, delay) => {
  return originalConsole.setTimeout ? originalConsole.setTimeout(fn, delay) : setTimeout(fn, delay);
});

global.setInterval = sinon.stub().callsFake((fn, delay) => {
  return originalConsole.setInterval ? originalConsole.setInterval(fn, delay) : setInterval(fn, delay);
});

// Mock DOM APIs for content script tests
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://example.com',
    hostname: 'example.com',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true
});

// Mock MutationObserver
global.MutationObserver = class MockMutationObserver {
  constructor(callback) {
    this.callback = callback;
    this.observations = [];
  }
  
  observe(target, options) {
    this.observations.push({ target, options });
  }
  
  disconnect() {
    this.observations = [];
  }
  
  takeRecords() {
    return [];
  }
};

// Mock TreeWalker for link detection tests
global.document.createTreeWalker = sinon.stub().returns({
  nextNode: sinon.stub().returns(null)
});

// Custom matchers for extension testing
expect.extend({
  /**
   * Matcher to check if Chrome API was called with specific arguments
   */
  toHaveBeenCalledWithChromeAPI(received, apiPath, expectedArgs) {
    const parts = apiPath.split('.');
    let api = global.chrome;
    
    for (const part of parts) {
      if (!api[part]) {
        return {
          message: () => `Chrome API ${apiPath} does not exist`,
          pass: false
        };
      }
      api = api[part];
    }
    
    const pass = api.calledWith ? api.calledWith(...expectedArgs) : false;
    
    return {
      message: () => pass 
        ? `Expected ${apiPath} not to be called with ${JSON.stringify(expectedArgs)}`
        : `Expected ${apiPath} to be called with ${JSON.stringify(expectedArgs)}`,
      pass
    };
  },
  
  /**
   * Matcher to check if storage was set with specific data
   */
  toHaveStoredData(received, storageType, expectedData) {
    const storage = global.chrome.storage[storageType];
    const pass = storage.set.calledWith(expectedData);
    
    return {
      message: () => pass 
        ? `Expected ${storageType} storage not to be set with ${JSON.stringify(expectedData)}`
        : `Expected ${storageType} storage to be set with ${JSON.stringify(expectedData)}`,
      pass
    };
  }
});

// Test utilities
global.testUtils = {
  /**
   * Reset all Chrome API mocks
   */
  resetChromeMocks() {
    Object.values(global.chrome).forEach(api => {
      if (typeof api === 'object') {
        Object.values(api).forEach(method => {
          if (method && method.reset) {
            method.reset();
          }
        });
      }
    });
  },
  
  /**
   * Create mock DOM element with specified attributes
   */
  createMockElement(tagName, attributes = {}) {
    const element = document.createElement(tagName);
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    return element;
  },
  
  /**
   * Wait for async operations in tests
   */
  async waitFor(condition, timeout = 1000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  }
};

// Setup and teardown hooks
beforeEach(() => {
  // Reset all mocks before each test
  sinon.restore();
  global.testUtils.resetChromeMocks();
  
  // Clear DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

afterEach(() => {
  // Clean up after each test
  sinon.restore();
});