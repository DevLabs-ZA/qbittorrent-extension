/**
 * Unit tests for Torrent Link Detector
 * Tests link detection, DOM manipulation, and torrent name extraction
 */

describe('TorrentLinkDetector', () => {
  let TorrentLinkDetector;
  let detector;
  let mockDocument;
  let mockChrome;

  beforeAll(() => {
    // Mock DOM methods
    mockDocument = {
      createElement: jest.fn(),
      querySelectorAll: jest.fn(),
      createTreeWalker: jest.fn(),
      body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
      },
      head: {},
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };

    // Mock Chrome APIs
    mockChrome = {
      runtime: {
        sendMessage: jest.fn()
      }
    };

    global.document = mockDocument;
    global.chrome = mockChrome;
    global.NodeFilter = {
      SHOW_TEXT: 4
    };
    global.Node = {
      ELEMENT_NODE: 1,
      TEXT_NODE: 3
    };

    // Load the TorrentLinkDetector class
    eval(`
      class TorrentLinkDetector {
        constructor() {
          this.magnetPattern = /magnet:\\?xt=urn:btih:[a-zA-Z0-9]{32,40}/gi;
          this.torrentPattern = /\\.torrent(\\?[^"'\\s]*)?$/i;
          this.detectedLinks = new Set();
          this.linkElements = new WeakMap();
        }

        detectAllLinks() {
          const links = [];

          this.findMagnetLinks().forEach(link => links.push(link));
          this.findTorrentFileLinks().forEach(link => links.push(link));

          return links;
        }

        findMagnetLinks() {
          const magnetLinks = [];

          document.querySelectorAll('a[href^="magnet:"]').forEach(element => {
            const href = element.href;
            if (this.magnetPattern.test(href)) {
              magnetLinks.push({
                url: href,
                element: element,
                type: 'magnet',
                name: this.extractMagnetName(href) || element.textContent.trim()
              });
              this.linkElements.set(element, href);
            }
          });

          const textNodes = this.getTextNodes();
          textNodes.forEach(node => {
            const matches = node.textContent.match(this.magnetPattern);
            if (matches) {
              matches.forEach(match => {
                magnetLinks.push({
                  url: match,
                  element: node.parentElement,
                  type: 'magnet',
                  name: this.extractMagnetName(match)
                });
              });
            }
          });

          return magnetLinks;
        }

        findTorrentFileLinks() {
          const torrentLinks = [];

          document.querySelectorAll('a[href]').forEach(element => {
            const href = element.href;
            if (this.torrentPattern.test(href)) {
              torrentLinks.push({
                url: href,
                element: element,
                type: 'torrent',
                name: element.textContent.trim() || this.extractTorrentName(href)
              });

              this.linkElements.set(element, href);
            }
          });

          return torrentLinks;
        }

        extractMagnetName(magnetUrl) {
          const match = magnetUrl.match(/dn=([^&]+)/);
          return match ? decodeURIComponent(match[1].replace(/\\+/g, ' ')) : null;
        }

        extractFilename(url) {
          const urlParts = url.split('/');
          return urlParts[urlParts.length - 1].split('?')[0];
        }

        extractTorrentName(url) {
          const filename = this.extractFilename(url);
          return filename.replace('.torrent', '');
        }

        getTextNodes() {
          const textNodes = [];
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );

          let node;
          while ((node = walker.nextNode())) {
            if (node.textContent.includes('magnet:')) {
              textNodes.push(node);
            }
          }

          return textNodes;
        }

        addLinkIndicators() {
          const links = this.detectAllLinks();

          links.forEach(link => {
            if (link.element && !link.element.classList.contains('qbt-detected')) {
              this.addIndicator(link.element, link.type);
            }
          });
        }

        addIndicator(element, type) {
          element.classList.add('qbt-detected');

          const indicator = document.createElement('span');
          indicator.className = \`qbit-indicator qbit-\${type}\`;
          indicator.title = \`Click to send to qBittorrent (\${type})\`;
          indicator.textContent = '⬇️';

          indicator.style.cssText = \`
            display: inline-block;
            margin-left: 5px;
            font-size: 12px;
            cursor: pointer;
            background: #1976d2;
            color: white;
            border-radius: 3px;
            padding: 2px 4px;
            text-decoration: none;
          \`;

          indicator.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const linkUrl = this.linkElements.get(element) || element.href;
            this.sendToQBittorrent(linkUrl);
          });

          element.parentNode.insertBefore(indicator, element.nextSibling);
        }

        sendToQBittorrent(url) {
          chrome.runtime.sendMessage({
            action: 'SEND_TORRENT',
            url: url
          });
        }
      }

      global.testTorrentLinkDetector = TorrentLinkDetector;
    `);

    TorrentLinkDetector = global.testTorrentLinkDetector;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    detector = new TorrentLinkDetector();

    // Reset mock implementations
    mockDocument.querySelectorAll.mockReturnValue([]);
    mockDocument.createTreeWalker.mockReturnValue({
      nextNode: jest.fn().mockReturnValue(null)
    });
  });

  describe('constructor', () => {
    it('should initialize with correct patterns and empty collections', () => {
      expect(detector.magnetPattern).toBeInstanceOf(RegExp);
      expect(detector.torrentPattern).toBeInstanceOf(RegExp);
      expect(detector.detectedLinks).toBeInstanceOf(Set);
      expect(detector.linkElements).toBeInstanceOf(WeakMap);
    });
  });

  describe('detectAllLinks', () => {
    it('should combine magnet and torrent links', () => {
      const mockMagnetElement = {
        href: 'magnet:?xt=urn:btih:abc123def456789012345678901234567890abcd',
        textContent: 'Test Magnet'
      };
      const mockTorrentElement = {
        href: 'http://example.com/test.torrent',
        textContent: 'Test Torrent'
      };

      // Mock querySelectorAll for magnet links
      mockDocument.querySelectorAll
        .mockReturnValueOnce([mockMagnetElement]) // For magnet links
        .mockReturnValueOnce([mockTorrentElement]); // For torrent links

      // Mock tree walker for text nodes
      mockDocument.createTreeWalker.mockReturnValue({
        nextNode: jest.fn().mockReturnValue(null)
      });

      const links = detector.detectAllLinks();

      expect(links).toHaveLength(2);
      expect(links[0].type).toBe('magnet');
      expect(links[1].type).toBe('torrent');
    });

    it('should return empty array when no links found', () => {
      const links = detector.detectAllLinks();
      expect(links).toHaveLength(0);
    });
  });

  describe('findMagnetLinks', () => {
    it('should find magnet links in href attributes', () => {
      const mockMagnetElement = {
        href: 'magnet:?xt=urn:btih:abc123def456789012345678901234567890abcd&dn=Test%20Torrent',
        textContent: 'Download Magnet',
        classList: { contains: jest.fn().mockReturnValue(false) }
      };

      mockDocument.querySelectorAll.mockReturnValue([mockMagnetElement]);
      mockDocument.createTreeWalker.mockReturnValue({
        nextNode: jest.fn().mockReturnValue(null)
      });

      const magnetLinks = detector.findMagnetLinks();

      expect(magnetLinks).toHaveLength(1);
      expect(magnetLinks[0]).toEqual({
        url: mockMagnetElement.href,
        element: mockMagnetElement,
        type: 'magnet',
        name: 'Test Torrent'
      });
    });

    it('should find magnet links in text content', () => {
      const magnetUrl = 'magnet:?xt=urn:btih:abc123def456789012345678901234567890abcd&dn=Text%20Magnet';
      const mockTextNode = {
        textContent: `Here is a magnet link: ${magnetUrl}`,
        parentElement: document.createElement('div')
      };

      mockDocument.querySelectorAll.mockReturnValue([]);
      mockDocument.createTreeWalker.mockReturnValue({
        nextNode: jest.fn()
          .mockReturnValueOnce(mockTextNode)
          .mockReturnValueOnce(null)
      });

      const magnetLinks = detector.findMagnetLinks();

      expect(magnetLinks).toHaveLength(1);
      expect(magnetLinks[0].url).toBe(magnetUrl);
      expect(magnetLinks[0].type).toBe('magnet');
      expect(magnetLinks[0].name).toBe('Text Magnet');
    });

    it('should reject invalid magnet links', () => {
      const mockInvalidElement = {
        href: 'magnet:invalid-link',
        textContent: 'Invalid Magnet'
      };

      mockDocument.querySelectorAll.mockReturnValue([mockInvalidElement]);
      mockDocument.createTreeWalker.mockReturnValue({
        nextNode: jest.fn().mockReturnValue(null)
      });

      const magnetLinks = detector.findMagnetLinks();

      expect(magnetLinks).toHaveLength(0);
    });
  });

  describe('findTorrentFileLinks', () => {
    it('should find torrent file links', () => {
      const mockTorrentElement = {
        href: 'https://example.com/downloads/awesome-movie.torrent',
        textContent: 'Download Torrent File',
        classList: { contains: jest.fn().mockReturnValue(false) }
      };

      mockDocument.querySelectorAll.mockReturnValue([mockTorrentElement]);

      const torrentLinks = detector.findTorrentFileLinks();

      expect(torrentLinks).toHaveLength(1);
      expect(torrentLinks[0]).toEqual({
        url: mockTorrentElement.href,
        element: mockTorrentElement,
        type: 'torrent',
        name: 'Download Torrent File'
      });
    });

    it('should find torrent links with query parameters', () => {
      const mockTorrentElement = {
        href: 'https://example.com/download.torrent?id=123&token=abc',
        textContent: '',
        classList: { contains: jest.fn().mockReturnValue(false) }
      };

      mockDocument.querySelectorAll.mockReturnValue([mockTorrentElement]);

      const torrentLinks = detector.findTorrentFileLinks();

      expect(torrentLinks).toHaveLength(1);
      expect(torrentLinks[0].name).toBe('download');
    });

    it('should reject non-torrent links', () => {
      const mockNonTorrentElement = {
        href: 'https://example.com/file.zip',
        textContent: 'Download ZIP'
      };

      mockDocument.querySelectorAll.mockReturnValue([mockNonTorrentElement]);

      const torrentLinks = detector.findTorrentFileLinks();

      expect(torrentLinks).toHaveLength(0);
    });
  });

  describe('extractMagnetName', () => {
    it('should extract display name from magnet URL', () => {
      const magnetUrl = 'magnet:?xt=urn:btih:abc123&dn=Test%20Movie%202023&tr=tracker';
      const name = detector.extractMagnetName(magnetUrl);
      expect(name).toBe('Test Movie 2023');
    });

    it('should handle plus signs in display name', () => {
      const magnetUrl = 'magnet:?xt=urn:btih:abc123&dn=Test+Movie+2023';
      const name = detector.extractMagnetName(magnetUrl);
      expect(name).toBe('Test Movie 2023');
    });

    it('should return null when no display name found', () => {
      const magnetUrl = 'magnet:?xt=urn:btih:abc123&tr=tracker';
      const name = detector.extractMagnetName(magnetUrl);
      expect(name).toBeNull();
    });

    it('should handle encoded characters', () => {
      const magnetUrl = 'magnet:?xt=urn:btih:abc123&dn=Test%20%26%20Movie';
      const name = detector.extractMagnetName(magnetUrl);
      expect(name).toBe('Test & Movie');
    });
  });

  describe('extractFilename', () => {
    it('should extract filename from URL', () => {
      const url = 'https://example.com/path/to/file.torrent';
      const filename = detector.extractFilename(url);
      expect(filename).toBe('file.torrent');
    });

    it('should handle URLs with query parameters', () => {
      const url = 'https://example.com/download.torrent?id=123';
      const filename = detector.extractFilename(url);
      expect(filename).toBe('download.torrent');
    });

    it('should handle root-level files', () => {
      const url = 'https://example.com/file.torrent';
      const filename = detector.extractFilename(url);
      expect(filename).toBe('file.torrent');
    });
  });

  describe('extractTorrentName', () => {
    it('should extract name without .torrent extension', () => {
      const url = 'https://example.com/awesome-movie.torrent';
      const name = detector.extractTorrentName(url);
      expect(name).toBe('awesome-movie');
    });

    it('should handle complex filenames', () => {
      const url = 'https://example.com/My.Awesome.Movie.2023.1080p.BluRay.x264.torrent';
      const name = detector.extractTorrentName(url);
      expect(name).toBe('My.Awesome.Movie.2023.1080p.BluRay.x264');
    });
  });

  describe('getTextNodes', () => {
    it('should find text nodes containing magnet links', () => {
      const mockTextNode1 = {
        textContent: 'Here is a magnet: magnet:?xt=urn:btih:abc123'
      };
      const mockTextNode2 = {
        textContent: 'This is just regular text'
      };
      const mockTextNode3 = {
        textContent: 'Another magnet: magnet:?xt=urn:btih:def456'
      };

      mockDocument.createTreeWalker.mockReturnValue({
        nextNode: jest.fn()
          .mockReturnValueOnce(mockTextNode1)
          .mockReturnValueOnce(mockTextNode2)
          .mockReturnValueOnce(mockTextNode3)
          .mockReturnValueOnce(null)
      });

      const textNodes = detector.getTextNodes();

      expect(textNodes).toHaveLength(2);
      expect(textNodes[0]).toBe(mockTextNode1);
      expect(textNodes[1]).toBe(mockTextNode3);
    });

    it('should return empty array when no magnet links in text', () => {
      const mockTextNode = {
        textContent: 'This is just regular text with no magnet links'
      };

      mockDocument.createTreeWalker.mockReturnValue({
        nextNode: jest.fn()
          .mockReturnValueOnce(mockTextNode)
          .mockReturnValueOnce(null)
      });

      const textNodes = detector.getTextNodes();

      expect(textNodes).toHaveLength(0);
    });
  });

  describe('addLinkIndicators', () => {
    it('should add indicators to detected links', () => {
      const mockElement = {
        href: 'magnet:?xt=urn:btih:abc123def456789012345678901234567890abcd',
        textContent: 'Test Magnet',
        classList: {
          contains: jest.fn().mockReturnValue(false),
          add: jest.fn()
        },
        parentNode: {
          insertBefore: jest.fn()
        }
      };

      const mockIndicator = {
        addEventListener: jest.fn(),
        style: {},
        className: '',
        title: '',
        textContent: ''
      };

      mockDocument.querySelectorAll
        .mockReturnValueOnce([mockElement])
        .mockReturnValueOnce([]);

      mockDocument.createTreeWalker.mockReturnValue({
        nextNode: jest.fn().mockReturnValue(null)
      });

      mockDocument.createElement.mockReturnValue(mockIndicator);

      detector.addLinkIndicators();

      expect(mockElement.classList.add).toHaveBeenCalledWith('qbt-detected');
      expect(mockDocument.createElement).toHaveBeenCalledWith('span');
      expect(mockIndicator.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElement.parentNode.insertBefore).toHaveBeenCalledWith(mockIndicator, mockElement.nextSibling);
    });

    it('should not add indicator to already detected links', () => {
      const mockElement = {
        href: 'magnet:?xt=urn:btih:abc123def456789012345678901234567890abcd',
        textContent: 'Test Magnet',
        classList: {
          contains: jest.fn().mockReturnValue(true) // Already detected
        }
      };

      mockDocument.querySelectorAll
        .mockReturnValueOnce([mockElement])
        .mockReturnValueOnce([]);

      mockDocument.createTreeWalker.mockReturnValue({
        nextNode: jest.fn().mockReturnValue(null)
      });

      detector.addLinkIndicators();

      expect(mockDocument.createElement).not.toHaveBeenCalled();
    });
  });

  describe('addIndicator', () => {
    it('should create and configure indicator element', () => {
      const mockElement = {
        classList: { add: jest.fn() },
        parentNode: { insertBefore: jest.fn() },
        nextSibling: {}
      };

      const mockIndicator = {
        addEventListener: jest.fn(),
        style: {},
        className: '',
        title: '',
        textContent: ''
      };

      mockDocument.createElement.mockReturnValue(mockIndicator);

      detector.addIndicator(mockElement, 'magnet');

      expect(mockElement.classList.add).toHaveBeenCalledWith('qbt-detected');
      expect(mockIndicator.className).toBe('qbit-indicator qbit-magnet');
      expect(mockIndicator.title).toBe('Click to send to qBittorrent (magnet)');
      expect(mockIndicator.textContent).toBe('⬇️');
      expect(mockIndicator.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should handle indicator click events', () => {
      const mockElement = {
        classList: { add: jest.fn() },
        parentNode: { insertBefore: jest.fn() },
        nextSibling: {},
        href: 'test-url'
      };

      const mockIndicator = {
        addEventListener: jest.fn(),
        style: {},
        className: '',
        title: '',
        textContent: ''
      };

      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      mockDocument.createElement.mockReturnValue(mockIndicator);

      detector.addIndicator(mockElement, 'torrent');

      // Simulate click
      const clickHandler = mockIndicator.addEventListener.mock.calls[0][1];
      clickHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'SEND_TORRENT',
        url: 'test-url'
      });
    });
  });

  describe('sendToQBittorrent', () => {
    it('should send message to background script', () => {
      const testUrl = 'magnet:?xt=urn:btih:abc123';

      detector.sendToQBittorrent(testUrl);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'SEND_TORRENT',
        url: testUrl
      });
    });
  });
});