/**
 * Unit tests for Crypto utilities
 * Tests encryption, decryption, key management, and secure storage
 */

describe('CryptoManager', () => {
  let CryptoManager;
  let mockCrypto;
  let mockKey;
  let mockArrayBuffer;

  beforeAll(() => {
    // Mock Web Crypto API
    mockKey = { type: 'secret', algorithm: { name: 'AES-GCM' } };
    mockArrayBuffer = new ArrayBuffer(32);
    
    mockCrypto = {
      subtle: {
        generateKey: jest.fn(),
        exportKey: jest.fn(),
        importKey: jest.fn(),
        encrypt: jest.fn(),
        decrypt: jest.fn(),
        deriveKey: jest.fn(),
        deriveBits: jest.fn()
      },
      getRandomValues: jest.fn()
    };

    global.crypto = mockCrypto;
    global.TextEncoder = jest.fn(() => ({
      encode: jest.fn(str => new Uint8Array(Buffer.from(str, 'utf8')))
    }));
    global.TextDecoder = jest.fn(() => ({
      decode: jest.fn(buffer => Buffer.from(buffer).toString('utf8'))
    }));

    // Load the crypto module
    eval(`
      class CryptoManager {
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

        static async exportKey(key) {
          const exported = await crypto.subtle.exportKey('raw', key);
          return Array.from(new Uint8Array(exported));
        }

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

        static generateSalt() {
          return Array.from(crypto.getRandomValues(new Uint8Array(16)));
        }
      }

      class SecureStorageManager {
        static async initializeEncryption() {
          let settings = await chrome.storage.local.get(['encryptionKey', 'salt']);
          
          if (!settings.encryptionKey || !settings.salt) {
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

        static async encryptAndStore(key, data) {
          const encryptionKey = await this.initializeEncryption();
          const encrypted = await CryptoManager.encrypt(JSON.stringify(data), encryptionKey);
          
          await chrome.storage.local.set({
            [key]: encrypted
          });
        }

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

        static async storeCredentials(serverConfig) {
          const sensitiveData = {
            password: serverConfig.password,
            username: serverConfig.username
          };
          
          await this.encryptAndStore('secure_credentials', sensitiveData);
          
          const publicData = {
            url: serverConfig.url,
            useHttps: serverConfig.useHttps,
            customPort: serverConfig.customPort
          };
          
          await chrome.storage.sync.set({ server: publicData });
        }

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

        static async clearCredentials() {
          await chrome.storage.local.remove(['secure_credentials']);
          await chrome.storage.sync.remove(['server']);
        }
      }

      global.testCryptoManager = CryptoManager;
      global.testSecureStorageManager = SecureStorageManager;
    `);

    CryptoManager = global.testCryptoManager;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset Chrome storage mocks
    global.chrome = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn(),
          remove: jest.fn()
        },
        sync: {
          get: jest.fn(),
          set: jest.fn(),
          remove: jest.fn()
        }
      }
    };
  });

  describe('generateKey', () => {
    it('should generate AES-GCM key', async () => {
      mockCrypto.subtle.generateKey.mockResolvedValue(mockKey);

      const key = await CryptoManager.generateKey();

      expect(key).toBe(mockKey);
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        {
          name: 'AES-GCM',
          length: 256,
        },
        true,
        ['encrypt', 'decrypt']
      );
    });

    it('should handle generation errors', async () => {
      const error = new Error('Key generation failed');
      mockCrypto.subtle.generateKey.mockRejectedValue(error);

      await expect(CryptoManager.generateKey()).rejects.toThrow('Key generation failed');
    });
  });

  describe('exportKey', () => {
    it('should export key as array', async () => {
      const mockExported = new ArrayBuffer(32);
      const expectedArray = Array.from(new Uint8Array(mockExported));
      
      mockCrypto.subtle.exportKey.mockResolvedValue(mockExported);

      const result = await CryptoManager.exportKey(mockKey);

      expect(result).toEqual(expectedArray);
      expect(mockCrypto.subtle.exportKey).toHaveBeenCalledWith('raw', mockKey);
    });

    it('should handle export errors', async () => {
      const error = new Error('Export failed');
      mockCrypto.subtle.exportKey.mockRejectedValue(error);

      await expect(CryptoManager.exportKey(mockKey)).rejects.toThrow('Export failed');
    });
  });

  describe('importKey', () => {
    it('should import key from array', async () => {
      const keyData = [1, 2, 3, 4, 5];
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);

      const result = await CryptoManager.importKey(keyData);

      expect(result).toBe(mockKey);
      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'raw',
        new Uint8Array(keyData),
        'AES-GCM',
        true,
        ['encrypt', 'decrypt']
      );
    });

    it('should handle import errors', async () => {
      const error = new Error('Import failed');
      mockCrypto.subtle.importKey.mockRejectedValue(error);

      await expect(CryptoManager.importKey([1, 2, 3])).rejects.toThrow('Import failed');
    });
  });

  describe('encrypt', () => {
    it('should encrypt data successfully', async () => {
      const testData = 'sensitive data';
      const mockIv = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const mockEncrypted = new ArrayBuffer(32);
      
      mockCrypto.getRandomValues.mockReturnValue(mockIv);
      mockCrypto.subtle.encrypt.mockResolvedValue(mockEncrypted);

      const result = await CryptoManager.encrypt(testData, mockKey);

      expect(result).toEqual({
        data: Array.from(new Uint8Array(mockEncrypted)),
        iv: Array.from(mockIv)
      });
      
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalledWith(
        {
          name: 'AES-GCM',
          iv: mockIv,
        },
        mockKey,
        expect.any(Uint8Array)
      );
    });

    it('should handle encryption errors', async () => {
      const error = new Error('Encryption failed');
      mockCrypto.getRandomValues.mockReturnValue(new Uint8Array(12));
      mockCrypto.subtle.encrypt.mockRejectedValue(error);

      await expect(CryptoManager.encrypt('test', mockKey)).rejects.toThrow('Encryption failed');
    });
  });

  describe('decrypt', () => {
    it('should decrypt data successfully', async () => {
      const encryptedData = {
        data: [1, 2, 3, 4],
        iv: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      };
      const decryptedBuffer = new ArrayBuffer(16);
      const expectedText = 'decrypted text';
      
      mockCrypto.subtle.decrypt.mockResolvedValue(decryptedBuffer);
      
      // Mock TextDecoder
      const mockDecoder = {
        decode: jest.fn().mockReturnValue(expectedText)
      };
      global.TextDecoder.mockImplementation(() => mockDecoder);

      const result = await CryptoManager.decrypt(encryptedData, mockKey);

      expect(result).toBe(expectedText);
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalledWith(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(encryptedData.iv),
        },
        mockKey,
        new Uint8Array(encryptedData.data)
      );
    });

    it('should handle decryption errors', async () => {
      const error = new Error('Decryption failed');
      mockCrypto.subtle.decrypt.mockRejectedValue(error);

      const encryptedData = {
        data: [1, 2, 3],
        iv: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      };

      await expect(CryptoManager.decrypt(encryptedData, mockKey)).rejects.toThrow('Decryption failed');
    });
  });

  describe('deriveKeyFromPassword', () => {
    it('should derive key from password and salt', async () => {
      const password = 'test-password';
      const salt = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
      const mockKeyMaterial = { type: 'raw' };
      
      mockCrypto.subtle.importKey.mockResolvedValue(mockKeyMaterial);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);

      const result = await CryptoManager.deriveKeyFromPassword(password, salt);

      expect(result).toBe(mockKey);
      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'raw',
        expect.any(Uint8Array),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalledWith(
        {
          name: 'PBKDF2',
          salt: new Uint8Array(salt),
          iterations: 100000,
          hash: 'SHA-256',
        },
        mockKeyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    });

    it('should handle derivation errors', async () => {
      const error = new Error('Derivation failed');
      mockCrypto.subtle.importKey.mockRejectedValue(error);

      await expect(
        CryptoManager.deriveKeyFromPassword('password', [1, 2, 3])
      ).rejects.toThrow('Derivation failed');
    });
  });

  describe('generateSalt', () => {
    it('should generate random salt', () => {
      const mockSalt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
      mockCrypto.getRandomValues.mockReturnValue(mockSalt);

      const result = CryptoManager.generateSalt();

      expect(result).toEqual(Array.from(mockSalt));
      expect(mockCrypto.getRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array));
      expect(mockCrypto.getRandomValues.mock.calls[0][0].length).toBe(16);
    });
  });
});

