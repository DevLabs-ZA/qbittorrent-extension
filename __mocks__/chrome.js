/**
 * Chrome Extension API Mock
 * Comprehensive mock for Chrome extension APIs used in qBittorrent extension
 */

const sinon = require('sinon');

// Create mock chrome object
const chrome = {
  // Runtime API
  runtime: {
    sendMessage: sinon.stub(),
    onMessage: {
      addListener: sinon.stub(),
      removeListener: sinon.stub(),
      hasListener: sinon.stub().returns(false)
    },
    onInstalled: {
      addListener: sinon.stub()
    },
    openOptionsPage: sinon.stub(),
    getURL: sinon.stub().callsFake((path) => `chrome-extension://test-extension-id/${path}`),
    id: 'test-extension-id',
    lastError: null
  },

  // Storage API
  storage: {
    sync: {
      get: sinon.stub().resolves({}),
      set: sinon.stub().resolves(),
      remove: sinon.stub().resolves(),
      clear: sinon.stub().resolves(),
      getBytesInUse: sinon.stub().resolves(0)
    },
    local: {
      get: sinon.stub().resolves({}),
      set: sinon.stub().resolves(),
      remove: sinon.stub().resolves(),
      clear: sinon.stub().resolves(),
      getBytesInUse: sinon.stub().resolves(0)
    },
    onChanged: {
      addListener: sinon.stub(),
      removeListener: sinon.stub()
    }
  },

  // Tabs API
  tabs: {
    query: sinon.stub().resolves([]),
    sendMessage: sinon.stub().resolves(),
    create: sinon.stub().resolves({}),
    update: sinon.stub().resolves({}),
    remove: sinon.stub().resolves(),
    onUpdated: {
      addListener: sinon.stub(),
      removeListener: sinon.stub()
    },
    onActivated: {
      addListener: sinon.stub(),
      removeListener: sinon.stub()
    }
  },

  // Context Menus API
  contextMenus: {
    create: sinon.stub().returns('menu-id'),
    update: sinon.stub().resolves(),
    remove: sinon.stub().resolves(),
    removeAll: sinon.stub().resolves(),
    onClicked: {
      addListener: sinon.stub(),
      removeListener: sinon.stub()
    }
  },

  // Commands API
  commands: {
    onCommand: {
      addListener: sinon.stub(),
      removeListener: sinon.stub()
    },
    getAll: sinon.stub().resolves([])
  },

  // Notifications API
  notifications: {
    create: sinon.stub().resolves('notification-id'),
    update: sinon.stub().resolves(true),
    clear: sinon.stub().resolves(true),
    getAll: sinon.stub().resolves({}),
    onClicked: {
      addListener: sinon.stub(),
      removeListener: sinon.stub()
    },
    onClosed: {
      addListener: sinon.stub(),
      removeListener: sinon.stub()
    }
  },

  // Web Request API
  webRequest: {
    onBeforeRequest: {
      addListener: sinon.stub(),
      removeListener: sinon.stub(),
      hasListener: sinon.stub().returns(false)
    },
    onHeadersReceived: {
      addListener: sinon.stub(),
      removeListener: sinon.stub()
    }
  },

  // Action API (Manifest V3)
  action: {
    setBadgeText: sinon.stub().resolves(),
    setBadgeBackgroundColor: sinon.stub().resolves(),
    setTitle: sinon.stub().resolves(),
    setIcon: sinon.stub().resolves(),
    onClicked: {
      addListener: sinon.stub(),
      removeListener: sinon.stub()
    }
  },

  // Extension API
  extension: {
    getURL: sinon.stub().callsFake((path) => `chrome-extension://test-extension-id/${path}`)
  }
};

// Helper functions for testing
chrome._helpers = {
  /**
   * Reset all mocks to their initial state
   */
  reset() {
    Object.values(chrome).forEach(api => {
      if (typeof api === 'object' && api !== chrome._helpers) {
        Object.values(api).forEach(method => {
          if (method && typeof method.reset === 'function') {
            method.reset();
          } else if (method && typeof method === 'object') {
            Object.values(method).forEach(subMethod => {
              if (subMethod && typeof subMethod.reset === 'function') {
                subMethod.reset();
              }
            });
          }
        });
      }
    });
  },

  /**
   * Simulate storage data
   */
  setStorageData(storageType, data) {
    chrome.storage[storageType].get.resolves(data);
  },

  /**
   * Simulate tab data
   */
  setActiveTab(tab) {
    chrome.tabs.query.resolves([tab]);
  },

  /**
   * Simulate runtime message response
   */
  setMessageResponse(response) {
    chrome.runtime.sendMessage.resolves(response);
  },

  /**
   * Trigger runtime message listener
   */
  triggerMessage(message, sender = {}) {
    const listeners = chrome.runtime.onMessage.addListener.getCalls();
    listeners.forEach(call => {
      const callback = call.args[0];
      if (typeof callback === 'function') {
        callback(message, sender, sinon.stub());
      }
    });
  },

  /**
   * Trigger context menu click
   */
  triggerContextMenuClick(info, tab) {
    const listeners = chrome.contextMenus.onClicked.addListener.getCalls();
    listeners.forEach(call => {
      const callback = call.args[0];
      if (typeof callback === 'function') {
        callback(info, tab);
      }
    });
  },

  /**
   * Trigger command
   */
  triggerCommand(command) {
    const listeners = chrome.commands.onCommand.addListener.getCalls();
    listeners.forEach(call => {
      const callback = call.args[0];
      if (typeof callback === 'function') {
        callback(command);
      }
    });
  }
};

module.exports = chrome;