# Installation Guide

This guide provides detailed instructions for installing the qBittorrent Web Integration browser extension across different browsers and operating systems.

## Prerequisites

### System Requirements

- **Operating System**: Windows 10+, macOS 10.14+, or Linux
- **RAM**: Minimum 4GB (8GB recommended)
- **Browser**: Chrome 88+, Edge 88+, or Firefox 109+
- **qBittorrent**: Version 4.3.0 or higher

### qBittorrent Web UI Setup

Before installing the extension, you must configure qBittorrent's Web UI:

#### 1. Enable Web UI

1. **Open qBittorrent** desktop application
2. Navigate to **Tools** → **Options** (or **Preferences** on macOS)
3. Click **Web UI** in the left sidebar
4. Check **"Enable Web User Interface (Remote control)"**

#### 2. Configure Network Settings

**Basic Configuration:**
- **Port**: `8080` (default) or choose your preferred port
- **IP Address**: Leave as `*` for all interfaces, or specify `127.0.0.1` for localhost only

**Advanced Configuration:**
- **Use UPnP/NAT-PMP**: Enable if accessing remotely
- **Use HTTPS**: Enable for secure connections (requires certificate setup)

#### 3. Set Authentication

**Security Settings:**
- **Username**: `admin` (default) or create custom username
- **Password**: **Create a strong password** (required for security)
- **Bypass authentication for clients on localhost**: Optional for local access
- **Bypass local host authentication**: Optional for trusted local networks

#### 4. Additional Security (Recommended)

**Host header validation:**
- **Whitelist**: Add your domain if accessing via domain name
- **Enable clickjacking protection**: Keep enabled

**Cross-origin resource sharing (CORS):**
- **Enable cross-origin resource sharing**: Keep disabled unless needed

#### 5. Apply and Test

1. Click **Apply** to save settings
2. **Restart qBittorrent** for changes to take effect
3. Test Web UI access: Open `http://localhost:8080` in your browser
4. Login with your configured credentials

## Browser Extension Installation

### Method 1: Chrome Web Store (Recommended)

*Note: Extension is currently pending Chrome Web Store approval*

