/**
 * Cryptographic utilities for secure data encryption and key management
 * Implements AES-GCM encryption with Web Crypto API for maximum security
 *
 * @class CryptoManager
 * @since 1.0.0
 * @example
 * // Generate a new encryption key
 * const key = await CryptoManager.generateKey();
 *
 * // Encrypt sensitive data
 * const encrypted = await CryptoManager.encrypt('secret data', key);
 *
 * // Decrypt data
 * const decrypted = await CryptoManager.decrypt(encrypted, key);
 */
class CryptoManager {
    
    /**
     * Generates a new AES-GCM 256-bit encryption key
     * Uses Web Crypto API for cryptographically secure key generation
     *
     * @returns {Promise<CryptoKey>} Generated AES-GCM encryption key
     * @throws {Error} When Web Crypto API is not available
     * @since 1.0.0
     * @example
     * const key = await CryptoManager.generateKey();
     * console.log(key.algorithm.name); // 'AES-GCM'
     */
    static async generateKey() {
        const key = await crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256,
            },
            true,
            ['encrypt', 'decrypt']
        );
        return key;
    }

    /**
     * Exports a CryptoKey to raw byte array format for storage
     * Converts key to serializable format for persistence
     *
     * @param {CryptoKey} key - The encryption key to export
     * @returns {Promise<number[]>} Key data as array of bytes
     * @throws {Error} When key export fails or key is not extractable
     * @since 1.0.0
     * @example
     * const key = await CryptoManager.generateKey();
     * const keyData = await CryptoManager.exportKey(key);
     * // Store keyData in browser storage
     */
    static async exportKey(key) {
        const exported = await crypto.subtle.exportKey('raw', key);
        return Array.from(new Uint8Array(exported));
    }

    /**
     * Imports a raw key from byte array back to CryptoKey format
     * Reconstructs encryption key from stored byte data
     *
     * @param {number[]|Uint8Array} keyData - Raw key data as byte array
     * @returns {Promise<CryptoKey>} Imported AES-GCM encryption key
     * @throws {Error} When key data is invalid or import fails
     * @since 1.0.0
     * @example
     * const keyData = [1, 2, 3, 4]; // example key bytes
     * const key = await CryptoManager.importKey(keyData);
     * // Use key for encryption/decryption
     */
    static async importKey(keyData) {
        const key = await crypto.subtle.importKey(
            'raw',
            new Uint8Array(keyData),
            'AES-GCM',
            true,
            ['encrypt', 'decrypt']
        );
        return key;
    }

    /**
     * Encrypts plaintext data using AES-GCM encryption
     * Generates random IV for each encryption operation
     *
     * @param {string} data - Plaintext data to encrypt
     * @param {CryptoKey} key - AES-GCM encryption key
     * @returns {Promise<object>} Encrypted data object
     * @returns {number[]} returns.data - Encrypted data as byte array
     * @returns {number[]} returns.iv - Initialization vector as byte array
     * @throws {Error} When encryption fails or key is invalid
     * @security Uses random IV for each encryption to prevent pattern analysis
     * @since 1.0.0
     * @example
     * const key = await CryptoManager.generateKey();
     * const encrypted = await CryptoManager.encrypt('secret message', key);
     * console.log(encrypted.data); // [encrypted bytes]
     * console.log(encrypted.iv);   // [random IV bytes]
     */
    static async encrypt(data, key) {
        const encoder = new TextEncoder();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        const encrypted = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv,
            },
            key,
            encoder.encode(data)
        );

        return {
            data: Array.from(new Uint8Array(encrypted)),
            iv: Array.from(iv)
        };
    }

    /**
     * Decrypts AES-GCM encrypted data back to plaintext
     * Uses stored IV to reverse the encryption process
     *
     * @param {object} encryptedData - Encrypted data object from encrypt()
     * @param {number[]} encryptedData.data - Encrypted data bytes
     * @param {number[]} encryptedData.iv - Initialization vector bytes
     * @param {CryptoKey} key - AES-GCM decryption key (same as encryption key)
     * @returns {Promise<string>} Decrypted plaintext data
     * @throws {Error} When decryption fails, data is corrupted, or key is wrong
     * @security Authenticated encryption prevents tampering detection
     * @since 1.0.0
     * @example
     * const decrypted = await CryptoManager.decrypt(encryptedData, key);
     * console.log(decrypted); // 'secret message'
     */
    static async decrypt(encryptedData, key) {
        const decrypted = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: new Uint8Array(encryptedData.iv),
            },
            key,
            new Uint8Array(encryptedData.data)
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    }

    /**
     * Derives an encryption key from a password using PBKDF2
     * Uses 100,000 iterations with SHA-256 for secure key derivation
     *
     * @param {string} password - User password for key derivation
     * @param {number[]|Uint8Array} salt - Random salt bytes for uniqueness
     * @returns {Promise<CryptoKey>} Derived AES-GCM encryption key
     * @throws {Error} When key derivation fails or parameters are invalid
     * @security Uses PBKDF2 with 100,000 iterations to resist brute force attacks
     * @since 1.0.0
     * @example
     * const salt = CryptoManager.generateSalt();
     * const key = await CryptoManager.deriveKeyFromPassword('user-password', salt);
     * // Use key for encryption/decryption
     */
    static async deriveKeyFromPassword(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: new Uint8Array(salt),
                iterations: 100000,
                hash: 'SHA-256',
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Generates a cryptographically secure random salt
     * Uses 16 bytes of random data for key derivation uniqueness
     *
     * @returns {number[]} Random salt as array of 16 bytes
     * @since 1.0.0
     * @example
     * const salt = CryptoManager.generateSalt();
     * console.log(salt.length); // 16
     * // Use salt with deriveKeyFromPassword()
     */
    static generateSalt() {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)));
    }
}

