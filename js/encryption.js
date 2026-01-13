/**
 * Encryption Module
 * Chiffrement/déchiffrement des données sensibles avec Web Crypto API
 * Utilise AES-GCM avec une clé dérivée du mot de passe
 */

// Constantes de configuration
const ENCRYPTION_CONFIG = {
    algorithm: 'AES-GCM',
    keyLength: 256,
    iterations: 100000, // PBKDF2 iterations
    hashAlgorithm: 'SHA-256'
};

// Clés de stockage
const STORAGE_KEYS = {
    salt: 'forem_encryption_salt',
    passwordHash: 'forem_password_hash',
    encryptionEnabled: 'forem_encryption_enabled'
};

// État du module
let derivedKey = null;
let isUnlocked = false;

/**
 * Vérifie si le navigateur supporte Web Crypto API
 * @returns {boolean}
 */
export function isEncryptionSupported() {
    return typeof window !== 'undefined' && 
           window.crypto && 
           window.crypto.subtle;
}

/**
 * Vérifie si le chiffrement est activé
 * @returns {boolean}
 */
export function isEncryptionEnabled() {
    return localStorage.getItem(STORAGE_KEYS.encryptionEnabled) === 'true';
}

/**
 * Vérifie si le coffre-fort est déverrouillé
 * @returns {boolean}
 */
export function isVaultUnlocked() {
    return isUnlocked && derivedKey !== null;
}

/**
 * Génère un sel aléatoire
 * @returns {Uint8Array}
 */
