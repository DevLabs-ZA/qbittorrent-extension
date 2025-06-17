import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { js },
    extends: ['js/recommended']
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        ...globals.es2022,
        importScripts: 'readonly',
        SecureStorageManager: 'readonly',
        CryptoManager: 'readonly',
        sendTorrent: 'readonly',
        sendMultipleTorrents: 'readonly',
        testConnection: 'readonly',
        getServerInfo: 'readonly',
        TorrentLinkDetector: 'readonly',
        CONSTANTS: 'readonly',
        StorageManager: 'readonly',
        NotificationManager: 'readonly',
        InputValidator: 'readonly',
        RateLimiter: 'readonly'
      }
    },
    rules: {
      // Security Rules - High Priority
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-global-assign': 'error',
      'no-proto': 'error',
      'no-iterator': 'error',
      'no-extend-native': 'error',
      'no-caller': 'error',
      'no-new-wrappers': 'error',
      'no-octal-escape': 'error',
      'no-throw-literal': 'error',
      'no-with': 'error',
      
      // Code Quality Rules - High Priority
      'no-unused-vars': ['error', { 
        'vars': 'all', 
        'args': 'after-used', 
        'ignoreRestSiblings': true,
        'argsIgnorePattern': '^_'
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'no-duplicate-imports': 'error',
      
      // Complexity and Maintainability Rules - Medium Priority
      'complexity': ['warn', 10],
      
      // Best Practices - Medium Priority
      'eqeqeq': ['error', 'always'],
      'no-implicit-coercion': 'error',
      'no-multi-assign': 'error',
      'no-nested-ternary': 'warn',
      'no-unneeded-ternary': 'error',
      'no-lonely-if': 'error',
      'no-else-return': 'error',
      'no-useless-return': 'error',
      'no-useless-concat': 'error',
      'no-useless-escape': 'error',
      'no-unreachable': 'error',
      'no-unused-expressions': 'error',
      'no-use-before-define': ['error', { functions: false, classes: true, variables: true }],
      
      // Error Prevention - High Priority
      'no-undef': 'error',
      'no-redeclare': 'error',
      'no-shadow': 'error',
      'no-shadow-restricted-names': 'error',
      'no-delete-var': 'error',
      'no-label-var': 'error',
      'no-implicit-globals': 'error',
      'block-scoped-var': 'error',
      
      // Style and Consistency - Low Priority
      'camelcase': ['warn', { properties: 'never' }],
      'consistent-return': 'error',
      'curly': ['error', 'all'],
      'default-case': 'warn',
      'default-case-last': 'error',
      'dot-notation': 'warn',
      'guard-for-in': 'warn',
      'no-empty-function': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-extra-boolean-cast': 'error',
      'no-fallthrough': 'error',
      'no-floating-decimal': 'error',
      'no-multi-spaces': 'warn',
      'no-multiple-empty-lines': ['warn', { max: 2, maxEOF: 1 }],
      'no-trailing-spaces': 'warn',
      'semi': ['error', 'always'],
      'quotes': ['warn', 'single', { avoidEscape: true }],
      
      // Async/Promise Rules - High Priority
      'no-async-promise-executor': 'error',
      'no-await-in-loop': 'warn',
      'no-promise-executor-return': 'error',
      'prefer-promise-reject-errors': 'error',
      'require-atomic-updates': 'error',
      
      // ES6+ Rules
      'arrow-body-style': ['warn', 'as-needed'],
      'arrow-spacing': 'warn',
      'constructor-super': 'error',
      'no-class-assign': 'error',
      'no-const-assign': 'error',
      'no-dupe-class-members': 'error',
      'no-new-symbol': 'error',
      'no-this-before-super': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-constructor': 'error',
      'no-useless-rename': 'error',
      'object-shorthand': 'warn',
      'prefer-destructuring': ['warn', {
        array: true,
        object: true
      }, {
        enforceForRenamedProperties: false
      }],
      'prefer-numeric-literals': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'rest-spread-spacing': 'error',
      'symbol-description': 'error',
      'template-curly-spacing': 'warn',
      'yield-star-spacing': 'warn'
    }
  },
  // Node.js/CommonJS files (Jest config, mocks, setup files)
  {
    files: ['jest.config.js', '__mocks__/**/*.js', '__tests__/setup/**/*.js', '__tests__/utils/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    rules: {
      'no-console': 'off',
      'complexity': 'off',
      'no-magic-numbers': 'off'
    }
  },
  // Test files specific configuration
  {
    files: ['**/__tests__/**/*.js', '**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        ...globals.jest,
        ...globals.node,
        global: 'writable',
        Buffer: 'readonly'
      }
    },
    rules: {
      'no-console': 'off',
      'complexity': 'off',
      'no-magic-numbers': 'off',
      'no-eval': 'off', // Tests may need eval for mocking
      'no-unused-vars': ['error', { 
        'vars': 'all', 
        'args': 'after-used', 
        'ignoreRestSiblings': true,
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^(mock|test|spec)'
      }]
    }
  },
  // Production files - stricter console rules
  {
    files: ['background/**/*.js', 'content/**/*.js', 'popup/**/*.js', 'options/**/*.js'],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }]
    }
  }
]);
