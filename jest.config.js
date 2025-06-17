/**
 * Jest configuration for qBittorrent Browser Extension
 * Optimized for Chrome extension testing with WebExtensions API mocking
 */

module.exports = {
  // Test environment configuration
  testEnvironment: 'jsdom',

  // Setup files to run before tests
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/jest.setup.js'
  ],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.spec.js'
  ],

  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/setup/',
    '/__tests__/fixtures/',
    '/__tests__/utils/'
  ],

  // Module paths and aliases
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@background/(.*)$': '<rootDir>/background/$1',
    '^@content/(.*)$': '<rootDir>/content/$1',
    '^@popup/(.*)$': '<rootDir>/popup/$1',
    '^@options/(.*)$': '<rootDir>/options/$1'
  },

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'background/**/*.js',
    'content/**/*.js',
    'popup/**/*.js',
    'options/**/*.js',
    'utils/**/*.js',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!**/node_modules/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './utils/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './background/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],

  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Global variables available in tests
  globals: {
    'chrome': {},
    'browser': {},
    'window': {}
  },

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Reset mocks between tests
  resetMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Maximum number of concurrent workers
  maxWorkers: '50%',

  // Error handling
  errorOnDeprecated: true,

  // Module file extensions
  moduleFileExtensions: [
    'js',
    'json'
  ],

  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml'
    }]
  ]
};