# Contributing Guide

Thank you for your interest in contributing to the qBittorrent Web Integration browser extension! This guide will help you get started with development and contribution.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Code Style and Standards](#code-style-and-standards)
4. [Testing Requirements](#testing-requirements)
5. [Pull Request Process](#pull-request-process)
6. [Issue Reporting](#issue-reporting)
7. [Security Vulnerability Reporting](#security-vulnerability-reporting)
8. [Development Workflow](#development-workflow)
9. [Code Review Guidelines](#code-review-guidelines)

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js**: Version 16 or higher
- **npm**: Version 8 or higher
- **Git**: For version control
- **Browser**: Chrome, Firefox, or Edge for testing
- **qBittorrent**: For local testing

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/qbittorrent-extension.git
   cd qbittorrent-extension
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/DevLabs-ZA/qbittorrent-extension.git
   ```

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Development Environment

The project uses several development tools:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=__tests__/unit",
    "test:integration": "jest --testPathPattern=__tests__/integration",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "build": "npm run security:check && npm run format && npm run test:ci"
  }
}
```

### 3. Load Extension in Browser

#### Chrome/Edge Development
1. Open `chrome://extensions/` (or `edge://extensions/`)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the project directory

#### Firefox Development
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` from the project directory

### 4. Set Up qBittorrent

1. Install qBittorrent desktop application
2. Enable Web UI in settings
3. Configure authentication (username: admin, password: your-choice)
4. Test connection at `http://localhost:8080`

## Code Style and Standards

### JavaScript Style Guide

We follow modern JavaScript best practices:

```javascript
// ✅ Good
const torrentUrl = 'magnet:?xt=urn:btih:...';
const options = {
    category: 'movies',
    paused: false
};

async function sendTorrent(url, options = {}) {
    try {
        const result = await apiClient.addTorrent(url, options);
        return { success: true, result };
    } catch (error) {
        console.error('Failed to send torrent:', error);
        throw new Error('Torrent sending failed');
    }
}

// ❌ Bad
var torrentUrl = 'magnet:?xt=urn:btih:...';
var options = {
  category: 'movies',
  paused: false
};

function sendTorrent(url, options, callback) {
    apiClient.addTorrent(url, options, function(error, result) {
        if (error) {
            callback(error);
        } else {
            callback(null, result);
        }
    });
}
```

### ESLint Configuration

Our ESLint configuration enforces:

```javascript
// eslint.config.mjs
export default [
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                chrome: 'readonly',
                console: 'readonly',
                fetch: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': 'error',
            'no-console': 'warn',
            'prefer-const': 'error',
            'no-var': 'error',
            'semi': ['error', 'always'],
            'quotes': ['error', 'single']
        }
    }
];
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `torrentUrl`, `connectionStatus` |
| Functions | camelCase | `sendTorrent()`, `testConnection()` |
| Classes | PascalCase | `TorrentLinkDetector`, `StorageManager` |
| Constants | UPPER_SNAKE_CASE | `API_ENDPOINTS`, `DEFAULT_TIMEOUT` |
| Files | kebab-case | `api-client.js`, `link-detector.js` |

### Documentation Standards

All functions must include JSDoc comments:

```javascript
/**
 * Sends a torrent to qBittorrent server
 * @param {string} torrentUrl - Magnet link or .torrent file URL
 * @param {object} options - Download options
 * @param {string} [options.category] - Torrent category
 * @param {string} [options.savePath] - Download path
 * @param {boolean} [options.paused=false] - Start paused
 * @returns {Promise<object>} Result object with success status
 * @throws {Error} When torrent URL is invalid or server unreachable
 * @example
 * const result = await sendTorrent('magnet:?xt=...', { category: 'movies' });
 * console.log(result.success); // true
 */
async function sendTorrent(torrentUrl, options = {}) {
    // Implementation...
}
```

## Testing Requirements

### Test Structure

```
__tests__/
├── unit/                    # Unit tests
│   ├── background/         # Service worker tests
│   ├── content/           # Content script tests
│   ├── popup/             # Popup tests
│   └── utils/             # Utility tests
├── integration/           # Integration tests
├── performance/          # Performance tests
├── setup/               # Test configuration
└── utils/               # Test utilities
```

### Writing Tests

#### Unit Tests

```javascript
// __tests__/unit/utils/validation.test.js
import { InputValidator } from '../../../utils/validation.js';

describe('InputValidator', () => {
    describe('validateServerUrl', () => {
        it('should validate correct HTTP URL', () => {
            const result = InputValidator.validateServerUrl('http://localhost:8080');
            expect(result.valid).toBe(true);
            expect(result.sanitized).toBe('http://localhost:8080');
        });

        it('should reject invalid URL format', () => {
            const result = InputValidator.validateServerUrl('invalid-url');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Invalid server URL format');
        });

        it('should reject invalid port numbers', () => {
            const result = InputValidator.validateServerUrl('http://localhost:99999');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Invalid port number');
        });
    });
});
```

#### Integration Tests

```javascript
// __tests__/integration/extension-communication.test.js
describe('Extension Communication', () => {
    beforeEach(() => {
        // Set up mock Chrome APIs
        chrome.runtime.sendMessage.mockClear();
        chrome.tabs.sendMessage.mockClear();
    });

    it('should send torrent from content script to background', async () => {
        const mockResponse = { success: true, result: { name: 'Test Torrent' } };
        chrome.runtime.sendMessage.mockImplementation((message, callback) => {
            callback(mockResponse);
        });

        const result = await sendTorrentMessage('magnet:?xt=...');
        
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
            action: 'SEND_TORRENT',
            url: 'magnet:?xt=...'
        });
        expect(result).toEqual(mockResponse);
    });
});
```

### Test Requirements

- **Coverage**: Minimum 80% code coverage
- **Unit Tests**: All utility functions and classes
- **Integration Tests**: Message passing between components
- **Security Tests**: Input validation and sanitization
- **Performance Tests**: Critical path performance

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:performance

# Watch mode for development
npm run test:watch
```

## Pull Request Process

### Before Submitting

1. **Sync with upstream**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Run pre-commit checks**:
   ```bash
   npm run lint
   npm run format
   npm run test:ci
   ```

### Pull Request Template

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] All tests pass

## Checklist
- [ ] Code follows the project's style guidelines
- [ ] Self-review of the code completed
- [ ] Code is commented, particularly in hard-to-understand areas
- [ ] Corresponding documentation updated
- [ ] No new warnings or errors introduced

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Additional Notes
Any additional information that would be helpful for reviewers.
```

### Review Process

1. **Automated Checks**: GitHub Actions run tests and linting
2. **Code Review**: At least one maintainer review required
3. **Testing**: Reviewer tests functionality manually
4. **Approval**: Approval from maintainer required for merge

## Issue Reporting

### Bug Reports

Use the bug report template:

```markdown
**Bug Description**
A clear and concise description of what the bug is.

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
- Browser: [e.g. Chrome 120]
- Extension Version: [e.g. 1.0.0]
- qBittorrent Version: [e.g. 4.5.0]
- OS: [e.g. Windows 11]

**Additional Context**
Add any other context about the problem here.
```

### Feature Requests

Use the feature request template:

```markdown
**Is your feature request related to a problem?**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## Security Vulnerability Reporting

**DO NOT** report security vulnerabilities in public issues.

Instead:

1. **Email**: Send details to security@devlabs-za.com
2. **Include**:
   - Detailed description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)
3. **Response**: We'll acknowledge within 48 hours
4. **Disclosure**: Coordinated disclosure after fix is released

## Development Workflow

### Git Workflow

We use Git Flow with the following branches:

- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/***: Feature development branches
- **hotfix/***: Critical bug fixes
- **release/***: Release preparation branches

### Commit Messages

Follow conventional commits format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

Examples:
```
feat(popup): add torrent category selection
fix(content): resolve memory leak in link detector
docs(api): update authentication documentation
test(validation): add input sanitization tests
```

### Release Process

1. **Create release branch**:
   ```bash
   git checkout -b release/1.1.0
   ```

2. **Update version numbers**:
   - `package.json`
   - `manifest.json`
   - `CHANGELOG.md`

3. **Run full test suite**:
   ```bash
   npm run build
   ```

4. **Create pull request** to main branch
5. **Tag release** after merge:
   ```bash
   git tag -a v1.1.0 -m "Release version 1.1.0"
   ```

## Code Review Guidelines

### For Contributors

- **Small PRs**: Keep changes focused and atomic
- **Clear Description**: Explain what and why, not just how
- **Self-Review**: Review your own code before submitting
- **Tests**: Include relevant tests with your changes
- **Documentation**: Update docs for user-facing changes

### For Reviewers

- **Constructive Feedback**: Provide specific, actionable suggestions
- **Code Quality**: Check for maintainability and readability
- **Security**: Review for potential security issues
- **Performance**: Consider impact on extension performance
- **User Experience**: Evaluate user-facing changes

### Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests are comprehensive and pass
- [ ] Documentation is updated
- [ ] Security considerations addressed
- [ ] Performance impact assessed
- [ ] Browser compatibility verified
- [ ] No breaking changes (or properly documented)

## Development Tools

### Recommended IDE Setup

**Visual Studio Code Extensions:**
- ESLint
- Prettier
- Jest
- Chrome Debugger
- GitLens

**Settings:**
```json
{
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "eslint.autoFixOnSave": true,
    "jest.autoEnable": true
}
```

### Debugging

#### Chrome DevTools
1. Open extension popup
2. Right-click → "Inspect"
3. Use console and debugger

#### Service Worker Debugging
1. Go to `chrome://extensions/`
2. Click "Inspect views: service worker"
3. Use DevTools for background script

#### Content Script Debugging
1. Open web page with extension active
2. Press F12 for DevTools
3. Content script appears in Sources tab

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment:

- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome newcomers and diverse perspectives
- **Be collaborative**: Work together constructively
- **Be patient**: Help others learn and grow
- **Be professional**: Maintain professional communication

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and community discussion
- **Pull Requests**: Code review and technical discussion

## Getting Help

### Documentation
- **User Guide**: [`docs/USER_GUIDE.md`](USER_GUIDE.md)
- **API Documentation**: [`docs/API.md`](API.md)
- **Installation Guide**: [`docs/INSTALLATION.md`](INSTALLATION.md)

### Community Support
- **GitHub Discussions**: Ask questions and share ideas
- **Stack Overflow**: Use tag `qbittorrent-extension`
- **IRC**: #qbittorrent-extension on Libera.Chat

### Maintainer Contact
- **General**: Open an issue on GitHub
- **Security**: security@devlabs-za.com
- **Urgent**: Create issue with "urgent" label

## Recognition

Contributors will be recognized in:
- **CONTRIBUTORS.md**: List of all contributors
- **Release Notes**: Acknowledgment of significant contributions
- **README.md**: Special thanks section

## License

By contributing to this project, you agree that your contributions will be licensed under the ISC License.

---

Thank you for contributing to the qBittorrent Web Integration extension! Your help makes this project better for everyone.