/**
 * Secure storage manager for encrypted credential storage
 * Provides high-level interface for storing sensitive data with encryption
 * Separates sensitive data (encrypted) from non-sensitive data (plain)
 *
 * @class SecureStorageManager
 * @since 1.0.0
 * @example
 * // Store server credentials securely
 * await SecureStorageManager.storeCredentials({
 *   url: 'http://localhost:8080',
 *   username: 'admin',
 *   password: 'secret123'
 * });
 *
 * // Retrieve credentials (password will be decrypted)
 * const creds = await SecureStorageManager.getCredentials();
 */
class SecureStorageManager {
    /**
     * Initializes encryption system with persistent key management
     * Generates new encryption key if none exists, or loads existing key
     *
     * @returns {Promise<CryptoKey>} Ready-to-use encryption key
     * @throws {Error} When encryption initialization fails
     * @private
     * @since 1.0.0
     */
    static async initializeEncryption() {
        let settings = await chrome.storage.local.get(['encryptionKey', 'salt']);
        
        if (!settings.encryptionKey || !settings.salt) {
            // Generate new encryption key and salt
            const salt = CryptoManager.generateSalt();
            const key = await CryptoManager.generateKey();
            const exportedKey = await CryptoManager.exportKey(key);
            
            await chrome.storage.local.set({
                encryptionKey: exportedKey,
                salt: salt
            });
            
            return key;
        }
        
        return await CryptoManager.importKey(settings.encryptionKey);
    }

    /**
     * Encrypts data and stores it in browser local storage
     * Uses initialized encryption key for secure data storage
     *
     * @param {string} key - Storage key for the encrypted data
     * @param {*} data - Data to encrypt and store (will be JSON serialized)
     * @throws {Error} When encryption or storage fails
     * @private
     * @since 1.0.0
     * @example
     * await SecureStorageManager.encryptAndStore('user_data', {
     *   sensitive: 'information'
     * });
     */
    static async encryptAndStore(key, data) {
        const encryptionKey = await this.initializeEncryption();
        const encrypted = await CryptoManager.encrypt(JSON.stringify(data), encryptionKey);
        
        await chrome.storage.local.set({
            [key]: encrypted
        });
    }

