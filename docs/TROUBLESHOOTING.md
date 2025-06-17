# Troubleshooting Guide

This comprehensive guide helps you diagnose and resolve common issues with the qBittorrent Web Integration browser extension.

## Table of Contents

1. [Quick Diagnostic Steps](#quick-diagnostic-steps)
2. [Connection Issues](#connection-issues)
3. [Authentication Problems](#authentication-problems)
4. [Torrent Detection Issues](#torrent-detection-issues)
5. [Download Problems](#download-problems)
6. [Browser-Specific Issues](#browser-specific-issues)
7. [Performance Issues](#performance-issues)
8. [Debug Mode](#debug-mode)
9. [Log Collection](#log-collection)
10. [Getting Support](#getting-support)

## Quick Diagnostic Steps

Before diving into specific issues, try these quick diagnostic steps:

### 1. Basic Health Check

```bash
# Check qBittorrent Web UI directly
curl -X POST http://localhost:8080/api/v2/auth/login \
  -d "username=admin&password=yourpassword"
```

Expected response: `Ok.`

### 2. Extension Status Check

1. **Open extension popup**
2. **Check connection status** (should be green "Connected")
3. **Verify torrent count** on a known torrent site
4. **Test connection** using the test button

### 3. Browser Console Check

1. **Open Developer Tools** (F12)
2. **Check Console tab** for error messages
3. **Look for extension-related errors**

## Connection Issues

### "Connection Failed" Error

#### Symptoms
- Red "Disconnected" status in popup
- "Connection failed" notification
- Unable to send torrents

#### Diagnostic Steps

1. **Verify qBittorrent Web UI Status**
   ```bash
   # Check if Web UI is running
   netstat -an | grep :8080
   # or
   lsof -i :8080
   ```

2. **Test Direct Web UI Access**
   - Open `http://localhost:8080` in browser
   - Should show qBittorrent login page

3. **Check Extension Settings**
   - Server URL format: `http://localhost:8080`
   - No trailing slash
   - Correct port number

#### Common Solutions

**✅ Enable qBittorrent Web UI**
1. Open qBittorrent desktop application
2. Go to **Tools** → **Options** → **Web UI**
3. Check **"Enable Web User Interface (Remote control)"**
4. Click **Apply** and restart qBittorrent

**✅ Firewall Configuration**
```bash
# Windows
netsh advfirewall firewall add rule name="qBittorrent" dir=in action=allow protocol=TCP localport=8080

# Linux (ufw)
sudo ufw allow 8080/tcp

# macOS
sudo pfctl -f /etc/pf.conf
```

**✅ Port Conflict Resolution**
1. Change qBittorrent Web UI port to 8081
2. Update extension settings to match
3. Test connection

**✅ Network Interface Binding**
1. In qBittorrent Web UI settings
2. Set IP address to `*` (all interfaces) or `127.0.0.1` (localhost)
3. Restart qBittorrent

### "Connection Timeout" Error

#### Symptoms
- Long delays before connection failure
- Intermittent connection issues

#### Solutions

**✅ Increase Timeout Settings**
1. Open extension options
2. Go to **Advanced Settings**
3. Increase **Connection Timeout** to 60 seconds
4. Save settings

**✅ Network Diagnostics**
```bash
# Test network connectivity
ping localhost
telnet localhost 8080

# Check DNS resolution
nslookup localhost
```

### Remote Connection Issues

#### For Remote qBittorrent Access

**✅ Router Configuration**
1. **Port Forwarding**: Forward port 8080 to qBittorrent machine
2. **DMZ Setup**: Place qBittorrent machine in DMZ (less secure)
3. **VPN Access**: Use VPN for secure remote access

**✅ Dynamic DNS Setup**
```bash
# Example with No-IP
# 1. Register domain at no-ip.com
# 2. Install No-IP client
# 3. Update extension settings:
Server URL: http://yourdomain.ddns.net:8080
```

**✅ HTTPS Configuration**
```nginx
# nginx reverse proxy configuration
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Authentication Problems

### "Authentication Failed" Error

#### Symptoms
- Login fails with correct credentials
- "Invalid credentials" message
- Connection test fails after timeout

#### Diagnostic Steps

1. **Test Credentials Directly**
   ```bash
   curl -X POST http://localhost:8080/api/v2/auth/login \
     -d "username=admin&password=yourpassword" \
     -v
   ```

2. **Check qBittorrent Logs**
   - Location: qBittorrent application folder
   - Look for authentication attempts

#### Solutions

**✅ Reset qBittorrent Web UI Password**
1. Open qBittorrent desktop application
2. Go to **Tools** → **Options** → **Web UI**
3. Uncheck **"Enable Web User Interface"**
4. Apply changes and restart qBittorrent
5. Re-enable Web UI and set new password

**✅ Bypass Authentication (Local Only)**
1. In qBittorrent Web UI settings
2. Check **"Bypass authentication for clients on localhost"**
3. Leave extension password field empty
4. Test connection

**✅ Clear Extension Credentials**
1. Open extension options
2. Clear username and password fields
3. Re-enter credentials
4. Save and test connection

### "Session Expired" Error

#### Symptoms
- Intermittent authentication failures
- Works initially, then fails after time

#### Solutions

**✅ Extend Session Timeout**
- Extension automatically handles session renewal
- Session expires after 30 minutes of inactivity
- No user action required

**✅ Clear Browser Cache**
1. Open browser settings
2. Clear cookies and site data
3. Restart browser
4. Test extension again

## Torrent Detection Issues

### "No Torrents Detected" Error

#### Symptoms
- Extension shows "0 torrents found"
- Blue indicators not appearing on torrent links
- Refresh button doesn't help

#### Diagnostic Steps

1. **Manual Link Inspection**
   - Right-click on torrent link
   - Select "Inspect Element"
   - Verify link format: `magnet:?xt=urn:btih:...` or `*.torrent`

2. **Check Site Blacklist**
   - Open extension options
   - Verify current site not in blacklist
   - Check whitelist settings if enabled

#### Solutions

**✅ Enable Dynamic Content Scanning**
1. Open extension options
2. Check **"Scan dynamic content"**
3. Save settings
4. Refresh page

**✅ Site Whitelist Configuration**
```
# Add to whitelist if using whitelist mode
example-torrent-site.com
*.torrent-tracker.org
```

**✅ Manual Page Refresh**
1. Click extension icon
2. Click **"Refresh"** button
3. Wait for scan completion

**✅ Disable Ad Blockers**
- Some ad blockers interfere with torrent link detection
- Temporarily disable ad blocker on torrent sites
- Test if detection improves

### False Positive Detection

#### Symptoms
- Non-torrent links showing blue indicators
- High torrent count on non-torrent sites

#### Solutions

**✅ Add Site to Blacklist**
1. Open extension options
2. Add problematic site to blacklist:
   ```
   problematic-site.com
   *.ads.example.com
   ```

**✅ Improve Detection Patterns**
- Extension uses regex patterns for detection
- Some sites use misleading link formats
- Use site-specific whitelisting

## Download Problems

### "Failed to Send Torrent" Error

#### Symptoms
- Torrent links detected but sending fails
- Error notifications when clicking indicators

#### Diagnostic Steps

1. **Check qBittorrent Disk Space**
   ```bash
   df -h /path/to/download/directory
   ```

2. **Verify Download Permissions**
   ```bash
   ls -la /path/to/download/directory
   ```

3. **Test Manual Torrent Addition**
   - Add torrent directly in qBittorrent
   - Verify it works without extension

#### Solutions

**✅ Fix Disk Space Issues**
1. Free up disk space on download drive
2. Change download location to drive with more space
3. Configure qBittorrent to pause on low disk space

**✅ Permission Issues**
```bash
# Fix download directory permissions
chmod 755 /path/to/download/directory
chown user:group /path/to/download/directory
```

**✅ Invalid Torrent Links**
- Some torrent links may be broken or expired
- Try different torrent from same site
- Check if magnet link is complete

### "Torrent File Too Large" Error

#### Symptoms
- Error specifically for .torrent file downloads
- Magnet links work but .torrent files fail

#### Solutions

**✅ File Size Limits**
- Extension limits .torrent files to 10MB for security
- This should be sufficient for normal torrents
- Contact support if legitimate torrent exceeds limit

**✅ Use Magnet Links Instead**
- Prefer magnet links over .torrent files
- Magnet links have no size restrictions
- Usually more reliable and secure

## Browser-Specific Issues

### Chrome/Edge Issues

#### "Extension Disabled" Error
```
Extensions cannot be loaded from the developer folder
```

**Solutions:**
1. **Enable Developer Mode**
   - Go to `chrome://extensions/`
   - Toggle "Developer mode" on
   - Reload extension

2. **Corporate/Enterprise Restrictions**
   - Check with IT department
   - May need administrative approval
   - Consider using Firefox as alternative

#### "Incognito Mode Not Working"
**Solutions:**
1. **Enable Incognito Access**
   - Go to `chrome://extensions/`
   - Find qBittorrent extension
   - Click "Details"
   - Enable "Allow in incognito"

### Firefox Issues

#### "Temporary Add-on Removed"
**Solutions:**
1. **Permanent Installation**
   - Extension needs to be signed for permanent installation
   - Reload temporary add-on after Firefox restart

2. **Developer Edition**
   - Use Firefox Developer Edition
   - Allows unsigned extensions permanently

#### "Enhanced Tracking Protection" Blocking
**Solutions:**
1. **Disable for Torrent Sites**
   - Click shield icon in address bar
   - Turn off protection for specific sites

2. **Configure Exceptions**
   - Add torrent sites to protection exceptions
   - Maintain security on other sites

## Performance Issues

### High CPU Usage

#### Symptoms
- Browser becomes slow when extension active
- Fan noise increase
- High CPU usage in task manager

#### Diagnostic Steps

1. **Identify Heavy Pages**
   - Check which tabs cause high CPU
   - Look for JavaScript-heavy torrent sites

2. **Monitor Extension Performance**
   ```javascript
   // Open extension service worker console
   // Check for repeated error messages
   console.log('Extension performance check');
   ```

#### Solutions

**✅ Disable Dynamic Scanning**
1. Open extension options
2. Uncheck **"Scan dynamic content"**
3. Use manual refresh instead

**✅ Reduce Scan Frequency**
- Extension scans every 5 seconds by default
- Modification requires code changes
- Contact developers for custom intervals

**✅ Site Blacklisting**
```
# Add CPU-heavy sites to blacklist
heavy-javascript-site.com
problematic-torrent-site.org
```

### Memory Leaks

#### Symptoms
- Browser memory usage increases over time
- Browser becomes unresponsive
- Need to restart browser frequently

#### Solutions

**✅ Regular Browser Restart**
- Restart browser daily
- Clear cache and cookies regularly

**✅ Update Extension**
- Check for extension updates
- Memory leak fixes included in updates

**✅ Disable on Heavy Sites**
- Use site blacklist for problematic sites
- Enable only on trusted torrent sites

## Debug Mode

### Enabling Debug Mode

1. **Open Extension Options**
2. **Go to Advanced Settings**
3. **Enable "Debug Logging"**
4. **Save Settings**

### Viewing Debug Logs

#### Service Worker Console
1. Go to `chrome://extensions/`
2. Find qBittorrent extension
3. Click "Inspect views: service worker"
4. Check Console tab for detailed logs

#### Content Script Console
1. Open Developer Tools on any webpage (F12)
2. Go to Console tab
3. Look for extension-related messages

### Debug Information to Collect

```javascript
// Debug information checklist
const debugInfo = {
    extensionVersion: '1.0.0',
    browserVersion: navigator.userAgent,
    qbittorrentVersion: 'from connection test',
    operatingSystem: navigator.platform,
    connectionSettings: {
        serverUrl: 'http://localhost:8080',
        useHttps: false,
        timeout: 30
    },
    lastError: 'detailed error message',
    reproduction: 'step-by-step instructions'
};
```

## Log Collection

### Automatic Log Collection

The extension automatically logs important events:

- Connection attempts and results
- Torrent detection events
- Error conditions
- Performance metrics

### Manual Log Collection

1. **Enable Debug Mode** (see above)
2. **Reproduce the Issue**
3. **Collect Logs**:
   - Service worker console
   - Content script console
   - Browser error console
   - qBittorrent logs

### Log Privacy

- Logs contain no personal information
- Torrent URLs are truncated for privacy
- Server credentials are never logged
- Safe to share for support purposes

## Getting Support

### Before Contacting Support

1. **Check this troubleshooting guide**
2. **Search existing GitHub issues**
3. **Try basic diagnostic steps**
4. **Collect debug information**

### Reporting Issues

#### GitHub Issues
1. Go to [GitHub Issues](https://github.com/DevLabs-ZA/qbittorrent-extension/issues)
2. Search for existing similar issues
3. Create new issue with template

#### Issue Template
```markdown
**Environment:**
- Browser: Chrome 120.0.6099.109
- Extension Version: 1.0.0
- qBittorrent Version: 4.5.0
- Operating System: Windows 11

**Description:**
Clear description of the issue

**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Debug Logs:**
(Paste relevant debug logs here)

**Screenshots:**
(If applicable)
```

### Community Support

- **GitHub Discussions**: General questions and community help
- **Reddit**: r/qBittorrent community
- **Discord**: qBittorrent community servers

### Professional Support

For enterprise users or complex issues:
- Email: support@devlabs-za.com
- Include complete debug information
- Specify business requirements

### Security Issues

For security-related issues:
- **DO NOT** create public GitHub issues
- Email: security@devlabs-za.com
- Include detailed vulnerability information
- Allow time for coordinated disclosure

## Common Error Messages

### Complete Error Reference

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Connection failed" | qBittorrent Web UI not accessible | Check qBittorrent configuration |
| "Authentication failed" | Invalid credentials | Verify username/password |
| "Rate limit exceeded" | Too many requests | Wait and try again |
| "Invalid torrent URL" | Malformed magnet/torrent link | Check link format |
| "Server error occurred" | qBittorrent internal error | Check qBittorrent logs |
| "Torrent file too large" | .torrent file exceeds 10MB | Use magnet link instead |
| "No torrents detected" | No valid torrents on page | Check site whitelist/blacklist |

### HTTP Status Codes

| Status Code | Meaning | Solution |
|-------------|---------|----------|
| 200 | Success | No action needed |
| 401 | Unauthorized | Check authentication |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Check server URL |
| 500 | Server Error | Check qBittorrent status |
| 503 | Service Unavailable | qBittorrent overloaded |

---

This troubleshooting guide covers the most common issues users encounter. If your issue isn't covered here, please check the other documentation files or contact support.