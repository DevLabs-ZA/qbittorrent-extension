class TorrentLinkDetector {
    constructor() {
        this.magnetPattern = /magnet:\?xt=urn:btih:[a-zA-Z0-9]{32,40}/gi;
        this.torrentPattern = /\.torrent(\?[^"'\s]*)?$/i;
        this.detectedLinks = new Set();
        this.linkElements = new WeakMap();
    }

    detectAllLinks() {
        const links = [];

        // Find magnet links
        this.findMagnetLinks().forEach(link => links.push(link));

        // Find .torrent file links
        this.findTorrentFileLinks().forEach(link => links.push(link));

        return links;
    }

    findMagnetLinks() {
        const magnetLinks = [];

        // Search in href attributes
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

        // Search in text content for magnet links
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
        return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : null;
    }

    extractFilename(url) {
        const urlParts = url.split('/');
        return urlParts[urlParts.length - 1].split('?')[0];
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
        indicator.className = `qbit-indicator qbit-${type}`;
        indicator.title = `Click to send to qBittorrent (${type})`;
        indicator.textContent = '⬇️';

        indicator.style.cssText = `
            display: inline-block;
            margin-left: 5px;
            font-size: 12px;
            cursor: pointer;
            background: #1976d2;
            color: white;
            border-radius: 3px;
            padding: 2px 4px;
            text-decoration: none;
        `;

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


// Export for use in content script
window.TorrentLinkDetector = TorrentLinkDetector;