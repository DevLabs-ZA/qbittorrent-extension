let detector = null;
let observerActive = false;

// Initialize detector when page loads
document.addEventListener('DOMContentLoaded', initializeDetector);

// Also initialize if document is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDetector);
} else {
    initializeDetector();
}

function initializeDetector() {
    detector = new TorrentLinkDetector();

    // Initial scan
    scanForTorrents();

    // Set up mutation observer for dynamic content
    setupMutationObserver();

    // Add click handlers for detected links
    setupClickHandlers();
}

function scanForTorrents() {
    if (!detector) {return;}

    try {
        detector.addLinkIndicators();
        updateBadge();
    } catch (error) {
        console.error('Error scanning for torrents:', error);
    }
}

function setupMutationObserver() {
    if (observerActive || !detector) {return;}

    const observer = new MutationObserver((mutations) => {
        let shouldRescan = false;

        mutations.forEach((mutation) => {
            if (mutation.type === 'childlist') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if new node contains torrent links
                        if (node.querySelector && (
                            node.querySelector('a[href^="magnet:"]') ||
                            node.querySelector('a[href*=".torrent"]') ||
                            node.textContent.includes('magnet:')
                        )) {
                            shouldRescan = true;
                        }
                    }
                });
            }
        });

        if (shouldRescan) {
            // Debounce rescanning
            clearTimeout(window.torrentScanTimeout);
            window.torrentScanTimeout = setTimeout(scanForTorrents, 500);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    observerActive = true;
}

function setupClickHandlers() {
    // Handle clicks on magnet and torrent links
    document.addEventListener('click', (event) => {
        const {target} = event;

        if (target.tagName === 'A') {
            const {href} = target;

            if (href && (href.startsWith('magnet:') || href.includes('.torrent'))) {
                // Check if user wants auto-download
                chrome.storage.sync.get(['options'], (result) => {
                    if (result.options && result.options.autoDownload) {
                        event.preventDefault();

                        chrome.runtime.sendMessage({
                            action: 'SEND_TORRENT',
                            url: href
                        });
                    }
                });
            }
        }
    });
}

function updateBadge() {
    if (!detector) {return;}

    const torrentCount = detector.detectAllLinks().length;

    chrome.runtime.sendMessage({
        action: 'UPDATE_BADGE',
        count: torrentCount
    });
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'GET_ALL_TORRENTS':
            if (detector) {
                const torrents = detector.detectAllLinks();
                sendResponse({ torrents: torrents.map(t => t.url) });
            } else {
                sendResponse({ torrents: [] });
            }
            break;

        case 'RESCAN_PAGE':
            scanForTorrents();
            sendResponse({ success: true });
            break;
    }
});

// Scan periodically for dynamic content
setInterval(() => {
    if (detector) {
        scanForTorrents();
    }
}, 5000);