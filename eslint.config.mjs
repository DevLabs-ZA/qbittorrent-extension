import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";


export default defineConfig([
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"] },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
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
      'no-unused-vars': 'warn',
      'no-console': 'off'
    }
  },
]);
