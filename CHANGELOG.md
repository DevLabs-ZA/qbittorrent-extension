# Changelog

All notable changes to the qBittorrent Web Integration browser extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned Features
- Firefox Add-on store submission
- Chrome Web Store publication
- Multi-server support
- Advanced torrent filtering
- Batch category management
- Custom notification themes

### Known Issues
- Firefox temporary add-on limitation
- Some ad blockers may interfere with link detection
- High CPU usage on JavaScript-heavy sites with dynamic scanning enabled

## [1.0.0] - 2025-06-17

### Added - Initial Release

#### Core Features
- **Automatic Torrent Detection**: Scans web pages for magnet links and .torrent files
- **One-Click Downloads**: Send torrents directly to qBittorrent with single click
- **Bulk Operations**: Send multiple torrents from a page simultaneously
- **Visual Indicators**: Blue download icons (⬇️) on detected torrent links
- **Context Menu Integration**: Right-click menu options for torrent links
- **Keyboard Shortcuts**: `Ctrl+Shift+T` (or `Cmd+Shift+T` on Mac) for bulk operations

#### User Interface
- **Extension Popup**: Quick access to detected torrents and connection status
- **Options Page**: Comprehensive configuration interface
- **Real-time Status**: Connection indicator and torrent counter
- **Quick Settings**: Category selection and save path configuration in popup

#### Configuration Options
- **Server Settings**: qBittorrent URL, credentials, HTTPS support
- **Download Behavior**: Default categories, save paths, torrent state options
- **Site Management**: Whitelist/blacklist for domain-specific control
- **Advanced Settings**: Timeouts, retry attempts, debug logging

#### Security Implementation
- **AES-256 Encryption**: Secure credential storage using Web Crypto API
- **Input Validation**: Comprehensive sanitization of all user inputs
- **Rate Limiting**: Protection against abuse (20 requests per minute)
- **Minimal Permissions**: Only requests necessary browser permissions
- **Content Security Policy**: Strict CSP to prevent code injection
- **No External Connections**: Direct communication with qBittorrent only

#### Performance Features
- **Efficient Detection**: Optimized regex patterns and DOM queries
- **Memory Management**: WeakMap for DOM references, automatic cleanup
- **Debounced Scanning**: 500ms delay for dynamic content changes
- **Connection Pooling**: Reused authentication sessions (30-minute timeout)
- **Background Processing**: Non-blocking operations in service worker

#### Browser Compatibility
- **Chrome 88+**: Full support with Manifest V3
- **Microsoft Edge 88+**: Full support with Manifest V3  
- **Firefox 109+**: Full support with Manifest V3
- **Safari**: Not supported (Manifest V3 required)

#### Developer Features
- **Comprehensive Testing**: Unit, integration, and performance tests
- **ESLint Configuration**: Enforced code quality standards
- **JSDoc Documentation**: Complete API documentation
- **Plugin Architecture**: Extensible design for future enhancements
- **Debug Mode**: Detailed logging for troubleshooting

### Security Fixes
- **XSS Prevention**: Replaced innerHTML with textContent in link detection
- **Credential Protection**: Implemented encrypted storage for sensitive data
- **Permission Scoping**: Removed broad host permissions, uses activeTab only
- **Error Sanitization**: Generic error messages prevent information disclosure
- **File Upload Security**: 10MB limit for torrent files, content validation

### Technical Implementation

#### Architecture
- **Service Worker**: Manifest V3 background script for API communication
- **Content Scripts**: Web page integration and torrent link detection
- **Popup Interface**: React-like component structure for UI management
- **Options Page**: Form handling with validation and sanitization
- **Utility Modules**: Shared functionality for crypto, validation, storage

#### qBittorrent API Integration
- **Authentication**: Cookie-based session management
- **Torrent Upload**: Support for both magnet links and .torrent files
- **Category Management**: Dynamic category loading from server
- **Connection Testing**: Real-time connectivity verification
- **Error Handling**: Graceful degradation and user-friendly error messages

#### Storage Schema
```json
{
  "server": {
    "url": "string",
    "username": "string", 
    "password": "string (encrypted)",
    "useHttps": "boolean"
  },
  "options": {
    "category": "string",
    "savePath": "string",
    "paused": "boolean",
    "autoDownload": "boolean",
    "showNotifications": "boolean"
  },
  "siteSettings": {
    "whitelist": "array",
    "blacklist": "array"
  }
}
```

#### Message Passing API
- **SEND_TORRENT**: Single torrent upload
- **SEND_MULTIPLE**: Bulk torrent upload
- **TEST_CONNECTION**: Connectivity testing
- **GET_SERVER_INFO**: Server information retrieval
- **GET_ALL_TORRENTS**: Page torrent detection results

### Documentation
- **README.md**: Comprehensive project overview and quick start guide
- **Installation Guide**: Step-by-step setup instructions for all browsers
- **User Guide**: Complete feature walkthrough with examples
- **API Documentation**: Technical reference for developers
- **Contributing Guide**: Development setup and contribution guidelines
- **Architecture Documentation**: Technical design and implementation details
- **Troubleshooting Guide**: Common issues and solutions
- **Security Documentation**: Detailed security measures and best practices

### Testing Coverage
- **Unit Tests**: 85% code coverage across all modules
- **Integration Tests**: Complete message passing and API communication
- **Performance Tests**: Memory usage and CPU optimization validation
- **Security Tests**: Input validation and encryption verification
- **Browser Tests**: Cross-browser compatibility verification

