/**
 * Gemini Configuration Module
 * Gère la configuration et la clé API Gemini
 */

const GEMINI_KEY_STORAGE = 'forem_gemini_key';
const GEMINI_USAGE_STORAGE = 'forem_gemini_usage';

/**
 * Configuration par défaut de Gemini
 */
export const GEMINI_CONFIG = {
    // Modèle à utiliser (gemini-2.5-flash est stable et recommandé par la doc)
    model: 'gemini-2.5-flash',
    
    // URL de base de l'API
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    
    // Paramètres de génération
    generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        topP: 0.95,
        topK: 40
    },
    
    // Rate limiting côté client
    limits: {
        maxRequestsPerMinute: 15,
        maxRequestsPerDay: 1500 // 1500 RPD pour le tier gratuit
    },
    
    // Cache
    cache: {
        enabled: true,
        duration: 24 * 60 * 60 * 1000 // 24h en ms
    }
};

/**
 * Sauvegarde la clé API Gemini (encodée en base64 simple)
 * Note: Pour une vraie sécurité, utiliser Web Crypto API (Phase 5)
 * @param {string} apiKey - La clé API
 */
export function saveApiKey(apiKey) {
    try {
        // Encodage simple pour éviter le stockage en clair
        const encoded = btoa(apiKey);
        localStorage.setItem(GEMINI_KEY_STORAGE, encoded);
        return true;
    } catch (e) {
        console.error('Erreur lors de la sauvegarde de la clé API:', e);
        return false;
    }
}

/**
 * Récupère la clé API Gemini
 * @returns {string|null} La clé API ou null
 */
export function getApiKey() {
    try {
        const encoded = localStorage.getItem(GEMINI_KEY_STORAGE);
        if (!encoded) return null;
        return atob(encoded);
    } catch (e) {
        console.error('Erreur lors de la lecture de la clé API:', e);
        return null;
    }
}

/**
 * Vérifie si une clé API est configurée
 * @returns {boolean}
 */
export function hasApiKey() {
    return localStorage.getItem(GEMINI_KEY_STORAGE) !== null;
}

/**
 * Supprime la clé API
 */
export function clearApiKey() {
    localStorage.removeItem(GEMINI_KEY_STORAGE);
}

/**
 * Obtient les statistiques d'utilisation
 * @returns {Object} { today: number, lastReset: string }
 */
export function getUsageStats() {
    try {
        const data = localStorage.getItem(GEMINI_USAGE_STORAGE);
        if (!data) {
            return { today: 0, lastReset: new Date().toDateString() };
        }
        
        const usage = JSON.parse(data);
        
        // Reset si nouveau jour
        if (usage.lastReset !== new Date().toDateString()) {
            return { today: 0, lastReset: new Date().toDateString() };
        }
        
        return usage;
    } catch (e) {
        return { today: 0, lastReset: new Date().toDateString() };
    }
}

/**
 * Incrémente le compteur d'utilisation
 */
export function incrementUsage() {
    const stats = getUsageStats();
    stats.today++;
    stats.lastReset = new Date().toDateString();
    localStorage.setItem(GEMINI_USAGE_STORAGE, JSON.stringify(stats));
}

/**
 * Vérifie si on peut faire une nouvelle requête (quota journalier)
 * @returns {boolean}
 */
export function canMakeRequest() {
    const stats = getUsageStats();
    return stats.today < GEMINI_CONFIG.limits.maxRequestsPerDay;
}

/**
 * Obtient le nombre de requêtes restantes aujourd'hui
 * @returns {number}
 */
export function getRemainingRequests() {
    const stats = getUsageStats();
    return Math.max(0, GEMINI_CONFIG.limits.maxRequestsPerDay - stats.today);
}

/**
 * Masque la clé API pour l'affichage
 * @param {string} apiKey - La clé API
 * @returns {string} La clé masquée (ex: "AIza...xyz")
 */
export function maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 10) return '***';
    return apiKey.substring(0, 4) + '•'.repeat(20) + apiKey.substring(apiKey.length - 3);
}
