# qBittorrent Browser Extension - Testing Documentation

This directory contains the comprehensive test suite for the qBittorrent browser extension, ensuring high code quality, security, and performance.

## Test Structure

```text
__tests__/
├── setup/                  # Test configuration and setup files
│   └── jest.setup.js      # Global test setup and mocks
├── unit/                  # Unit tests for individual modules
│   ├── background/        # Background script tests
│   ├── content/           # Content script tests
│   └── utils/             # Utility function tests
├── integration/           # Integration tests
│   └── extension-communication.test.js
├── performance/           # Performance and load tests
│   └── extension-performance.test.js
└── __mocks__/             # Mock implementations
    └── chrome.js          # Chrome extension API mocks
```

## Test Categories

### 1. Unit Tests (`__tests__/unit/`)

**Coverage:** Individual functions and modules
**Purpose:** Verify that each component works correctly in isolation

#### Background Scripts Tests

- **API Client** (`background/api-client.test.js`)
  - Authentication flow testing
  - API endpoint calls (login, torrent management)
  - Error handling and retry mechanisms
  - Rate limiting compliance

#### Content Scripts Tests

- **Link Detector** (`content/link-detector.test.js`)
  - Magnet link detection algorithms
  - Torrent file URL validation
  - DOM manipulation safety
  - Name extraction from URLs

#### Utility Tests

- **Validation** (`utils/validation.test.js`)
  - Input sanitization functions
  - URL validation
  - Form data validation
  - Rate limiting functionality

- **Crypto** (`utils/crypto.test.js`)
  - Encryption/decryption operations
  - Key generation and management
  - Secure storage functionality
  - Password-based key derivation

### 2. Integration Tests (`__tests__/integration/`)

**Coverage:** Component interactions and message passing
**Purpose:** Verify that different parts of the extension work together correctly

- Extension component communication
- Background ↔ Content script messaging
- Popup ↔ Background script interaction
- Storage synchronization between components
- Context menu integration
- End-to-end workflow testing

### 3. Performance Tests (`__tests__/performance/`)

**Coverage:** Memory usage, speed, and resource consumption
**Purpose:** Ensure the extension performs efficiently under various loads

- Memory usage monitoring
- Startup performance benchmarks
- Bulk operation efficiency
- DOM manipulation performance
- Network request optimization
- Resource cleanup verification

## Running Tests

### Prerequisites

Ensure you have the required dependencies installed:

```bash
npm install
```

### Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test categories
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:performance # Performance tests only

# Run tests for CI/CD (no watch, with coverage)
npm run test:ci
```

### Coverage Reports

The test suite generates comprehensive coverage reports:

- **HTML Report:** `coverage/index.html` - Interactive coverage browser
- **LCOV Report:** `coverage/lcov.info` - For CI/CD integration
- **JSON Summary:** `coverage/coverage-summary.json` - For automated processing

### Coverage Thresholds

The project maintains high coverage standards:

- **Global Coverage:** 85% minimum for branches, functions, lines, and statements
- **Utils Directory:** 90% minimum (critical utility functions)
- **Background Directory:** 80% minimum (complex async operations)

## Writing Tests

### Test Structure Guidelines

Follow the **AAA Pattern** (Arrange, Act, Assert):

```javascript
describe('ComponentName', () => {
  let mockDependency;

  beforeEach(() => {
    // Arrange: Set up test data and mocks
    mockDependency = jest.fn();
  });

  it('should perform expected behavior', () => {
    // Arrange: Prepare test-specific data
    const input = 'test-input';
    
    // Act: Execute the functionality
    const result = functionUnderTest(input);
    
    // Assert: Verify the outcome
    expect(result).toBe('expected-output');
    expect(mockDependency).toHaveBeenCalledWith(input);
  });
});
```

### Testing Best Practices

#### 1. **Descriptive Test Names**

```javascript
// Good
it('should extract torrent name from magnet URL with display name')

// Bad
it('should work')
```

#### 2. **Proper Test Isolation**

```javascript
beforeEach(() => {
  jest.clearAllMocks();
  // Reset any global state
});
```

#### 3. **Meaningful Assertions**

```javascript
// Good
expect(result).toEqual({
  success: true,
  torrentName: 'Expected Movie Title'
});