function generateSalt() {
    return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Génère un vecteur d'initialisation (IV) aléatoire
 * @returns {Uint8Array}
 */
function generateIV() {
    return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Convertit un ArrayBuffer en base64
 * @param {ArrayBuffer} buffer 
 * @returns {string}
 */
function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Convertit une chaîne base64 en ArrayBuffer
 * @param {string} base64 
 * @returns {ArrayBuffer}
 */
function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Dérive une clé de chiffrement à partir d'un mot de passe
 * @param {string} password - Le mot de passe
 * @param {Uint8Array} salt - Le sel
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey(password, salt) {
    // Importer le mot de passe comme clé
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );
    
    // Dériver la clé AES
    return await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: ENCRYPTION_CONFIG.iterations,
            hash: ENCRYPTION_CONFIG.hashAlgorithm
        },
        passwordKey,
        {
            name: ENCRYPTION_CONFIG.algorithm,
            length: ENCRYPTION_CONFIG.keyLength
        },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Génère un hash du mot de passe pour vérification
 * @param {string} password 
 * @param {Uint8Array} salt 
 * @returns {Promise<string>}
 */
async function hashPassword(password, salt) {
    const data = new TextEncoder().encode(password + bufferToBase64(salt));
    const hash = await crypto.subtle.digest(ENCRYPTION_CONFIG.hashAlgorithm, data);
    return bufferToBase64(hash);
}

/**
 * Configure le chiffrement avec un nouveau mot de passe
 * @param {string} password - Le mot de passe choisi
 * @returns {Promise<boolean>}
 */
export async function setupEncryption(password) {
    if (!isEncryptionSupported()) {
        console.error('Web Crypto API non supportée');
        return false;
    }
    
    if (!password || password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères');
    }
    
    try {
        // Générer un nouveau sel
        const salt = generateSalt();
        
        // Dériver la clé
        derivedKey = await deriveKey(password, salt);
        
        // Hasher le mot de passe pour vérification future
        const passwordHashValue = await hashPassword(password, salt);
        
        // Sauvegarder le sel et le hash
        localStorage.setItem(STORAGE_KEYS.salt, bufferToBase64(salt));
        localStorage.setItem(STORAGE_KEYS.passwordHash, passwordHashValue);
        localStorage.setItem(STORAGE_KEYS.encryptionEnabled, 'true');
        
        isUnlocked = true;
        
        return true;
    } catch (error) {
        console.error('Erreur setup encryption:', error);
        return false;
    }
}

/**
 * Déverrouille le coffre-fort avec le mot de passe
 * @param {string} password - Le mot de passe
 * @returns {Promise<boolean>}
 */
export async function unlockVault(password) {
    if (!isEncryptionSupported()) {
        return false;
    }
    
    try {
        // Récupérer le sel
        const saltBase64 = localStorage.getItem(STORAGE_KEYS.salt);
        if (!saltBase64) {
            throw new Error('Sel non trouvé - chiffrement non configuré');
        }
        
        const salt = new Uint8Array(base64ToBuffer(saltBase64));
        
        // Vérifier le mot de passe
        const storedHash = localStorage.getItem(STORAGE_KEYS.passwordHash);
        const computedHash = await hashPassword(password, salt);
        
        if (storedHash !== computedHash) {
            throw new Error('Mot de passe incorrect');
        }
        
        // Dériver la clé
        derivedKey = await deriveKey(password, salt);
        isUnlocked = true;
        
        return true;
    } catch (error) {
        console.error('Erreur unlock vault:', error);
        derivedKey = null;
        isUnlocked = false;
        throw error;
    }
}

/**
 * Verrouille le coffre-fort
 */
export function lockVault() {
    derivedKey = null;
    isUnlocked = false;
}

/**
 * Chiffre des données
 * @param {any} data - Les données à chiffrer
 * @returns {Promise<string>} Les données chiffrées en base64
 */
export async function encrypt(data) {
    if (!isVaultUnlocked()) {
        throw new Error('Coffre-fort verrouillé');
    }
    
    try {
        const iv = generateIV();
        const plaintext = new TextEncoder().encode(JSON.stringify(data));
        
        const ciphertext = await crypto.subtle.encrypt(
            {
                name: ENCRYPTION_CONFIG.algorithm,
                iv: iv
            },
            derivedKey,
            plaintext
        );
        
        // Combiner IV + ciphertext
        const result = {
            iv: bufferToBase64(iv),
            data: bufferToBase64(ciphertext)
        };
        
        return btoa(JSON.stringify(result));
    } catch (error) {
        console.error('Erreur chiffrement:', error);
        throw error;
    }
}

/**
 * Déchiffre des données
 * @param {string} encryptedBase64 - Les données chiffrées en base64
 * @returns {Promise<any>} Les données déchiffrées
 */
export async function decrypt(encryptedBase64) {
    if (!isVaultUnlocked()) {
        throw new Error('Coffre-fort verrouillé');
    }
    
    try {
        const { iv, data } = JSON.parse(atob(encryptedBase64));
        
        const plaintext = await crypto.subtle.decrypt(
            {
                name: ENCRYPTION_CONFIG.algorithm,
                iv: new Uint8Array(base64ToBuffer(iv))
            },
            derivedKey,
            base64ToBuffer(data)
        );
        
        return JSON.parse(new TextDecoder().decode(plaintext));
    } catch (error) {
        console.error('Erreur déchiffrement:', error);
        throw error;
    }
}

/**
 * Change le mot de passe de chiffrement
 * Nécessite de re-chiffrer toutes les données sensibles
 * @param {string} oldPassword 
 * @param {string} newPassword 
 * @returns {Promise<boolean>}
 */
export async function changePassword(oldPassword, newPassword) {
    // Vérifier l'ancien mot de passe
    const wasUnlocked = isUnlocked;
    
    try {
        await unlockVault(oldPassword);
    } catch {
        throw new Error('Ancien mot de passe incorrect');
    }
    
    // Lire toutes les données chiffrées
    const encryptedKeys = [
        'forem_cv_profile_encrypted',
        'forem_gemini_key_encrypted',
        'forem_cover_letters_encrypted'
    ];
    
    const decryptedData = {};
    
    for (const key of encryptedKeys) {
        const encrypted = localStorage.getItem(key);
        if (encrypted) {
            try {
                decryptedData[key] = await decrypt(encrypted);
            } catch {
                // Données corrompues ou non chiffrées
            }
        }
    }
    
    // Configurer le nouveau mot de passe
    await setupEncryption(newPassword);
    
    // Re-chiffrer toutes les données
    for (const [key, data] of Object.entries(decryptedData)) {
        const encrypted = await encrypt(data);
        localStorage.setItem(key, encrypted);
    }
    
    if (!wasUnlocked) {
        lockVault();
    }
    
    return true;
}

/**
 * Désactive le chiffrement et déchiffre toutes les données
 * @param {string} password 
 * @returns {Promise<boolean>}
 */
export async function disableEncryption(password) {
    try {
        await unlockVault(password);
    } catch {
        throw new Error('Mot de passe incorrect');
    }
    
    // Déchiffrer et sauvegarder en clair
    const encryptedKeys = [
        { encrypted: 'forem_cv_profile_encrypted', plain: 'forem_cv_profile' },
        { encrypted: 'forem_gemini_key_encrypted', plain: 'forem_gemini_key' },
        { encrypted: 'forem_cover_letters_encrypted', plain: 'forem_cover_letters' }
    ];
    
    for (const { encrypted, plain } of encryptedKeys) {
        const data = localStorage.getItem(encrypted);
        if (data) {
            try {
                const decrypted = await decrypt(data);
                localStorage.setItem(plain, JSON.stringify(decrypted));
                localStorage.removeItem(encrypted);
            } catch {
                // Ignorer les erreurs
            }
        }
    }
    
    // Supprimer les métadonnées de chiffrement
    localStorage.removeItem(STORAGE_KEYS.salt);
    localStorage.removeItem(STORAGE_KEYS.passwordHash);
    localStorage.removeItem(STORAGE_KEYS.encryptionEnabled);
    
    lockVault();
    
    return true;
}

/**
 * Sauvegarde sécurisée de données
 * Chiffre si le chiffrement est actif, sinon sauvegarde en clair
 * @param {string} key - La clé de stockage
 * @param {any} data - Les données
 * @returns {Promise<boolean>}
 */
export async function secureStore(key, data) {
    try {
        if (isEncryptionEnabled() && isVaultUnlocked()) {
            const encrypted = await encrypt(data);
            localStorage.setItem(key + '_encrypted', encrypted);
            localStorage.removeItem(key); // Supprimer la version non chiffrée
        } else {
            localStorage.setItem(key, JSON.stringify(data));
        }
        return true;
    } catch (error) {
        console.error('Erreur secureStore:', error);
        return false;
    }
}

/**
 * Lecture sécurisée de données
 * Déchiffre si le chiffrement est actif, sinon lit en clair
 * @param {string} key - La clé de stockage
 * @returns {Promise<any|null>}
 */
export async function secureRetrieve(key) {
    try {
        // Essayer la version chiffrée d'abord
        if (isEncryptionEnabled() && isVaultUnlocked()) {
            const encrypted = localStorage.getItem(key + '_encrypted');
            if (encrypted) {
                return await decrypt(encrypted);
            }
        }
        
        // Fallback vers la version non chiffrée
        const plain = localStorage.getItem(key);
        return plain ? JSON.parse(plain) : null;
    } catch (error) {
        console.error('Erreur secureRetrieve:', error);
        return null;
    }
}

/**
 * Supprime des données sécurisées
 * @param {string} key - La clé de stockage
 */
export function secureRemove(key) {
    localStorage.removeItem(key);
    localStorage.removeItem(key + '_encrypted');
}

/**
 * Vérifie si un mot de passe est défini
 * @returns {boolean}
 */
export function hasPassword() {
    return localStorage.getItem(STORAGE_KEYS.passwordHash) !== null;
}

/**
 * Obtient l'état du chiffrement
 * @returns {Object}
 */
export function getEncryptionStatus() {
    return {
        supported: isEncryptionSupported(),
        enabled: isEncryptionEnabled(),
        unlocked: isVaultUnlocked(),
        hasPassword: hasPassword()
    };
}