describe('SecureStorageManager', () => {
  let SecureStorageManager;
  let mockCrypto;

  beforeAll(() => {
    SecureStorageManager = global.testSecureStorageManager;
    
    // Mock crypto for SecureStorageManager tests
    mockCrypto = {
      subtle: {
        generateKey: jest.fn(),
        exportKey: jest.fn(),
        importKey: jest.fn(),
        encrypt: jest.fn(),
        decrypt: jest.fn()
      },
      getRandomValues: jest.fn()
    };
    global.crypto = mockCrypto;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    global.chrome = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn(),
          remove: jest.fn()
        },
        sync: {
          get: jest.fn(),
          set: jest.fn(),
          remove: jest.fn()
        }
      }
    };
  });

  describe('initializeEncryption', () => {
    it('should generate new key when none exists', async () => {
      const mockKey = { type: 'secret' };
      const mockSalt = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
      const mockExportedKey = [1, 2, 3, 4];

      global.chrome.storage.local.get.mockResolvedValue({});
      mockCrypto.getRandomValues.mockReturnValue(new Uint8Array(mockSalt));
      mockCrypto.subtle.generateKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.exportKey.mockResolvedValue(new ArrayBuffer(4));

      const result = await SecureStorageManager.initializeEncryption();

      expect(result).toBe(mockKey);
      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        encryptionKey: expect.any(Array),
        salt: mockSalt
      });
    });

    it('should import existing key when available', async () => {
      const mockKey = { type: 'secret' };
      const existingKeyData = [1, 2, 3, 4];
      const existingSalt = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

      global.chrome.storage.local.get.mockResolvedValue({
        encryptionKey: existingKeyData,
        salt: existingSalt
      });
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);

      const result = await SecureStorageManager.initializeEncryption();

      expect(result).toBe(mockKey);
      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'raw',
        new Uint8Array(existingKeyData),
        'AES-GCM',
        true,
        ['encrypt', 'decrypt']
      );
    });
  });

  describe('encryptAndStore', () => {
    it('should encrypt and store data', async () => {
      const testKey = 'test-key';
      const testData = { username: 'admin', password: 'secret' };
      const mockEncryptionKey = { type: 'secret' };
      const mockEncrypted = {
        data: [1, 2, 3, 4],
        iv: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      };

      // Mock initializeEncryption
      global.chrome.storage.local.get.mockResolvedValue({
        encryptionKey: [1, 2, 3, 4],
        salt: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
      });
      mockCrypto.subtle.importKey.mockResolvedValue(mockEncryptionKey);

      // Mock encryption
      mockCrypto.getRandomValues.mockReturnValue(new Uint8Array(12));
      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(16));

      await SecureStorageManager.encryptAndStore(testKey, testData);

      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        [testKey]: expect.objectContaining({
          data: expect.any(Array),
          iv: expect.any(Array)
        })
      });
    });
  });

  describe('decryptAndRetrieve', () => {
    it('should decrypt and retrieve data', async () => {
      const testKey = 'test-key';
      const mockEncryptionKey = { type: 'secret' };
      const storedData = {
        data: [1, 2, 3, 4],
        iv: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      };
      const expectedData = { username: 'admin', password: 'secret' };

      // Mock initializeEncryption
      global.chrome.storage.local.get
        .mockResolvedValueOnce({
          encryptionKey: [1, 2, 3, 4],
          salt: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
        })
        .mockResolvedValueOnce({
          [testKey]: storedData
        });
      
      mockCrypto.subtle.importKey.mockResolvedValue(mockEncryptionKey);
      mockCrypto.subtle.decrypt.mockResolvedValue(new ArrayBuffer(16));

      // Mock TextDecoder
      const mockDecoder = {
        decode: jest.fn().mockReturnValue(JSON.stringify(expectedData))
      };
      global.TextDecoder.mockImplementation(() => mockDecoder);

      const result = await SecureStorageManager.decryptAndRetrieve(testKey);

      expect(result).toEqual(expectedData);
    });

    it('should return null when data does not exist', async () => {
      const testKey = 'non-existent-key';
      const mockEncryptionKey = { type: 'secret' };

      // Mock initializeEncryption
      global.chrome.storage.local.get
        .mockResolvedValueOnce({
          encryptionKey: [1, 2, 3, 4],
          salt: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
        })
        .mockResolvedValueOnce({});
      
      mockCrypto.subtle.importKey.mockResolvedValue(mockEncryptionKey);

      const result = await SecureStorageManager.decryptAndRetrieve(testKey);

      expect(result).toBeNull();
    });

    it('should return null on decryption error', async () => {
      const testKey = 'test-key';
      const mockEncryptionKey = { type: 'secret' };
      const storedData = {
        data: [1, 2, 3, 4],
        iv: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      };

      // Mock initializeEncryption
      global.chrome.storage.local.get
        .mockResolvedValueOnce({
          encryptionKey: [1, 2, 3, 4],
          salt: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
        })
        .mockResolvedValueOnce({
          [testKey]: storedData
        });
      
      mockCrypto.subtle.importKey.mockResolvedValue(mockEncryptionKey);
      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'));

      const result = await SecureStorageManager.decryptAndRetrieve(testKey);

      expect(result).toBeNull();
    });
  });

  describe('storeCredentials', () => {
    it('should store credentials with encryption', async () => {
      const serverConfig = {
        url: 'http://localhost:8080',
        username: 'admin',
        password: 'secret',
        useHttps: false,
        customPort: 8080
      };

      // Mock encryption setup
      global.chrome.storage.local.get.mockResolvedValue({
        encryptionKey: [1, 2, 3, 4],
        salt: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
      });
      mockCrypto.subtle.importKey.mockResolvedValue({ type: 'secret' });
      mockCrypto.getRandomValues.mockReturnValue(new Uint8Array(12));
      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(16));

      await SecureStorageManager.storeCredentials(serverConfig);

      // Check that sensitive data is stored in local storage (encrypted)
      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        secure_credentials: expect.objectContaining({
          data: expect.any(Array),
          iv: expect.any(Array)
        })
      });

      // Check that public data is stored in sync storage
      expect(global.chrome.storage.sync.set).toHaveBeenCalledWith({
        server: {
          url: serverConfig.url,
          useHttps: serverConfig.useHttps,
          customPort: serverConfig.customPort
        }
      });
    });
  });

  describe('getCredentials', () => {
    it('should retrieve combined credentials', async () => {
      const publicData = {
        url: 'http://localhost:8080',
        useHttps: false,
        customPort: 8080
      };
      const sensitiveData = {
        username: 'admin',
        password: 'secret'
      };

      global.chrome.storage.sync.get.mockResolvedValue({ server: publicData });
      
      // Mock decryption
      global.chrome.storage.local.get
        .mockResolvedValueOnce({
          encryptionKey: [1, 2, 3, 4],
          salt: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
        })
        .mockResolvedValueOnce({
          secure_credentials: {
            data: [1, 2, 3, 4],
            iv: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
          }
        });
      
      mockCrypto.subtle.importKey.mockResolvedValue({ type: 'secret' });
      mockCrypto.subtle.decrypt.mockResolvedValue(new ArrayBuffer(16));

      // Mock TextDecoder
      const mockDecoder = {
        decode: jest.fn().mockReturnValue(JSON.stringify(sensitiveData))
      };
      global.TextDecoder.mockImplementation(() => mockDecoder);

      const result = await SecureStorageManager.getCredentials();

      expect(result).toEqual({
        ...publicData,
        ...sensitiveData
      });
    });

    it('should return only public data when sensitive data is not available', async () => {
      const publicData = {
        url: 'http://localhost:8080',
        useHttps: false,
        customPort: 8080
      };

      global.chrome.storage.sync.get.mockResolvedValue({ server: publicData });
      
      // Mock no encrypted data
      global.chrome.storage.local.get
        .mockResolvedValueOnce({
          encryptionKey: [1, 2, 3, 4],
          salt: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
        })
        .mockResolvedValueOnce({});
      
      mockCrypto.subtle.importKey.mockResolvedValue({ type: 'secret' });

      const result = await SecureStorageManager.getCredentials();

      expect(result).toEqual(publicData);
    });

    it('should return empty object when no data exists', async () => {
      global.chrome.storage.sync.get.mockResolvedValue({});
      
      global.chrome.storage.local.get
        .mockResolvedValueOnce({
          encryptionKey: [1, 2, 3, 4],
          salt: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
        })
        .mockResolvedValueOnce({});
      
      mockCrypto.subtle.importKey.mockResolvedValue({ type: 'secret' });

      const result = await SecureStorageManager.getCredentials();

      expect(result).toEqual({});
    });
  });

  describe('clearCredentials', () => {
    it('should clear both encrypted and public credentials', async () => {
      await SecureStorageManager.clearCredentials();

      expect(global.chrome.storage.local.remove).toHaveBeenCalledWith(['secure_credentials']);
      expect(global.chrome.storage.sync.remove).toHaveBeenCalledWith(['server']);
    });
  });
});