// Bad
expect(result).toBeTruthy();
```

#### 4. **Edge Case Coverage**

```javascript
describe('URL validation', () => {
  it('should handle valid URLs', () => { /* ... */ });
  it('should reject malformed URLs', () => { /* ... */ });
  it('should handle empty input', () => { /* ... */ });
  it('should handle extremely long URLs', () => { /* ... */ });
});
```

#### 5. **Async Testing**

```javascript
it('should handle API calls correctly', async () => {
  mockFetch.mockResolvedValue({ ok: true, json: () => mockData });
  
  const result = await apiFunction();
  
  expect(result).toEqual(expectedResult);
});
```

### Chrome Extension API Mocking

The test suite provides comprehensive Chrome API mocks:

```javascript
// Available in all tests via __tests__/setup/jest.setup.js
chrome.runtime.sendMessage()
chrome.storage.sync.get()
chrome.tabs.query()
chrome.contextMenus.create()
// ... and many more
```

#### Custom Mock Helpers

```javascript
// Reset Chrome API mocks
global.testUtils.resetChromeMocks();

// Set storage data for testing
chrome._helpers.setStorageData('sync', { 
  server: { url: 'http://test-server.com' } 
});

// Trigger message events
chrome._helpers.triggerMessage({
  action: 'SEND_TORRENT',
  url: 'magnet:test'
});
```

## Continuous Integration

### GitHub Actions Workflow

The project includes automated testing in CI/CD pipeline:

- **Test Execution:** All test suites run on every commit
- **Coverage Reporting:** Coverage thresholds enforced
- **Performance Monitoring:** Performance regression detection
- **Security Scanning:** Dependency vulnerability checks

### Pre-commit Hooks

Recommended pre-commit setup:

```bash
# Install husky for git hooks
npm install --save-dev husky

# Add pre-commit test run
npx husky add .husky/pre-commit "npm run test:ci"
```

## Debugging Tests

### Common Issues

#### 1. **Chrome API Not Mocked**

```javascript
// Error: chrome.someApi is not a function
// Solution: Add mock to __tests__/setup/jest.setup.js or __mocks__/chrome.js
```

#### 2. **Async Test Timeout**

```javascript
// Increase timeout for slow tests
jest.setTimeout(10000); // 10 seconds
```

#### 3. **DOM Manipulation Tests**

```javascript
// Ensure proper DOM setup
document.body.innerHTML = '<div id="test-container"></div>';
```

### Test Debugging Tools

```javascript
// Add debugging output
console.log('Test state:', testVariable);

// Use Jest's debugging mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Performance Benchmarks

### Target Performance Metrics

- **Memory Usage:** < 10MB peak memory consumption
- **Startup Time:** < 100ms for extension initialization
- **Link Detection:** < 1ms per 100 torrent links
- **Storage Operations:** < 5ms average per operation
- **DOM Manipulation:** < 100ms for 200 link indicators

### Performance Test Scenarios

1. **Memory Stress Test:** 1000+ simultaneous torrent detections
2. **Bulk Operations:** Processing 100+ torrent URLs
3. **Storage Load Test:** Frequent read/write operations
4. **DOM Performance:** Large page with many torrent links
5. **Network Efficiency:** Concurrent API requests

## Contributing

### Adding New Tests

1. **Choose Appropriate Category:** Unit, integration, or performance
2. **Follow Naming Conventions:** `component-name.test.js`
3. **Include JSDoc Comments:** Document complex test scenarios
4. **Maintain Coverage:** Ensure new code is properly tested
5. **Update Documentation:** Add test descriptions to this README

### Test Review Checklist

- [ ] Tests are properly isolated (no side effects)
- [ ] All edge cases are covered
- [ ] Error scenarios are tested
- [ ] Performance implications considered
- [ ] Chrome API interactions mocked appropriately
- [ ] Coverage thresholds maintained

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Chrome Extensions Testing Guide](https://developer.chrome.com/docs/extensions/mv3/tut_testing/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [WebExtensions API Reference](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API)

## Support

For testing-related questions or issues:

1. Check existing test examples in the codebase
2. Review this documentation
3. Create an issue with the `testing` label
4. Include test files and error messages in bug reports

---

**Note:** This testing infrastructure ensures the qBittorrent browser extension maintains high quality, security, and performance standards across all supported browsers and use cases.
