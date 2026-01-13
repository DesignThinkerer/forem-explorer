/**
 * Gemini Client Module
 * Client API pour communiquer avec Google Gemini
 */

import { 
    GEMINI_CONFIG, 
    getApiKey, 
    hasApiKey, 
    incrementUsage, 
    canMakeRequest,
    getRemainingRequests 
} from './gemini-config.js';

// Cache des réponses
const CACHE_STORAGE = 'forem_ai_cache';

/**
 * Récupère le cache des réponses
 * @returns {Object} Le cache
 */
function getCache() {
    try {
        const data = localStorage.getItem(CACHE_STORAGE);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        return {};
    }
}

/**
 * Sauvegarde dans le cache
 * @param {string} key - Clé de cache
 * @param {*} value - Valeur à cacher
 */
function setCache(key, value) {
    try {
        const cache = getCache();
        cache[key] = {
            value,
            timestamp: Date.now()
        };
        
        // Limiter la taille du cache (max 100 entrées)
        const keys = Object.keys(cache);
        if (keys.length > 100) {
            // Supprimer les 20 plus anciennes
            const sorted = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
            sorted.slice(0, 20).forEach(k => delete cache[k]);
        }
        
        localStorage.setItem(CACHE_STORAGE, JSON.stringify(cache));
    } catch (e) {
        console.error('Erreur cache:', e);
    }
}

/**
 * Récupère une valeur du cache si elle existe et n'est pas expirée
 * @param {string} key - Clé de cache
 * @returns {*|null} La valeur ou null
 */
function getCached(key) {
    if (!GEMINI_CONFIG.cache.enabled) return null;
    
    const cache = getCache();
    const entry = cache[key];
    
    if (!entry) return null;
    
    // Vérifier l'expiration
    if (Date.now() - entry.timestamp > GEMINI_CONFIG.cache.duration) {
        return null;
    }
    
    return entry.value;
}

/**
 * Vide le cache des réponses Gemini
 */
export function clearGeminiCache() {
    localStorage.removeItem(CACHE_STORAGE);
    console.log('Gemini cache cleared');
}

// Exposer pour debug dans la console
window.clearGeminiCache = clearGeminiCache;

/**
 * Génère une clé de cache à partir du prompt
 * @param {string} prompt - Le prompt
 * @returns {string} Hash du prompt
 */
function generateCacheKey(prompt) {
    // Simple hash pour la clé
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
        const char = prompt.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'gemini_' + hash.toString(36);
}

/**
 * Erreur personnalisée pour les problèmes Gemini
 */
export class GeminiError extends Error {
    constructor(message, code, details = null) {
        super(message);
        this.name = 'GeminiError';
        this.code = code;
        this.details = details;
    }
}

/**
 * Vérifie que l'API est configurée et prête
 * @throws {GeminiError} Si non configurée
 */
function checkApiReady() {
    if (!hasApiKey()) {
        throw new GeminiError(
            'Clé API Gemini non configurée. Allez dans Profil > Configuration IA.',
            'NO_API_KEY'
        );
    }
    
    if (!canMakeRequest()) {
        throw new GeminiError(
            `Quota journalier atteint (${GEMINI_CONFIG.limits.maxRequestsPerDay} requêtes). Réessayez demain.`,
            'QUOTA_EXCEEDED'
        );
    }
}

/**
 * Envoie une requête à l'API Gemini
 * @param {string} prompt - Le prompt à envoyer
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<string>} La réponse texte
 */
export async function generateContent(prompt, options = {}) {
    checkApiReady();
    
    // Vérifier le cache
    const cacheKey = generateCacheKey(prompt);
    const cached = getCached(cacheKey);
    if (cached && !options.skipCache) {
        console.log('Gemini: Réponse depuis le cache');
        return cached;
    }
    
    const apiKey = getApiKey();
    const model = options.model || GEMINI_CONFIG.model;
    const url = `${GEMINI_CONFIG.apiUrl}/${model}:generateContent?key=${apiKey}`;
    
    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            ...GEMINI_CONFIG.generationConfig,
            ...options.generationConfig
        }
    };
    
    // Ajouter les instructions de sécurité si demandé
    if (options.safetySettings) {
        requestBody.safetySettings = options.safetySettings;
    }
    
    try {
        console.log('Gemini: Envoi de la requête...');
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            if (response.status === 401 || response.status === 403) {
                throw new GeminiError(
                    'Clé API invalide ou expirée',
                    'INVALID_API_KEY',
                    errorData
                );
            }
            
            if (response.status === 429) {
                throw new GeminiError(
                    'Trop de requêtes. Veuillez patienter.',
                    'RATE_LIMITED',
                    errorData
                );
            }
            
            throw new GeminiError(
                `Erreur API: ${response.status} ${response.statusText}`,
                'API_ERROR',
                errorData
            );
        }
        
        const data = await response.json();
        
        // Extraire le texte de la réponse
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
            throw new GeminiError(
                'Réponse vide de l\'API',
                'EMPTY_RESPONSE',
                data
            );
        }
        
        // Incrémenter l'usage
        incrementUsage();
        
        // Mettre en cache
        setCache(cacheKey, text);
        
        console.log('Gemini: Réponse reçue');
        return text;
        
    } catch (error) {
        if (error instanceof GeminiError) {
            throw error;
        }
        
        // Erreur réseau
        throw new GeminiError(
            'Erreur de connexion à l\'API Gemini',
            'NETWORK_ERROR',
            { originalError: error.message }
        );
    }
}

