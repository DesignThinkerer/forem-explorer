/**
 * Secure Storage Module
 * Module de stockage sécurisé qui gère automatiquement le chiffrement
 * Remplace les accès directs à localStorage pour les données sensibles
 */

import {
    isEncryptionEnabled,
    isVaultUnlocked,
    encrypt,
    decrypt,
    secureStore,
    secureRetrieve,
    secureRemove
} from './encryption.js';

// Clés de stockage qui doivent être chiffrées
const SENSITIVE_KEYS = [
    'forem_cv_profile',
    'forem_cv_raw',
    'forem_gemini_key',
    'forem_cover_letters'
];

// Clés qui ne sont pas chiffrées (cache, scores, etc.)
const NON_SENSITIVE_KEYS = [
    'forem_ai_cache',
    'forem_matching_scores',
    'forem_gemini_usage'
];

/**
 * Vérifie si une clé est sensible
 * @param {string} key 
 * @returns {boolean}
 */
function isSensitiveKey(key) {
    return SENSITIVE_KEYS.includes(key);
}

/**
 * Sauvegarde des données (chiffre automatiquement si nécessaire)
 * @param {string} key - La clé de stockage
 * @param {any} data - Les données à sauvegarder
 * @returns {Promise<boolean>}
 */
export async function saveData(key, data) {
    try {
        if (isSensitiveKey(key) && isEncryptionEnabled()) {
            if (!isVaultUnlocked()) {
                console.warn(`Cannot save ${key}: vault is locked`);
                return false;
            }
            return await secureStore(key, data);
        }
        
        // Stockage non chiffré
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error(`Error saving ${key}:`, e);
        return false;
    }
}

/**
 * Récupère des données (déchiffre automatiquement si nécessaire)
 * @param {string} key - La clé de stockage
 * @returns {Promise<any|null>}
 */
export async function getData(key) {
    try {
        if (isSensitiveKey(key) && isEncryptionEnabled()) {
            if (!isVaultUnlocked()) {
                // Essayer de lire la version non chiffrée (données migrées)
                const plain = localStorage.getItem(key);
                return plain ? JSON.parse(plain) : null;
            }
            return await secureRetrieve(key);
        }
        
        // Stockage non chiffré
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error(`Error reading ${key}:`, e);
        return null;
    }
}

/**
 * Supprime des données
 * @param {string} key - La clé de stockage
 */
export function removeData(key) {
    if (isSensitiveKey(key)) {
        secureRemove(key);
    } else {
        localStorage.removeItem(key);
    }
}

/**
 * Vérifie si des données existent
 * @param {string} key - La clé de stockage
 * @returns {boolean}
 */
export function hasData(key) {
    if (isEncryptionEnabled()) {
        return localStorage.getItem(key + '_encrypted') !== null || 
               localStorage.getItem(key) !== null;
    }
    return localStorage.getItem(key) !== null;
}

/**
 * Migre les données existantes vers le stockage chiffré
 * Doit être appelé après avoir déverrouillé le coffre-fort
 * @returns {Promise<Object>} Résultat de la migration
 */
export async function migrateToEncrypted() {
    if (!isEncryptionEnabled() || !isVaultUnlocked()) {
        return { success: false, message: 'Chiffrement non disponible' };
    }
    
    const results = { migrated: [], failed: [], skipped: [] };
    
    for (const key of SENSITIVE_KEYS) {
        try {
            // Vérifier si déjà chiffré
            if (localStorage.getItem(key + '_encrypted')) {
                results.skipped.push(key);
                continue;
            }
            
            // Récupérer les données non chiffrées
            const plainData = localStorage.getItem(key);
            if (!plainData) {
                results.skipped.push(key);
                continue;
            }
            
            // Chiffrer et sauvegarder
            const data = JSON.parse(plainData);
            await secureStore(key, data);
            
            // Supprimer la version non chiffrée
            localStorage.removeItem(key);
            
            results.migrated.push(key);
        } catch (e) {
            console.error(`Migration failed for ${key}:`, e);
            results.failed.push(key);
        }
    }
    
    return { 
        success: results.failed.length === 0, 
        ...results 
    };
}

/**
 * Migre les données chiffrées vers le stockage en clair
 * Utilisé lors de la désactivation du chiffrement
 * @returns {Promise<Object>}
 */
export async function migrateToPlain() {
    const results = { migrated: [], failed: [], skipped: [] };
    
    for (const key of SENSITIVE_KEYS) {
        try {
            // Vérifier si des données chiffrées existent
            const encryptedData = localStorage.getItem(key + '_encrypted');
            if (!encryptedData) {
                results.skipped.push(key);
                continue;
            }
            
            // Déchiffrer
            const data = await decrypt(encryptedData);
            
            // Sauvegarder en clair
            localStorage.setItem(key, JSON.stringify(data));
            
            // Supprimer la version chiffrée
            localStorage.removeItem(key + '_encrypted');
            
            results.migrated.push(key);
        } catch (e) {
            console.error(`Migration to plain failed for ${key}:`, e);
            results.failed.push(key);
        }
    }
    
    return { 
        success: results.failed.length === 0, 
        ...results 
    };
}

/**
 * Obtient l'état du stockage
 * @returns {Object}
 */
export function getStorageStatus() {
    const status = {
        encrypted: [],
        plain: [],
        total: 0
    };
    
    for (const key of SENSITIVE_KEYS) {
        if (localStorage.getItem(key + '_encrypted')) {
            status.encrypted.push(key);
        } else if (localStorage.getItem(key)) {
            status.plain.push(key);
        }
    }
    
    status.total = status.encrypted.length + status.plain.length;
    
    return status;
}
