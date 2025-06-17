# qBittorrent Web Integration Browser Extension

A secure browser extension that seamlessly integrates with your qBittorrent Web UI to automatically detect and send magnet links and torrent files directly to your qBittorrent client.

## 🌟 Features

- **Automatic Link Detection**: Scans web pages for magnet links and .torrent files
- **One-Click Download**: Send torrents to qBittorrent with a single click
- **Bulk Operations**: Send multiple torrents from a page simultaneously
- **Visual Indicators**: Highlights detected torrent links on web pages
- **Context Menu Integration**: Right-click menu options for quick torrent sending
- **Keyboard Shortcuts**: `Ctrl+Shift+T` (or `Cmd+Shift+T` on Mac) to send all torrents on a page
- **Secure Authentication**: Encrypted credential storage with AES-256 encryption
- **Configurable Options**: Customize download paths, categories, and behavior
- **Site Management**: Whitelist/blacklist specific domains
- **Connection Testing**: Built-in connection verification tools
- **Real-time Sync**: Automatic detection of dynamic content changes

## 🌐 Browser Compatibility

| Browser | Minimum Version | Status |
|---------|----------------|--------|
| Google Chrome | 88+ | ✅ Fully Supported |
| Microsoft Edge | 88+ | ✅ Fully Supported |
| Mozilla Firefox | 109+ | ✅ Fully Supported |
| Safari | Not Supported | ❌ Manifest V3 required |

## 📦 Installation

### From Chrome Web Store (Recommended)
*Coming Soon - Extension pending store approval*

### Manual Installation

1. **Download the Extension**
   ```bash
   git clone https://github.com/DevLabs-ZA/qbittorrent-extension.git
   cd qbittorrent-extension
   ```

2. **Install in Chrome/Edge**
   - Open `chrome://extensions/` (or `edge://extensions/`)
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the extension folder

3. **Install in Firefox**
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select any file in the extension folder

## ⚙️ Initial Setup

### 1. Configure qBittorrent Web UI

First, ensure qBittorrent Web UI is enabled:

1. Open qBittorrent desktop application
2. Go to **Tools** → **Options** → **Web UI**
3. Check "Enable Web User Interface (Remote control)"
4. Set port (default: 8080)
5. Configure authentication:
   - Username: `admin` (default)
   - Password: (set a secure password)

### 2. Extension Configuration

1. Click the extension icon in your browser toolbar
2. Click "Options" to open the settings page
3. Configure server connection:
   - **Server URL**: `http://localhost:8080` (adjust if different)
   - **Username**: Your qBittorrent Web UI username
   - **Password**: Your qBittorrent Web UI password
   - **Use HTTPS**: Enable if your qBittorrent uses HTTPS
4. Click "Test Connection" to verify setup
5. Save settings

## 🚀 Usage Guide

### Basic Usage

1. **Automatic Detection**: Visit any website with torrent links
2. **Visual Indicators**: Detected links show a blue download icon (⬇️)
3. **One-Click Send**: Click the indicator or link to send to qBittorrent
4. **Bulk Send**: Use the extension popup or keyboard shortcut to send all torrents

### Extension Popup

Click the extension icon to access:
- **Connection Status**: Real-time connection indicator
- **Torrent Count**: Number of torrents detected on current page
- **Send All Button**: Send all detected torrents at once
- **Quick Options**: Category and save path selection
- **Refresh**: Rescan the current page

### Context Menu

Right-click on any torrent link for options:
- **Send to qBittorrent**: Send individual torrent
- **Send all torrents on page**: Bulk send all detected torrents

### Keyboard Shortcuts

- **Ctrl+Shift+T** (Windows/Linux) or **Cmd+Shift+T** (Mac): Send all torrents on current page

## 🔧 Configuration Options

### Download Settings
- **Default Category**: Assign torrents to specific categories
- **Save Path**: Custom download location
- **Start Paused**: Add torrents in paused state
- **Skip Hash Check**: Skip integrity verification

### Behavior Settings
- **Auto Download**: Automatically intercept torrent link clicks
- **Show Notifications**: Display success/error notifications
- **Show Indicators**: Display visual indicators on detected links
- **Scan Dynamic Content**: Monitor for dynamically loaded torrents

### Site Management
- **Whitelist**: Only detect torrents on specified domains
- **Blacklist**: Exclude specific domains from detection

### Advanced Settings
- **Connection Timeout**: Request timeout duration (seconds)
- **Retry Attempts**: Number of retry attempts on failure
- **Debug Logging**: Enable detailed logging for troubleshooting

## 🛠️ Troubleshooting

### Common Issues

#### "Connection Failed" Error
1. Verify qBittorrent Web UI is enabled and running
2. Check server URL and port number
3. Ensure firewall allows connections on the specified port
4. Try using IP address instead of localhost: `http://192.168.1.100:8080`

#### "Authentication Failed" Error
1. Verify username and password in extension settings
2. Check qBittorrent Web UI authentication settings
3. Try resetting qBittorrent Web UI credentials

#### "No Torrents Detected"
1. Click the refresh button in the extension popup
2. Check if the website uses dynamic content loading
3. Enable "Scan Dynamic Content" in settings
4. Verify the site isn't in your blacklist

#### Extension Not Working
1. Check browser compatibility
2. Ensure extension is enabled in browser settings
3. Try reloading the web page
4. Restart the browser if needed

### Network Configuration

#### Remote Access Setup
If accessing qBittorrent remotely:

1. **Port Forwarding**: Forward qBittorrent's port through your router
2. **Firewall Rules**: Allow incoming connections on qBittorrent port
3. **Dynamic DNS**: Use a service like No-IP for changing IP addresses
4. **VPN Access**: Consider VPN for secure remote access

#### HTTPS Configuration
For secure connections:

1. Set up reverse proxy (nginx, Apache) with SSL certificate
2. Configure qBittorrent behind the proxy
3. Enable "Use HTTPS" in extension settings
4. Update server URL to use `https://`

## 📊 Security & Privacy

This extension implements comprehensive security measures:

- **Encrypted Storage**: Credentials stored using AES-256 encryption
- **Minimal Permissions**: Only requests necessary browser permissions
- **No Data Collection**: No user data sent to external servers
- **Secure Communication**: Direct connection to your qBittorrent instance
- **Input Validation**: All inputs sanitized and validated
- **Rate Limiting**: Protection against abuse and DoS attacks

For detailed security information, see [`SECURITY.md`](SECURITY.md).

## 🔗 Supported Sites

The extension works on any website containing:
- **Magnet Links**: `magnet:?xt=urn:btih:...`
- **Torrent Files**: Links ending in `.torrent`

Popular torrent sites and indexers are automatically supported.

## 🆘 Support & Feedback

### Getting Help

1. **Documentation**: Check [`docs/`](docs/) folder for detailed guides
2. **Troubleshooting**: See [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md)
3. **Issues**: Report bugs on [GitHub Issues](https://github.com/DevLabs-ZA/qbittorrent-extension/issues)
4. **Discussions**: Join discussions on [GitHub Discussions](https://github.com/DevLabs-ZA/qbittorrent-extension/discussions)

### Contributing

We welcome contributions! Please see [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- qBittorrent team for the excellent BitTorrent client
- Browser extension community for security best practices
- Contributors and testers who helped improve this extension

## 🔄 Version History

See [`CHANGELOG.md`](CHANGELOG.md) for detailed version history and changes.

---

**Made with ❤️ by DevLabs-ZA**

For more information, visit our [project homepage](https://github.com/DevLabs-ZA/qbittorrent-extension).