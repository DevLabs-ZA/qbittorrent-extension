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

// Secure Storage Manager
class SecureStorageManager {
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

// Export for browser environment
if (typeof window !== 'undefined') {
    window.CryptoManager = CryptoManager;
    window.SecureStorageManager = SecureStorageManager;
}