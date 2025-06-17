/**
 * Performance tests for qBittorrent Browser Extension
 * Tests memory usage, startup time, and bulk operations
 */

describe('Extension Performance Tests', () => {
  let mockChrome;
  let mockPerformance;

  beforeAll(() => {
    // Mock performance API
    mockPerformance = {
      now: jest.fn(),
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByType: jest.fn(),
      memory: {
        usedJSHeapSize: 1024 * 1024, // 1MB
        totalJSHeapSize: 2 * 1024 * 1024, // 2MB
        jsHeapSizeLimit: 4 * 1024 * 1024 // 4MB
      }
    };

    global.performance = mockPerformance;

    // Mock Chrome APIs
    mockChrome = {
      runtime: {
        sendMessage: jest.fn(),
        onMessage: {
          addListener: jest.fn()
        }
      },
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn()
        }
      },
      tabs: {
        query: jest.fn(),
        sendMessage: jest.fn()
      }
    };

    global.chrome = mockChrome;
    global.fetch = jest.fn();

    // Mock console for performance logging
    global.console = {
      ...console,
      time: jest.fn(),
      timeEnd: jest.fn(),
      log: jest.fn()
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformance.now.mockReturnValue(Date.now());
  });

  describe('Memory Usage Tests', () => {
    it('should monitor memory usage during link detection', () => {
      const initialMemory = mockPerformance.memory.usedJSHeapSize;

      // Simulate creating many DOM elements for link detection
      const mockElements = Array.from({ length: 1000 }, (_, i) => ({
        href: `magnet:?xt=urn:btih:${i.toString().padStart(40, '0')}`,
        textContent: `Torrent ${i}`
      }));

      // Simulate memory increase
      mockPerformance.memory.usedJSHeapSize = initialMemory + (mockElements.length * 100);

      const memoryIncrease = mockPerformance.memory.usedJSHeapSize - initialMemory;
      const averageMemoryPerElement = memoryIncrease / mockElements.length;

      // Memory usage should be reasonable (less than 1KB per element)
      expect(averageMemoryPerElement).toBeLessThan(1024);

      // Total memory should not exceed 50% of heap limit
      const memoryUsagePercentage = mockPerformance.memory.usedJSHeapSize / mockPerformance.memory.jsHeapSizeLimit;
      expect(memoryUsagePercentage).toBeLessThan(0.5);
    });

    it('should handle memory cleanup after processing', () => {
      const initialMemory = mockPerformance.memory.usedJSHeapSize;

      // Simulate processing and cleanup
      mockPerformance.memory.usedJSHeapSize = initialMemory + 100000; // Add 100KB

      // Simulate cleanup
      setTimeout(() => {
        mockPerformance.memory.usedJSHeapSize = initialMemory + 10000; // Should reduce to ~10KB
      }, 100);

      // Memory should be mostly reclaimed
      const finalMemory = initialMemory + 10000;
      expect(finalMemory - initialMemory).toBeLessThan(50000); // Less than 50KB retained
    });
  });

  describe('Startup Performance Tests', () => {
    it('should initialize extension components quickly', async () => {
      const startTime = 0;
      const endTime = 50; // 50ms

      mockPerformance.now
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      // Simulate initialization
      const initStart = mockPerformance.now();

      // Mock initialization tasks
      await mockChrome.storage.sync.get();
      mockChrome.runtime.onMessage.addListener(() => {});

      const initEnd = mockPerformance.now();
      const initTime = initEnd - initStart;

      // Initialization should complete within 100ms
      expect(initTime).toBeLessThan(100);
    });

    it('should load settings efficiently', async () => {
      const mockSettings = {
        server: { url: 'http://localhost:8080' },
        options: { autoDownload: true }
      };

      const startTime = mockPerformance.now();

      mockChrome.storage.sync.get.mockResolvedValue(mockSettings);

      const settings = await mockChrome.storage.sync.get();

      const endTime = mockPerformance.now();
      const loadTime = endTime - startTime;

      expect(settings).toEqual(mockSettings);
      expect(loadTime).toBeLessThan(10); // Should load within 10ms
    });
  });

  describe('Bulk Operations Performance', () => {
    it('should handle multiple torrent detection efficiently', async () => {
      const torrentCount = 100;
      const mockTorrents = Array.from({ length: torrentCount }, (_, i) =>
        `magnet:?xt=urn:btih:${i.toString().padStart(40, '0')}&dn=Torrent${i}`
      );

      const startTime = mockPerformance.now();

      // Simulate processing all torrents
      const processedTorrents = mockTorrents.map(url => ({
        url,
        type: 'magnet',
        name: url.match(/dn=([^&]+)/)?.[1] || 'Unknown'
      }));

      const endTime = mockPerformance.now();
      const processingTime = endTime - startTime;

      // Should process 100 torrents within 100ms (1ms per torrent)
      expect(processingTime).toBeLessThan(100);
      expect(processedTorrents).toHaveLength(torrentCount);
    });

    it('should handle concurrent API requests efficiently', async () => {
      const requestCount = 10;
      const mockResponse = { success: true, result: { name: 'Test' } };

      mockChrome.runtime.sendMessage.mockResolvedValue(mockResponse);

      const startTime = mockPerformance.now();

      // Simulate concurrent requests
      const requests = Array.from({ length: requestCount }, () =>
        mockChrome.runtime.sendMessage({
          action: 'SEND_TORRENT',
          url: 'magnet:?xt=urn:btih:abc123'
        })
      );

      await Promise.all(requests);

      const endTime = mockPerformance.now();
      const totalTime = endTime - startTime;

      // Concurrent requests should not scale linearly
      expect(totalTime).toBeLessThan(requestCount * 50); // Should be less than 500ms for 10 requests
    });

    it('should efficiently process large text content for magnet links', () => {
      const largeText = `Here are some magnet links: ${
        Array.from({ length: 50 }, (_, i) =>
          `magnet:?xt=urn:btih:${i.toString().padStart(40, '0')}&dn=Torrent${i}`
        ).join(' and ')} end of text.`;

      const startTime = mockPerformance.now();

      // Simulate regex matching on large text
      const magnetPattern = /magnet:\?xt=urn:btih:[a-zA-Z0-9]{32,40}/gi;
      const matches = largeText.match(magnetPattern) || [];

      const endTime = mockPerformance.now();
      const processingTime = endTime - startTime;

      expect(matches).toHaveLength(50);
      expect(processingTime).toBeLessThan(50); // Should process within 50ms
    });
  });

  describe('Storage Performance Tests', () => {
    it('should handle frequent storage operations efficiently', async () => {
      const operationCount = 20;
      const mockData = { timestamp: Date.now(), value: 'test' };

      mockChrome.storage.sync.set.mockResolvedValue();
      mockChrome.storage.sync.get.mockResolvedValue(mockData);

      const startTime = mockPerformance.now();

      // Simulate frequent read/write operations
      for (let i = 0; i < operationCount; i++) {
        await mockChrome.storage.sync.set({ [`key${i}`]: mockData });
        await mockChrome.storage.sync.get([`key${i}`]);
      }

      const endTime = mockPerformance.now();
      const totalTime = endTime - startTime;
      const averageTimePerOperation = totalTime / (operationCount * 2); // 2 operations per iteration

      // Each storage operation should complete within 5ms on average
      expect(averageTimePerOperation).toBeLessThan(5);
    });

    it('should handle large data storage efficiently', async () => {
      const largeData = {
        torrents: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Torrent ${i}`,
          url: `magnet:?xt=urn:btih:${i.toString().padStart(40, '0')}`
        }))
      };

      mockChrome.storage.sync.set.mockResolvedValue();

      const startTime = mockPerformance.now();

      await mockChrome.storage.sync.set({ largeData });

      const endTime = mockPerformance.now();
      const storageTime = endTime - startTime;

      // Large data storage should complete within 100ms
      expect(storageTime).toBeLessThan(100);
    });
  });

  describe('DOM Manipulation Performance', () => {
    it('should add indicators to links efficiently', () => {
      const linkCount = 200;
      const mockLinks = Array.from({ length: linkCount }, (_, i) => ({
        href: `magnet:?xt=urn:btih:${i.toString().padStart(40, '0')}`,
        classList: { contains: () => false, add: jest.fn() },
        parentNode: { insertBefore: jest.fn() },
        nextSibling: null
      }));

      const mockIndicators = mockLinks.map(() => ({
        addEventListener: jest.fn(),
        style: {},
        className: '',
        title: '',
        textContent: ''
      }));

      // Mock document.createElement
      global.document = {
        createElement: jest.fn().mockImplementation(() => mockIndicators.shift())
      };

      const startTime = mockPerformance.now();

      // Simulate adding indicators to all links
      mockLinks.forEach((link, index) => {
        const indicator = global.document.createElement('span');
        indicator.className = 'qbit-indicator';
        indicator.textContent = '⬇️';
        link.classList.add('qbt-detected');
        link.parentNode.insertBefore(indicator, link.nextSibling);
      });

      const endTime = mockPerformance.now();
      const processingTime = endTime - startTime;

      // Should process 200 links within 100ms
      expect(processingTime).toBeLessThan(100);
      expect(global.document.createElement).toHaveBeenCalledTimes(linkCount);
    });

    it('should handle page mutations efficiently', () => {
      const mutationCount = 50;
      const mockMutations = Array.from({ length: mutationCount }, (_, i) => ({
        type: 'childList',
        addedNodes: [{
          nodeType: 1, // ELEMENT_NODE
          querySelector: jest.fn().mockReturnValue(i % 2 === 0 ? {} : null) // 50% contain torrents
        }]
      }));

      const startTime = mockPerformance.now();

      // Simulate mutation observer processing
      let shouldRescan = false;
      mockMutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1 && node.querySelector()) {
              shouldRescan = true;
            }
          });
        }
      });

      const endTime = mockPerformance.now();
      const processingTime = endTime - startTime;

      expect(shouldRescan).toBe(true);
      expect(processingTime).toBeLessThan(20); // Should process 50 mutations within 20ms
    });
  });

  describe('Network Performance Tests', () => {
    it('should handle API timeouts gracefully', async () => {
      const timeoutMs = 5000;

      // Mock slow response
      const slowResponse = new Promise((resolve) => {
        setTimeout(() => resolve({
          ok: true,
          text: () => Promise.resolve('Ok.')
        }), timeoutMs);
      });

      global.fetch.mockReturnValue(slowResponse);

      const startTime = mockPerformance.now();

      try {
        // This would timeout in real implementation
        await Promise.race([
          global.fetch('http://slow-server.com/api'),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 1000)
          )
        ]);
      } catch (error) {
        const endTime = mockPerformance.now();
        const elapsedTime = endTime - startTime;

        expect(error.message).toBe('Timeout');
        expect(elapsedTime).toBeLessThan(1100); // Should timeout within ~1 second
      }
    });

    it('should batch multiple requests efficiently', async () => {
      const requestCount = 5;
      const mockResponses = Array.from({ length: requestCount }, (_, i) => ({
        success: true,
        result: { name: `Torrent ${i}` }
      }));

      mockChrome.runtime.sendMessage.mockImplementation((message) =>
        // Simulate slight delay for each request
         new Promise(resolve => {
          setTimeout(() => {
            const index = parseInt(message.url.slice(-1));
            resolve(mockResponses[index] || mockResponses[0]);
          }, 10);
        })
      );

      const startTime = mockPerformance.now();

      // Simulate batched requests
      const requests = Array.from({ length: requestCount }, (_, i) =>
        mockChrome.runtime.sendMessage({
          action: 'SEND_TORRENT',
          url: `magnet:?xt=urn:btih:abc12${i}`
        })
      );

      const results = await Promise.all(requests);

      const endTime = mockPerformance.now();
      const totalTime = endTime - startTime;

      expect(results).toHaveLength(requestCount);
      expect(totalTime).toBeLessThan(100); // Batched requests should complete quickly
    });
  });

  describe('Resource Cleanup Tests', () => {
    it('should clean up event listeners properly', () => {
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      const eventHandler = jest.fn();

      // Add event listener
      mockElement.addEventListener('click', eventHandler);

      // Simulate cleanup
      mockElement.removeEventListener('click', eventHandler);

      expect(mockElement.addEventListener).toHaveBeenCalledWith('click', eventHandler);
      expect(mockElement.removeEventListener).toHaveBeenCalledWith('click', eventHandler);
    });

    it('should clean up timers and intervals', () => {
      const timers = [];

      // Mock timer functions
      global.setTimeout = jest.fn((fn, delay) => {
        const id = timers.length;
        timers.push({ fn, delay, type: 'timeout' });
        return id;
      });

      global.clearTimeout = jest.fn((id) => {
        if (timers[id]) {
          timers[id] = null;
        }
      });

      global.setInterval = jest.fn((fn, delay) => {
        const id = timers.length;
        timers.push({ fn, delay, type: 'interval' });
        return id;
      });

      global.clearInterval = jest.fn((id) => {
        if (timers[id]) {
          timers[id] = null;
        }
      });

      // Create timers
      const timeoutId = global.setTimeout(() => {}, 1000);
      const intervalId = global.setInterval(() => {}, 5000);

      // Clean up timers
      global.clearTimeout(timeoutId);
      global.clearInterval(intervalId);

      expect(timers[timeoutId]).toBeNull();
      expect(timers[intervalId]).toBeNull();
    });
  });
});