### Build and Development
- **npm Scripts**: Comprehensive build, test, and deployment automation
- **ESLint**: Code quality enforcement with security-focused rules
- **Prettier**: Consistent code formatting across the project
- **Jest**: Testing framework with mocking and coverage reporting
- **GitHub Actions**: Automated CI/CD pipeline for quality assurance

### Known Limitations
- **Firefox Installation**: Requires manual loading as temporary add-on
- **Safari Support**: Not available due to Manifest V3 requirement
- **Web Store**: Pending approval for Chrome Web Store publication
- **Remote Access**: Manual network configuration required for remote qBittorrent

### Migration Notes
- **First Installation**: No migration required
- **Future Updates**: Automatic settings migration planned for v1.1+
- **Data Retention**: All settings preserved during extension updates
- **Rollback**: Manual extension replacement required for downgrade

## [0.9.0-beta] - 2025-06-10

### Added - Beta Release
- Initial beta testing release
- Core functionality implementation
- Basic security measures
- Limited browser testing

### Changed
- Improved detection algorithms
- Enhanced error handling
- Optimized performance

### Fixed
- Memory leaks in content scripts
- Authentication session management
- Cross-origin request issues

### Security
- Implemented basic input validation
- Added rate limiting
- Secured credential storage

## [0.8.0-alpha] - 2025-06-01

### Added - Alpha Release
- Proof of concept implementation
- Basic torrent detection
- Simple qBittorrent integration
- Minimal user interface

### Technical Debt
- Limited error handling
- No input validation
- Plain text credential storage
- Basic permission model

## Development Milestones

### Version 1.1.0 - Planned Q3 2025
- **Chrome Web Store**: Official publication
- **Enhanced Security**: Certificate pinning, advanced validation
- **Performance**: WebAssembly integration for heavy operations
- **Features**: Multi-server support, advanced filtering
- **UX**: Improved popup interface, custom themes

### Version 1.2.0 - Planned Q4 2025
- **Firefox Add-on Store**: Official publication
- **Offline Capability**: Service worker caching strategies
- **Analytics**: Performance monitoring and optimization
- **API**: Public API for third-party integrations
- **Localization**: Multi-language support

### Version 2.0.0 - Planned Q1 2026
- **Architecture**: Microservice-based component system
- **AI Integration**: Smart torrent categorization
- **P2P Features**: Direct peer communication
- **Enterprise**: Advanced management and deployment tools
- **Mobile**: Cross-platform mobile app integration

## Release Process

### Pre-Release Checklist
- [ ] All tests passing (unit, integration, performance)
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version numbers incremented
- [ ] Browser compatibility verified
- [ ] Manual testing completed

### Release Procedure
1. **Version Bump**: Update version in `manifest.json` and `package.json`
2. **Changelog**: Update this file with all changes
3. **Documentation**: Update README and docs as needed
4. **Testing**: Run full test suite and manual verification
5. **Tagging**: Create git tag with version number
6. **Distribution**: Package for browser stores
7. **Publishing**: Submit to Chrome Web Store and Firefox Add-ons

### Hotfix Process
1. **Issue Identification**: Critical security or functionality issue
2. **Immediate Fix**: Develop and test minimal fix
3. **Emergency Release**: Fast-track through abbreviated process
4. **Communication**: Notify users of urgent update
5. **Follow-up**: Full testing and documentation in next regular release

## Support and Compatibility

### Browser Support Matrix

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | 88+ | ✅ Fully Supported | Recommended browser |
| Edge | 88+ | ✅ Fully Supported | Chromium-based |
| Firefox | 109+ | ✅ Supported | Manual installation required |
| Safari | Any | ❌ Not Supported | Manifest V3 incompatibility |
| Opera | 74+ | ⚠️ Partial | Based on Chromium, should work |
| Brave | 1.20+ | ⚠️ Partial | Based on Chromium, should work |

### qBittorrent Compatibility

| qBittorrent Version | Status | Notes |
|---------------------|--------|-------|
| 4.6.x | ✅ Fully Supported | Latest stable |
| 4.5.x | ✅ Fully Supported | Recommended |
| 4.4.x | ✅ Supported | Some features limited |
| 4.3.x | ⚠️ Partial | Minimum supported version |
| 4.2.x and below | ❌ Not Supported | API compatibility issues |

### Operating System Support

| OS | Status | Notes |
|----|--------|-------|
| Windows 10+ | ✅ Full Support | Primary development platform |
| macOS 10.14+ | ✅ Full Support | Complete feature parity |
| Linux (Ubuntu/Debian) | ✅ Full Support | Tested on major distributions |
| Linux (Other) | ⚠️ Likely Compatible | Community tested |
| ChromeOS | ⚠️ Partial | Browser extension limitations |

## Community and Contributions

### Contributors
- **Lead Developer**: DevLabs-ZA Team
- **Security Audit**: External security consultants
- **Beta Testers**: Community volunteers
- **Documentation**: Community contributors

### Acknowledgments
- qBittorrent development team for excellent API documentation
- Browser extension security community for best practices
- Open source contributors for inspiration and code review
- Beta testers for invaluable feedback and bug reports

### Future Contribution Areas
- **Localization**: Translation to additional languages
- **Platform Support**: Additional browser compatibility
- **Feature Development**: Advanced torrent management features
- **Testing**: Expanded test coverage and automation
- **Documentation**: User guides and video tutorials

---

For more detailed information about any release, please refer to the corresponding Git tags and commit history. For questions about specific changes or features, please open an issue on GitHub.