/**
 * Parse une réponse JSON de Gemini
 * @param {string} text - Le texte de réponse
 * @returns {Object} L'objet JSON parsé
 */
export function parseJsonResponse(text) {
    // Nettoyer la réponse (enlever les backticks markdown si présents)
    let cleaned = text.trim();
    
    // Log pour debug
    console.log('Gemini raw response (start):', cleaned.substring(0, 200));
    console.log('Gemini raw response (end):', cleaned.substring(Math.max(0, cleaned.length - 100)));
    
    // Enlever les blocs de code markdown (```json ... ``` ou ``` ... ```)
    // Regex plus robuste pour gérer les variantes
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    
    cleaned = cleaned.trim();
    
    // Essayer de trouver un objet JSON dans la réponse
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        cleaned = jsonMatch[0];
    }
    
    console.log('Cleaned JSON (first 300 chars):', cleaned.substring(0, 300));
    console.log('Cleaned JSON (last 100 chars):', cleaned.substring(Math.max(0, cleaned.length - 100)));
    
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        // Essayer de réparer les problèmes courants
        try {
            // Remplacer les single quotes par des double quotes
            let fixed = cleaned.replace(/'/g, '"');
            // Enlever les virgules trailing
            fixed = fixed.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
            return JSON.parse(fixed);
        } catch (e2) {
            // Essayer de compléter un JSON tronqué
            try {
                let truncated = cleaned;
                
                // 1. Stratégie basée sur la fin de chaîne
                // Si ça se termine par ", (non échappé) -> C'est un séparateur, on l'enlève
                if (truncated.match(/(^|[^\\])"\s*,\s*$/)) {
                    truncated = truncated.replace(/,\s*$/, '');
                }
                // Si ça se termine par }, ou ], -> C'est un séparateur, on l'enlève
                else if (truncated.match(/[\}\]]\s*,\s*$/)) {
                    truncated = truncated.replace(/,\s*$/, '');
                }
                // Sinon analyse des quotes
                else {
                    // Compter uniquement les guillemets NON échappés
                    let validQuotes = 0;
                    for (let i = 0; i < truncated.length; i++) {
                        if (truncated[i] === '"') {
                            // Vérifier si échappé (précédé par un nombre impair de backslashes)
                            let backslashes = 0;
                            let j = i - 1;
                            while (j >= 0 && truncated[j] === '\\') {
                                backslashes++;
                                j--;
                            }
                            if (backslashes % 2 === 0) {
                                validQuotes++;
                            }
                        }
                    }
                    
                    if (validQuotes % 2 !== 0) {
                        truncated += '"';
                    }
                    
                    // Si ça se termine par une virgule après fermeture éventuelle
                    if (truncated.match(/,\s*$/)) {
                        truncated = truncated.replace(/,\s*$/, '');
                    }
                }
                
                // Compter les accolades/crochets ouverts
                const openBraces = (truncated.match(/\{/g) || []).length;
                const closeBraces = (truncated.match(/\}/g) || []).length;
                const openBrackets = (truncated.match(/\[/g) || []).length;
                const closeBrackets = (truncated.match(/\]/g) || []).length;
                
                // Fermer les structures ouvertes
                truncated += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
                truncated += '}'.repeat(Math.max(0, openBraces - closeBraces));
                
                console.log('Attempting to fix truncated JSON:', truncated);
                return JSON.parse(truncated);
            } catch (e3) {
                console.error('JSON parse failed. Full cleaned text:', cleaned);
                throw new GeminiError(
                    'La réponse n\'est pas un JSON valide',
                    'INVALID_JSON',
                    { text: cleaned.substring(0, 500), error: e.message }
                );
            }
        }
    }
}

/**
 * Teste la connexion à l'API Gemini
 * @returns {Promise<Object>} { success: boolean, message: string }
 */
export async function testConnection() {
    try {
        checkApiReady();
        
        const response = await generateContent(
            'Réponds uniquement par "OK" si tu reçois ce message.',
            { skipCache: true }
        );
        
        return {
            success: true,
            message: 'Connexion réussie!',
            response: response.trim()
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            code: error.code || 'UNKNOWN_ERROR'
        };
    }
}

/**
 * Vide le cache des réponses
 */
export function clearCache() {
    localStorage.removeItem(CACHE_STORAGE);
}

/**
 * Obtient les statistiques du cache
 * @returns {Object} { entries: number, size: string }
 */
export function getCacheStats() {
    const cache = getCache();
    const entries = Object.keys(cache).length;
    const size = new Blob([JSON.stringify(cache)]).size;
    
    return {
        entries,
        size: size > 1024 ? `${(size / 1024).toFixed(1)} KB` : `${size} B`
    };
}

// Export des fonctions utilitaires de config
export { hasApiKey, canMakeRequest, getRemainingRequests };
