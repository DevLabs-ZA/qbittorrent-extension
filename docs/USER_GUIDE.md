# User Guide

This comprehensive guide will help you master all features of the qBittorrent Web Integration browser extension.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Extension Interface](#extension-interface)
3. [Torrent Detection](#torrent-detection)
4. [Download Management](#download-management)
5. [Configuration Options](#configuration-options)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [Site Management](#site-management)
8. [Advanced Features](#advanced-features)
9. [Tips and Best Practices](#tips-and-best-practices)

## Getting Started

### First Time Use

After installation and configuration, the extension will automatically start detecting torrent links on web pages you visit.

**Visual Indicators:**
- Blue download icons (⬇️) appear next to detected torrent links
- Extension badge shows the number of torrents found on the current page
- Popup interface provides quick access to all detected torrents

### Basic Workflow

1. **Browse** any website containing torrent links
2. **Detect** - Extension automatically finds magnet links and .torrent files
3. **Send** - Click indicators, use popup, or keyboard shortcuts to send torrents
4. **Download** - Torrents are automatically added to your qBittorrent client

## Extension Interface

### Browser Toolbar Icon

The extension icon in your browser toolbar shows:
- **Badge Number**: Count of torrents detected on current page
- **Color Indicator**: Connection status (green = connected, red = disconnected)

### Extension Popup

Click the extension icon to open the popup interface:

#### Connection Status Section
```
🔗 Connection Status: Connected ✅
   qBittorrent v4.5.0
```
- **Green "Connected"**: Extension can communicate with qBittorrent
- **Red "Disconnected"**: Check your qBittorrent configuration
- **Yellow "Checking..."**: Connection test in progress

#### Torrent Detection Section
```
📊 Torrents Found: 5
[Send 5 Torrents] [Refresh]
```
- **Torrent Count**: Number of torrents detected on current page
- **Send All Button**: Sends all detected torrents to qBittorrent
- **Refresh Button**: Rescans the current page for new torrents

#### Quick Options Section
```
📁 Category: [Movies     ▼]
💾 Save Path: [/home/user/Downloads/Movies]
⏸️ Start Paused: ☐
```
- **Category**: Assign torrents to specific qBittorrent categories
- **Save Path**: Override default download location
- **Start Paused**: Add torrents without starting downloads immediately

#### Action Buttons
- **🔧 Options**: Open full configuration page
- **🔄 Test Connection**: Verify qBittorrent connectivity

### Options Page

Access comprehensive settings via the Options button:

#### Server Settings Tab
- **Connection Configuration**: URL, credentials, HTTPS settings
- **Connection Testing**: Real-time connection verification
- **Advanced Network**: Timeouts, retry attempts, debug logging

#### Download Options Tab
- **Default Behavior**: Categories, save paths, torrent state
- **File Handling**: Hash checking, duplicate handling
- **Notifications**: Success/error messages, desktop notifications

#### Site Management Tab
- **Whitelist Mode**: Only detect torrents on specified domains
- **Blacklist Mode**: Exclude specific domains from detection
- **Domain Patterns**: Support for wildcards and subdomains

## Torrent Detection

### Supported Link Types

#### Magnet Links
```
magnet:?xt=urn:btih:1234567890abcdef1234567890abcdef12345678&dn=Example+Torrent
```
- **Detection**: Automatic on page load and dynamic content
- **Extraction**: Torrent name from `dn` parameter
- **Validation**: Hash integrity verification

#### Torrent Files
```
https://example.com/torrents/movie.torrent
https://tracker.example.com/download.php?id=12345&passkey=abcdef
```
- **Detection**: Links ending in `.torrent` or containing torrent patterns
- **Download**: Automatic file retrieval and forwarding
- **Size Limits**: Maximum 10MB file size for security

### Detection Modes

#### Static Detection
- **Page Load**: Scans page content when initially loaded
- **Performance**: Fast, minimal resource usage
- **Coverage**: Finds all visible torrent links

#### Dynamic Detection
- **Real-time Monitoring**: Watches for new content added to page
- **AJAX Support**: Detects torrents loaded via JavaScript
- **Debounced Scanning**: Optimized performance with 500ms delay

#### Manual Detection
- **Refresh Button**: Force rescan of current page
- **Keyboard Shortcut**: `Ctrl+Shift+R` to refresh detection
- **Popup Trigger**: Click extension icon to trigger scan

### Visual Indicators

#### Link Indicators
```
[Torrent Link] ⬇️
```
- **Appearance**: Blue download icon next to detected links
- **Hover Text**: "Click to send to qBittorrent (magnet/torrent)"
- **Click Action**: Immediately sends torrent to qBittorrent

#### Badge Counter
- **Extension Icon**: Shows number of detected torrents
- **Dynamic Updates**: Real-time count updates
- **Zero State**: No badge when no torrents detected

## Download Management

### Single Torrent Download

#### Via Link Indicators
1. **Locate** the blue download icon (⬇️) next to any torrent link
2. **Click** the icon to send the torrent immediately
3. **Confirmation** appears via notification

#### Via Context Menu
1. **Right-click** on any magnet link or .torrent file link
2. **Select** "Send to qBittorrent" from context menu
3. **Automatic** sending with current settings applied

#### Via Auto-Download
1. **Enable** "Auto Download" in extension options
2. **Click** any torrent link normally
3. **Automatic** interception and sending to qBittorrent

### Bulk Torrent Download

#### Via Extension Popup
1. **Click** extension icon to open popup
2. **Review** detected torrent count
3. **Click** "Send X Torrents" button
4. **Progress** shown via notifications

#### Via Keyboard Shortcut
1. **Press** `Ctrl+Shift+T` (or `Cmd+Shift+T` on Mac)
2. **All** detected torrents sent automatically
3. **Summary** notification shows success/failure count

#### Via Context Menu
1. **Right-click** anywhere on the page
2. **Select** "Send all torrents on page"
3. **Batch** processing with individual result tracking

### Download Options

#### Category Assignment
```
Options: Category → [Movies] [TV Shows] [Software] [Custom...]
```
- **Automatic**: Apply to all downloads
- **Per-Download**: Override in popup quick options
- **Dynamic**: Categories loaded from qBittorrent server

#### Save Path Configuration
```
Options: Save Path → [/downloads/] [/media/movies/] [Custom...]
```
- **Global Default**: Set in extension options
- **Category-Specific**: Different paths per category
- **Override**: Specify in popup for individual downloads

#### Torrent State Management
```
☐ Start Paused     - Add torrents without starting
☐ Skip Hash Check  - Skip file integrity verification
☐ Sequential Download - Download files in order
```

## Configuration Options

### Basic Settings

#### Server Connection
```
Server URL: http://localhost:8080
Username: admin
Password: ●●●●●●●●
☐ Use HTTPS
```

#### Download Behavior
```
Default Category: [None ▼]
Save Path: [Use qBittorrent Default]
☐ Start torrents paused
☐ Skip hash checking
```

### Advanced Settings

#### Network Configuration
```
Connection Timeout: [30] seconds
Retry Attempts: [3] times
☐ Enable debug logging
```

#### Extension Behavior
```
☑ Auto-download torrent links
☑ Show notifications
☑ Show link indicators
☑ Scan dynamic content
```

### Site-Specific Settings

#### Whitelist Mode
```
Enable Whitelist: ☑
Allowed Domains:
- *.legittorrents.com
- ubuntu.com
- archlinux.org
```

#### Blacklist Mode
```
Enable Blacklist: ☑
Blocked Domains:
- malicioussite.com
- *.ads.com
- tracker-spam.net
```

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+Shift+T` | Send All Torrents | Send all detected torrents on current page |
| `Ctrl+Shift+R` | Refresh Detection | Rescan current page for torrents |
| `Ctrl+Shift+O` | Open Options | Open extension configuration page |

### Mac Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Cmd+Shift+T` | Send All Torrents | Send all detected torrents on current page |
| `Cmd+Shift+R` | Refresh Detection | Rescan current page for torrents |
| `Cmd+Shift+O` | Open Options | Open extension configuration page |

### Customizing Shortcuts

1. **Chrome**: Go to `chrome://extensions/shortcuts`
2. **Firefox**: Go to `about:addons` → Manage Extension Shortcuts
3. **Modify** existing shortcuts or add new ones
4. **Conflict Resolution**: Browser warns about conflicting shortcuts

## Site Management

### Whitelist Configuration

Use whitelist mode to only monitor specific sites:

```
☑ Enable Whitelist Mode

Allowed Domains:
linuxtracker.org
ubuntu.com
*.archlinux.org
legittorrents.com
```

**Wildcard Support:**
- `*.example.com` - All subdomains of example.com
- `example.*` - All top-level domains for example
- `*tracker*` - Any domain containing "tracker"

### Blacklist Configuration

Use blacklist mode to exclude problematic sites:

```
☑ Enable Blacklist Mode

Blocked Domains:
malware-site.com
*.ads.com
spam-tracker.net
```

**Common Blacklist Entries:**
- Ad networks that inject fake torrent links
- Malicious sites with harmful torrents
- Sites with excessive false positives

### Domain Pattern Examples

```
# Exact match
example.com

# Subdomain wildcard
*.example.com              # matches sub.example.com, www.example.com

# TLD wildcard
example.*                  # matches example.com, example.org

# Partial matching
*tracker*                  # matches anytracker.com, my-tracker.net

# Multiple patterns
*.legal-torrents.com
ubuntu.com
archlinux.org
*.debian.org
```

## Advanced Features

### Settings Import/Export

#### Export Configuration
1. **Open** extension options page
2. **Click** "Export Settings" button
3. **Save** JSON file with timestamp
4. **Backup** file contains all settings except passwords

#### Import Configuration
1. **Click** "Import Settings" button
2. **Select** previously exported JSON file
3. **Confirm** replacement of current settings
4. **Reload** extension to apply changes

### Connection Management

#### Connection Testing
```
[Test Connection] → Testing... → Connected ✅
                              → Failed ❌ (reason)
```

#### Automatic Reconnection
- **Session Timeout**: 30-minute authentication cache
- **Auto-Retry**: Automatic reconnection on network changes
- **Error Recovery**: Graceful handling of connection failures

#### Connection Monitoring
- **Real-time Status**: Popup shows current connection state
- **Background Checks**: Periodic connection verification
- **User Notification**: Alert on connection loss

### Performance Optimization

#### Scan Optimization
```
Scan Interval: 5 seconds (configurable)
Debounce Delay: 500ms for dynamic content
Rate Limiting: 20 requests per minute
```

#### Memory Management
- **Weak References**: Efficient DOM element tracking
- **Cleanup**: Automatic removal of stale references
- **Throttling**: Prevents excessive resource usage

### Security Features

#### Credential Protection
- **AES-256 Encryption**: All stored credentials encrypted
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Secure Storage**: Separation of sensitive and non-sensitive data

#### Input Validation
- **URL Sanitization**: All inputs validated and sanitized
- **Path Validation**: Safe handling of file paths
- **Rate Limiting**: Protection against abuse

## Tips and Best Practices

### Optimal Configuration

#### For Local Use
```
Server URL: http://localhost:8080
Connection Timeout: 10 seconds
Retry Attempts: 2
```

#### For Remote Access
```
Server URL: https://your-domain.com:8080
Connection Timeout: 30 seconds
Retry Attempts: 3
Use HTTPS: ✓
```

### Performance Tips

1. **Whitelist Mode**: Use whitelist for better performance on frequently visited sites
2. **Disable Dynamic Scanning**: Turn off for sites with heavy JavaScript if not needed
3. **Reasonable Timeouts**: Don't set timeouts too high to avoid browser hanging

### Security Best Practices

1. **Use HTTPS**: Always use HTTPS for remote qBittorrent access
2. **Strong Passwords**: Use complex passwords for qBittorrent Web UI
3. **Network Security**: Consider VPN for remote access
4. **Regular Updates**: Keep both extension and qBittorrent updated

### Troubleshooting Common Issues

#### High CPU Usage
- **Cause**: Excessive dynamic scanning on heavy JavaScript sites
- **Solution**: Disable dynamic scanning or add site to blacklist

#### Missing Torrents
- **Cause**: Page content loaded after scan
- **Solution**: Use refresh button or enable dynamic scanning

#### Slow Response
- **Cause**: Network latency or server overload
- **Solution**: Increase timeout settings or check server performance

### Browser-Specific Features

#### Chrome/Edge
- **Sync Settings**: Extension settings sync with browser account
- **Incognito Mode**: Extension works in private browsing (if enabled)
- **Enterprise**: Managed deployment via enterprise policies

#### Firefox
- **Container Support**: Works with Firefox container tabs
- **Enhanced Privacy**: Compatible with strict privacy settings
- **Developer Tools**: Advanced debugging capabilities

## Getting Help

### Documentation Resources
- **Installation Guide**: [`docs/INSTALLATION.md`](INSTALLATION.md)
- **Troubleshooting**: [`docs/TROUBLESHOOTING.md`](TROUBLESHOOTING.md)
- **API Documentation**: [`docs/API.md`](API.md)

### Community Support
- **GitHub Issues**: Report bugs and feature requests
- **Discussions**: Community Q&A and tips
- **Wiki**: Community-maintained documentation

### Professional Support
- **Security Issues**: See [`SECURITY.md`](../SECURITY.md) for reporting
- **Enterprise Deployment**: Contact for enterprise support
- **Custom Development**: Available for specialized requirements

---

**Congratulations!** You're now equipped to use all features of the qBittorrent Web Integration extension effectively.