1. Visit the [Chrome Web Store page](https://chrome.google.com/webstore/detail/qbittorrent-web-integration) (link coming soon)
2. Click **"Add to Chrome"**
3. Confirm by clicking **"Add extension"**
4. Extension will be automatically installed and updated

### Method 2: Manual Installation (Developer Mode)

#### For Chrome and Chromium-based browsers (Edge, Brave, Opera)

1. **Download the Extension**
   ```bash
   # Option A: Download from GitHub
   git clone https://github.com/DevLabs-ZA/qbittorrent-extension.git
   cd qbittorrent-extension
   
   # Option B: Download ZIP and extract
   # Download from: https://github.com/DevLabs-ZA/qbittorrent-extension/archive/main.zip
   ```

2. **Open Extension Management**
   - Chrome: Navigate to `chrome://extensions/`
   - Edge: Navigate to `edge://extensions/`
   - Brave: Navigate to `brave://extensions/`
   - Opera: Navigate to `opera://extensions/`

3. **Enable Developer Mode**
   - Toggle **"Developer mode"** switch in the top-right corner

4. **Load Extension**
   - Click **"Load unpacked"**
   - Select the extension folder (containing `manifest.json`)
   - Extension will appear in your extensions list

5. **Pin Extension (Optional)**
   - Click the puzzle piece icon in the toolbar
   - Click the pin icon next to "qBittorrent Web Integration"

#### For Mozilla Firefox

1. **Download the Extension**
   ```bash
   git clone https://github.com/DevLabs-ZA/qbittorrent-extension.git
   cd qbittorrent-extension
   ```

2. **Load Temporary Add-on**
   - Navigate to `about:debugging#/runtime/this-firefox`
   - Click **"Load Temporary Add-on..."**
   - Select `manifest.json` from the extension folder

3. **Note for Firefox**
   - Temporary add-ons are removed when Firefox restarts
   - For permanent installation, the extension needs to be signed by Mozilla

### Method 3: Build from Source

For developers or advanced users:

1. **Clone Repository**
   ```bash
   git clone https://github.com/DevLabs-ZA/qbittorrent-extension.git
   cd qbittorrent-extension
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run Tests**
   ```bash
   npm run test
   ```

4. **Build Extension**
   ```bash
   npm run build
   ```

5. **Load in Browser** (follow manual installation steps above)

## Extension Configuration

### Initial Setup

1. **Access Extension Settings**
   - Click the extension icon in your browser toolbar
   - Click **"Options"** button in the popup

2. **Configure Server Connection**
   ```
   Server URL: http://localhost:8080
   Username: admin (or your custom username)
   Password: [Your qBittorrent Web UI password]
   Use HTTPS: [Check if qBittorrent uses HTTPS]
   ```

3. **Test Connection**
   - Click **"Test Connection"** button
   - Verify "Connected" status appears
   - Green status indicates successful connection

### Advanced Configuration

#### Remote Access Setup

If qBittorrent is running on a different machine:

1. **Network Configuration**
   ```
   Server URL: http://192.168.1.100:8080
   # Replace with your qBittorrent server's IP address
   ```

2. **Firewall Configuration**
   - Windows: Allow qBittorrent through Windows Firewall
   - Linux: `sudo ufw allow 8080/tcp`
   - macOS: Allow through System Preferences → Security & Privacy

3. **Router Configuration** (for internet access)
   - Forward port 8080 to your qBittorrent server
   - Consider using VPN for security

#### HTTPS Setup

For secure connections:

1. **Generate SSL Certificate**
   ```bash
   # Self-signed certificate (for testing)
   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
   ```

2. **Configure Reverse Proxy** (nginx example)
   ```nginx
   server {
       listen 443 ssl;
       server_name your-domain.com;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       location / {
           proxy_pass http://localhost:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **Update Extension Settings**
   ```
   Server URL: https://your-domain.com
   Use HTTPS: ✓ Enabled
   ```

## Verification Steps

### 1. Connection Test

1. Open extension popup
2. Check connection status indicator
3. Status should show "Connected" in green

### 2. Functionality Test

1. Visit a torrent site (e.g., legal Linux distributions)
2. Look for blue download indicators (⬇️) on torrent links
3. Click an indicator or use "Send All" button
4. Verify torrent appears in qBittorrent

### 3. Permission Verification

1. Check browser extension permissions
2. Ensure only necessary permissions are granted:
   - Storage
   - Notifications
   - Context menus
   - Active tab

## Troubleshooting Installation

### Common Issues

#### "Extension failed to load"
- **Cause**: Corrupted download or missing files
- **Solution**: Re-download and extract the extension

#### "Connection failed" after installation
- **Cause**: qBittorrent Web UI not properly configured
- **Solution**: Follow qBittorrent setup steps above

#### Extension not visible in toolbar
- **Cause**: Extension hidden or not pinned
- **Solution**: Click puzzle piece icon and pin the extension

#### "Invalid manifest" error
- **Cause**: Incorrect browser version or manifest issues
- **Solution**: Ensure browser meets minimum version requirements

### Browser-Specific Issues

#### Chrome/Edge Issues
- Clear browser cache and cookies
- Disable other torrent-related extensions temporarily
- Check if corporate policies block extension installation

#### Firefox Issues
- Ensure `xpinstall.signatures.required` is set to `false` for unsigned extensions
- Check if Enhanced Tracking Protection is blocking functionality

### Network Issues

#### Local Connection Problems
```bash
# Test qBittorrent Web UI directly
curl -X POST http://localhost:8080/api/v2/auth/login \
  -d "username=admin&password=yourpassword"
```

#### Remote Connection Problems
- Verify network connectivity: `ping your-server-ip`
- Check firewall rules on both client and server
- Ensure qBittorrent is bound to correct network interface

## Security Considerations

### Credential Security
- Extension encrypts stored credentials using AES-256
- Consider using HTTPS for all remote connections
- Regularly update qBittorrent and the extension

### Network Security
- Use VPN for remote access when possible
- Configure qBittorrent firewall rules carefully
- Monitor qBittorrent logs for unauthorized access attempts

### Browser Security
- Keep browser updated to latest version
- Only install extensions from trusted sources
- Review extension permissions regularly

## Uninstallation

### Remove Extension
1. **Chrome/Edge**: Go to extensions page → Remove
2. **Firefox**: Go to Add-ons page → Remove

### Clean Stored Data
- Extension data is automatically removed with uninstallation
- qBittorrent settings remain unchanged

## Next Steps

After successful installation:

1. **Read the User Guide**: [`docs/USER_GUIDE.md`](USER_GUIDE.md)
2. **Configure Advanced Settings**: Customize behavior and preferences
3. **Set Up Site Whitelisting**: Control which sites the extension monitors
4. **Explore Keyboard Shortcuts**: Learn time-saving shortcuts

## Support

If you encounter issues during installation:

1. Check [`docs/TROUBLESHOOTING.md`](TROUBLESHOOTING.md) for detailed solutions
2. Review [GitHub Issues](https://github.com/DevLabs-ZA/qbittorrent-extension/issues)
3. Create a new issue with detailed error information

---

**Installation complete!** You're now ready to seamlessly download torrents directly to qBittorrent from your browser.