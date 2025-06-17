# Security Testing Guide

This guide provides comprehensive instructions for testing the security measures implemented in the qBittorrent Web Integration browser extension.

## Pre-Testing Setup

### Required Tools:
- Chrome/Firefox Developer Tools
- Burp Suite or OWASP ZAP (for advanced testing)
- Text editor for crafting payloads
- Network monitoring tools

### Test Environment:
- Clean browser profile for testing
- Test qBittorrent instance (isolated from production)
- Various test websites for injection testing

## 1. Cross-Site Scripting (XSS) Testing

### Test Cases:

#### DOM-based XSS Prevention
```javascript
// Test payloads to inject into torrent names/descriptions
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
javascript:alert('XSS')
<svg onload=alert('XSS')>
```

#### Test Procedure:
1. Visit test pages with malicious torrent links containing XSS payloads
2. Check if extension indicators are properly escaped
3. Verify no script execution occurs
4. Test all input fields in options page

#### Expected Results:
- No script execution
- Payloads displayed as plain text
- Extension functions normally

### Content Script Injection Testing:
1. Test extension behavior on malicious websites
2. Verify content scripts don't execute untrusted code
3. Check DOM manipulation security

## 2. Input Validation Testing

### URL Validation Tests:
```javascript
// Invalid URLs to test
"javascript:alert('xss')"
"data:text/html,<script>alert('xss')</script>"
"file:///etc/passwd"
"http://127.0.0.1:22"  // Invalid port for torrent
"ftp://malicious.com/file.torrent"
```

### Magnet Link Validation:
```javascript
// Invalid magnet links
"magnet:?xt=urn:btih:invalid_hash"
"magnet:?xt=urn:btih:" + "x".repeat(100)  // Too long
"magnet:javascript:alert('xss')"
```

### Form Input Testing:
1. Test all form fields with:
   - Extremely long strings (>10000 chars)
   - Special characters: `<>'"&\0\n\r`
   - SQL injection payloads
   - Path traversal: `../../etc/passwd`
   - Unicode and encoding attacks

#### Test Procedure:
1. Open extension options
2. Input malicious payloads in each field
3. Attempt to save settings
4. Verify validation errors are shown
5. Check that no malicious data is stored

## 3. Authentication Security Testing

### Session Management:
1. Test authentication timeout (should be 30 minutes)
2. Verify credentials are not stored in plain text
3. Test session persistence across browser restarts

### Credential Storage Testing:
```javascript
// Check browser storage
chrome.storage.sync.get(null, (data) => {
    console.log('Sync storage:', data);
});

chrome.storage.local.get(null, (data) => {
    console.log('Local storage:', data);
});
```

#### Expected Results:
- No plain text passwords in storage
- Encrypted data in local storage
- Proper key management

### Authentication Bypass Testing:
1. Attempt to access qBittorrent API without authentication
2. Test with invalid credentials
3. Test session manipulation

## 4. Permission and Access Control Testing

### Permission Scope Testing:
1. Verify extension only requests necessary permissions
2. Test that extension doesn't access arbitrary websites
3. Check activeTab permission usage

### Network Access Testing:
1. Monitor network requests from extension
2. Verify no unexpected outbound connections
3. Test that only qBittorrent server is contacted

#### Tools:
```bash
# Monitor network activity
netstat -an | grep :8080
# or use browser dev tools Network tab
```

## 5. Rate Limiting Testing

### API Rate Limit Testing:
```javascript
// Rapid-fire requests test
for (let i = 0; i < 25; i++) {
    chrome.runtime.sendMessage({
        action: 'SEND_TORRENT',
        url: 'magnet:?xt=urn:btih:' + 'a'.repeat(40)
    });
}
```

#### Expected Results:
- Requests should be limited after 20 per minute
- Rate limit error messages should appear
- Extension should remain functional

## 6. File Upload Security Testing

### Malicious File Testing:
1. Create oversized torrent files (>10MB)
2. Test with invalid torrent file formats
3. Attempt file path traversal in torrent names

#### Test Files:
- Extremely large files
- Files with malicious names: `../../malicious.torrent`
- Non-torrent files with .torrent extension

## 7. Content Security Policy Testing

### CSP Violation Testing:
1. Attempt to inject inline scripts in extension pages
2. Try to load external resources
3. Test object embedding

#### Browser Console Tests:
```javascript
// These should fail due to CSP
eval('alert("CSP bypass")');
document.body.innerHTML = '<script>alert("XSS")</script>';
```

## 8. Error Handling Testing

### Information Disclosure Testing:
1. Test with invalid server configurations
2. Cause network errors and check error messages
3. Test authentication failures

#### Expected Results:
- Generic error messages only
- No stack traces or internal details exposed
- No sensitive information in console logs

## 9. Cryptographic Security Testing

### Encryption Testing:
```javascript
// Test encryption/decryption
// (This requires access to extension internals)
const testData = "test credentials";
// Verify encryption produces different output each time
// Verify decryption works correctly
// Test with various data sizes
```

### Key Management Testing:
1. Verify keys are generated securely
2. Test key storage and retrieval
3. Verify keys are not exposed

## 10. Browser Extension Specific Testing

### Manifest Security:
1. Review manifest.json for security issues
2. Check permission declarations
3. Verify CSP configuration

### Service Worker Testing:
1. Test service worker isolation
2. Verify no persistent data storage in service worker
3. Test message passing security

## 11. Integration Testing

### End-to-End Security Testing:
1. Complete user workflow with security monitoring
2. Test extension behavior on various websites
3. Verify secure communication with qBittorrent

### Cross-Browser Testing:
1. Test security measures in Chrome
2. Test in Firefox (if supported)
3. Verify consistent security behavior

## Automated Security Testing

### ESLint Security Rules:
```bash
npm run lint  # Check for security issues
```

### Dependency Security Scanning:
```bash
npm audit  # Check for vulnerable dependencies
```

## Security Test Reporting

### Test Documentation:
For each test:
1. Document test procedure
2. Record expected vs actual results
3. Note any security findings
4. Provide remediation recommendations

### Security Finding Severity:
- **Critical**: Remote code execution, credential exposure
- **High**: Authentication bypass, privilege escalation
- **Medium**: Information disclosure, input validation bypass
- **Low**: Error handling issues, minor information leaks

## Continuous Security Testing

### Regular Testing Schedule:
- Run security tests before each release
- Perform monthly security reviews
- Test after any security-related code changes

### Automated Integration:
- Include security tests in CI/CD pipeline
- Automated dependency scanning
- Regular security linting

## Emergency Response Testing

### Incident Simulation:
1. Simulate security breach scenarios
2. Test incident response procedures
3. Verify security update deployment process

## Compliance Testing

### OWASP Top 10 Verification:
- Test against each OWASP vulnerability category
- Document compliance status
- Regular compliance reviews

This testing guide should be used regularly to ensure the extension maintains its security posture and protects users from evolving threats.