    /**
     * Retrieves and decrypts data from browser local storage
     * Uses initialized encryption key for secure data retrieval
     *
     * @param {string} key - Storage key for the encrypted data
     * @returns {Promise<*|null>} Decrypted data or null if not found/failed
     * @throws {Error} When decryption fails (but returns null for missing data)
     * @private
     * @since 1.0.0
     * @example
     * const data = await SecureStorageManager.decryptAndRetrieve('user_data');
     * if (data) {
     *   console.log('Retrieved:', data);
     * }
     */
    static async decryptAndRetrieve(key) {
        const encryptionKey = await this.initializeEncryption();
        const result = await chrome.storage.local.get([key]);
        
        if (!result[key]) {
            return null;
        }
        
        try {
            const decrypted = await CryptoManager.decrypt(result[key], encryptionKey);
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Failed to decrypt data:', error);
            return null;
        }
    }

    /**
     * Stores server credentials with encryption for sensitive data
     * Separates sensitive (username, password) from non-sensitive (URL, flags) data
     *
     * @param {object} serverConfig - Complete server configuration
     * @param {string} serverConfig.url - qBittorrent server URL
     * @param {string} serverConfig.username - Authentication username
     * @param {string} serverConfig.password - Authentication password
     * @param {boolean} [serverConfig.useHttps] - HTTPS preference
     * @param {number} [serverConfig.customPort] - Custom port number
     * @throws {Error} When credential storage fails
     * @since 1.0.0
     * @example
     * await SecureStorageManager.storeCredentials({
     *   url: 'http://localhost:8080',
     *   username: 'admin',
     *   password: 'secret123',
     *   useHttps: false
     * });
     */
    static async storeCredentials(serverConfig) {
        // Store sensitive data encrypted
        const sensitiveData = {
            password: serverConfig.password,
            username: serverConfig.username
        };
        
        await this.encryptAndStore('secure_credentials', sensitiveData);
        
        // Store non-sensitive data in sync storage
        const publicData = {
            url: serverConfig.url,
            useHttps: serverConfig.useHttps,
            customPort: serverConfig.customPort
        };
        
        await chrome.storage.sync.set({ server: publicData });
    }

    /**
     * Retrieves complete server credentials with decryption
     * Combines encrypted sensitive data with plain non-sensitive data
     *
     * @returns {Promise<object>} Complete server configuration
     * @returns {string} returns.url - qBittorrent server URL
     * @returns {string} returns.username - Authentication username
     * @returns {string} returns.password - Authentication password (decrypted)
     * @returns {boolean} returns.useHttps - HTTPS preference
     * @returns {number} returns.customPort - Custom port number
     * @throws {Error} When credential retrieval or decryption fails
     * @since 1.0.0
     * @example
     * const credentials = await SecureStorageManager.getCredentials();
     * console.log(credentials.url);      // 'http://localhost:8080'
     * console.log(credentials.username); // 'admin'
     * console.log(credentials.password); // 'secret123' (decrypted)
     */
    static async getCredentials() {
        const publicData = await chrome.storage.sync.get(['server']);
        const sensitiveData = await this.decryptAndRetrieve('secure_credentials');
        
        if (!sensitiveData) {
            return publicData.server || {};
        }
        
        return {
            ...publicData.server,
            ...sensitiveData
        };
    }

    /**
     * Clears all stored credentials from browser storage
     * Removes both encrypted sensitive data and plain non-sensitive data
     *
     * @throws {Error} When credential clearing fails
     * @since 1.0.0
     * @example
     * // Clear all stored server credentials
     * await SecureStorageManager.clearCredentials();
     */
    static async clearCredentials() {
        await chrome.storage.local.remove(['secure_credentials']);
        await chrome.storage.sync.remove(['server']);
    }
}

// Export for browser environment
if (typeof window !== 'undefined') {
    window.CryptoManager = CryptoManager;
    window.SecureStorageManager = SecureStorageManager;
}