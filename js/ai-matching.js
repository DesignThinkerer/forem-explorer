/**
 * AI Matching Module
 * Scoring intelligent des offres d'emploi par rapport au profil candidat
 */

import { generateContent, parseJsonResponse, GeminiError, hasApiKey, canMakeRequest } from './gemini-client.js';
import { getProfile } from './cv-profile.js';
import { getUserLocation } from './state.js';
import { getDistance, showToast } from './utils.js';

// Storage pour les scores calculés
const SCORES_STORAGE = 'forem_matching_scores';

// DEBUG: Exposer des fonctions pour analyser le scoring dans la console
window.debugScoring = function() {
    const profile = getProfile();
    if (!profile) {
        console.log('❌ Pas de profil CV chargé');
        return null;
    }
    
    console.log('📋 PROFIL CV:');
    console.log('  - Headline:', profile.headline);
    console.log('  - Skills (' + (profile.skills?.length || 0) + '):', profile.skills?.map(s => s.name).join(', '));
    console.log('  - Keywords (' + (profile.keywords?.length || 0) + '):', profile.keywords?.slice(0, 20).join(', '));
    console.log('  - Location:', profile.location);
    console.log('  - Languages:', profile.languages?.map(l => l.name).join(', '));
    console.log('  - Experience:', profile.totalExperienceYears, 'ans');
    
    return profile;
};

// Tester le score d'un job fictif
window.testScore = function(jobText) {
    const profile = getProfile();
    if (!profile) {
        console.log('❌ Pas de profil CV chargé');
        return null;
    }
    
    // Créer un faux job avec le texte fourni
    const fakeJob = {
        titreoffre: jobText,
        description: jobText
    };
    
    // Importer la fonction (elle sera dispo car même module)
    const result = calculateLocalScore(profile, fakeJob);
    
    console.log('\n🎯 RÉSULTAT DU SCORING:');
    console.log('  - Score:', result.score + '%');
    console.log('  - Mots-clés matchés:', result.matchingKeywords.join(', ') || 'aucun');
    console.log('  - Fuzzy matches:', result.fuzzyMatches?.join(', ') || 'aucun');
    console.log('  - Détails:', result.details);
    
    return result;
};

/**
 * Récupère les scores stockés
 * @returns {Object} Map jobId -> score data
 */
function getStoredScores() {
    try {
        const data = localStorage.getItem(SCORES_STORAGE);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        return {};
    }
}

/**
 * Sauvegarde un score
 * @param {string} jobId - ID de l'offre
 * @param {Object} scoreData - Données du score
 */
function saveScore(jobId, scoreData) {
    try {
        const scores = getStoredScores();
        scores[jobId] = {
            ...scoreData,
            timestamp: Date.now()
        };
        localStorage.setItem(SCORES_STORAGE, JSON.stringify(scores));
    } catch (e) {
        console.error('Erreur sauvegarde score:', e);
    }
}

/**
 * Récupère un score stocké s'il existe et n'est pas expiré
 * @param {string} jobId - ID de l'offre
 * @param {number} maxAge - Âge max en ms (défaut 24h)
 * @returns {Object|null}
 */
export function getStoredScore(jobId, maxAge = 24 * 60 * 60 * 1000) {
    const scores = getStoredScores();
    const stored = scores[jobId];
    
    if (!stored) return null;
    if (Date.now() - stored.timestamp > maxAge) return null;
    
    // Validate score data is complete (not truncated)
    if (typeof stored.score !== 'number' || stored.score < 0 || stored.score > 100) {
        console.warn('Score corrompu détecté pour', jobId, '- suppression');
        delete scores[jobId];
        localStorage.setItem(SCORES_STORAGE, JSON.stringify(scores));
        return null;
    }
    
    return stored;
}

/**
 * Vérifie si le scoring IA est disponible
 * @returns {Object} { available: boolean, reason?: string }
 */
export function isAiScoringAvailable() {
    if (!hasApiKey()) {
        return { available: false, reason: 'Clé API non configurée' };
    }
    if (!canMakeRequest()) {
        return { available: false, reason: 'Quota journalier atteint' };
    }
    if (!getProfile()) {
        return { available: false, reason: 'Profil CV non importé' };
    }
    return { available: true };
}

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 * @param {string} a - Première chaîne
 * @param {string} b - Deuxième chaîne
 * @returns {number} Distance (nombre d'éditions)
 */
function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = [];
    
    // Initialiser la première colonne
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    
    // Initialiser la première ligne
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    
    // Remplir la matrice
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // suppression
                );
            }
        }
    }
    
    return matrix[b.length][a.length];
}

/**
 * Calcule la similarité entre deux chaînes (0-1)
 * @param {string} a - Première chaîne
 * @param {string} b - Deuxième chaîne
 * @returns {number} Similarité entre 0 et 1
 */
function similarity(a, b) {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    
    // Match exact
    if (aLower === bLower) return 1;
    
    // Un mot contient l'autre (ex: "Angular" dans "AngularJS")
    if (aLower.includes(bLower) || bLower.includes(aLower)) {
        return 0.9;
    }
    
    // Distance de Levenshtein
    const distance = levenshteinDistance(aLower, bLower);
    const maxLen = Math.max(aLower.length, bLower.length);
    
    return 1 - (distance / maxLen);
}

/**
 * Trouve le meilleur match pour un mot dans une liste de mots
 * @param {string} word - Le mot à chercher
 * @param {string[]} wordList - Liste de mots où chercher
 * @param {number} threshold - Seuil de similarité minimum (défaut 0.7)
 * @returns {Object|null} { word, match, similarity } ou null
 */
function findBestMatch(word, wordList, threshold = 0.7) {
    let bestMatch = null;
    let bestSimilarity = threshold;
    
    for (const candidate of wordList) {
        const sim = similarity(word, candidate);
        if (sim > bestSimilarity) {
            bestSimilarity = sim;
            bestMatch = candidate;
        }
    }
    
    if (bestMatch) {
        return { word, match: bestMatch, similarity: bestSimilarity };
    }
    return null;
}

/**
 * Extrait tous les mots significatifs d'un texte
 * @param {string} text - Le texte à analyser
 * @returns {string[]} Liste de mots uniques
 */
function extractWords(text) {
    // Extraire les mots de 3+ caractères, en minuscules
    const words = text.toLowerCase()
        .replace(/[^a-zàâäéèêëïîôùûüç\s\-\.]/gi, ' ')
        .split(/[\s\-\.\/,;:()]+/)
        .filter(w => w.length >= 3)
        .filter(w => !['les', 'des', 'une', 'pour', 'avec', 'dans', 'sur', 'par', 'aux', 'est', 'sont', 'être', 'avoir', 'vous', 'nous', 'votre', 'notre', 'cette', 'ces', 'qui', 'que', 'dont', 'the', 'and', 'for', 'with', 'you', 'your'].includes(w));
    
    return [...new Set(words)];
}

/**
 * Calcule un score local rapide (sans IA)
 * @param {Object} profile - Le profil candidat
 * @param {Object} job - L'offre d'emploi
 * @returns {Object} Score local avec détails
 */
export function calculateLocalScore(profile, job) {
    if (!profile || !job) return null;
    
    let score = 0; // Commence à 0, pas 50
    const matchingKeywords = [];
    const fuzzyMatches = []; // Matches approximatifs via Levenshtein
    const details = {};
    
    // Collecter TOUT le texte disponible de l'offre (utiliser tous les champs)
    const textParts = [];
    Object.keys(job).forEach(key => {
        const value = job[key];
        if (typeof value === 'string' && value.length > 0) {
            textParts.push(value);
        } else if (Array.isArray(value)) {
            value.forEach(v => {
                if (typeof v === 'string') textParts.push(v);
            });
        }
    });
    const jobText = textParts.join(' ').toLowerCase();
    
    // Titre de l'offre pour bonus
    const jobTitle = (job.titreoffre || job.libelleoffre || job.title || '').toLowerCase();
    
    // Si pas de texte, retourner un score neutre
    if (jobText.length < 50) {
        return {
            score: 30,
            matchingKeywords: [],
            isLocalScore: true,
            details: { noData: true }
        };
    }
    
    // Extraire tous les mots de l'offre pour le matching Levenshtein
    const jobWords = extractWords(jobText);
    const titleWords = extractWords(jobTitle);
    
    // 1. Match des compétences (max 45 points)
    if (profile.skills && profile.skills.length > 0) {
        let matched = 0;
        let titleMatched = 0;
        
        profile.skills.forEach(skill => {
            const skillLower = skill.name.toLowerCase();
            const skillWords = skillLower.split(/[\s\-\/]+/).filter(w => w.length >= 2);
            
            let isMatch = false;
            let isTitleMatch = false;
            
            // 1a. Match exact (contient le mot entier)
            if (jobText.includes(skillLower)) {
                isMatch = true;
                if (jobTitle.includes(skillLower)) {
                    isTitleMatch = true;
                }
            }
            
            // 1b. Match des sous-mots de la compétence
            if (!isMatch) {
                for (const word of skillWords) {
                    if (word.length >= 3 && jobText.includes(word)) {
                        isMatch = true;
                        if (jobTitle.includes(word)) {
                            isTitleMatch = true;
                        }
                        break;
                    }
                }
            }
            
            // 1c. Match fuzzy avec Levenshtein (seuil 0.75 = 75% similarité)
            if (!isMatch) {
                for (const word of skillWords) {
                    if (word.length >= 4) { // Seulement pour les mots de 4+ caractères
                        const fuzzyResult = findBestMatch(word, jobWords, 0.75);
                        if (fuzzyResult) {
                            isMatch = true;
                            fuzzyMatches.push(`${skill.name} ≈ ${fuzzyResult.match} (${Math.round(fuzzyResult.similarity * 100)}%)`);
                            
                            // Vérifier aussi dans le titre
                            const titleFuzzy = findBestMatch(word, titleWords, 0.75);
                            if (titleFuzzy) {
                                isTitleMatch = true;
                            }
                            break;
                        }
                    }
                }
            }
            
            if (isMatch) {
                matched++;
                matchingKeywords.push(skill.name);
                if (isTitleMatch) {
                    titleMatched++;
                }
            }
            
            // Vérifier aussi les keywords de la compétence
            if (skill.keywords) {
                skill.keywords.forEach(kw => {
                    const kwLower = kw.toLowerCase();
                    if (kwLower.length >= 3 && !matchingKeywords.includes(kw)) {
                        // Match exact
                        if (jobText.includes(kwLower)) {
                            matched += 0.5;
                            matchingKeywords.push(kw);
                        } 
                        // Match fuzzy pour les mots de 4+ caractères
                        else if (kwLower.length >= 4) {
                            const fuzzyResult = findBestMatch(kwLower, jobWords, 0.8);
                            if (fuzzyResult) {
                                matched += 0.3;
                                fuzzyMatches.push(`${kw} ≈ ${fuzzyResult.match}`);
                            }
                        }
                    }
                });
            }
        });
        
        // Score basé sur le nombre absolu de compétences matchées (pas le ratio)
        // Chaque skill matché vaut des points, avec bonus pour les premiers matches
        // 1er match = 10pts, 2e = 8pts, 3e = 6pts, 4e = 5pts, 5e+ = 3pts chacun
        let skillScore = 0;
        const matchedCount = Math.round(matched);
        if (matchedCount >= 1) skillScore += 10;
        if (matchedCount >= 2) skillScore += 8;
        if (matchedCount >= 3) skillScore += 6;
        if (matchedCount >= 4) skillScore += 5;
        if (matchedCount >= 5) skillScore += Math.min(11, (matchedCount - 4) * 3); // 3pts par skill supplémentaire, max 40 total
        score += Math.min(40, skillScore);
        
        // Bonus pour match dans le titre (+15 max, plus important)
        score += Math.min(15, titleMatched * 8);
        
        details.skillsMatched = Math.round(matched);
        details.titleMatches = titleMatched;
        details.fuzzyMatches = fuzzyMatches;
    }
    
    // 2. Match du headline/métier (max 15 points)
    if (profile.headline) {
        const headlineWords = profile.headline.toLowerCase().split(/[\s\-\/,]+/).filter(w => w.length > 3);
        let headlineMatches = 0;
        
        headlineWords.forEach(word => {
            // Match exact
            if (jobTitle.includes(word) || jobText.includes(word)) {
                headlineMatches++;
            }
            // Match fuzzy
            else if (word.length >= 4) {
                const fuzzyResult = findBestMatch(word, jobWords, 0.75);
                if (fuzzyResult) {
                    headlineMatches += 0.7;
                    fuzzyMatches.push(`headline: ${word} ≈ ${fuzzyResult.match}`);
                }
            }
        });
        
        // Points fixes par mot du headline matché (pas de ratio)
        // "developer" ou "développeur" dans le titre = très important
        const headlineScore = Math.min(15, headlineMatches * 5);
        score += headlineScore;
        details.headlineMatch = headlineMatches > 0;
        details.headlineMatchCount = headlineMatches;
    }
    
    // 3. Match des mots-clés extraits du CV (max 20 points)
    if (profile.keywords && profile.keywords.length > 0) {
        let keywordMatches = 0;
        let keywordTitleMatches = 0;
        
        profile.keywords.forEach(kw => {
            const kwLower = kw.toLowerCase();
            if (kwLower.length > 3 && jobText.includes(kwLower)) {
                keywordMatches++;
                if (!matchingKeywords.includes(kw)) {
                    matchingKeywords.push(kw);
                }
                // BONUS: keyword qui matche le TITRE de l'offre (très pertinent!)
                if (jobTitle.includes(kwLower)) {
                    keywordTitleMatches++;
                }
            }
        });
        
        // 3 points par keyword matché
        score += Math.min(12, keywordMatches * 3);
        // BONUS +8 points par keyword dans le titre (max 16)
        score += Math.min(16, keywordTitleMatches * 8);
        
        details.keywordsMatched = keywordMatches;
        details.keywordTitleMatches = keywordTitleMatches;
    }
    
    // 4. Localisation (max 15 points) - Basé sur la distance géographique
    const userLocation = getUserLocation();
    const jobGeo = job.lieuxtravailgeo?.[0];
    
    if (userLocation && jobGeo && jobGeo.lat && jobGeo.lon) {
        // Calcul de la distance réelle en km
        const distanceKm = parseFloat(getDistance(userLocation.lat, userLocation.lon, jobGeo.lat, jobGeo.lon));
        details.distanceKm = distanceKm;
        
        // Attribution des points selon la distance
        if (distanceKm <= 10) {
            score += 15;
            details.locationMatch = 'très proche';
        } else if (distanceKm <= 25) {
            score += 12;
            details.locationMatch = 'proche';
        } else if (distanceKm <= 50) {
            score += 8;
            details.locationMatch = 'accessible';
        } else if (distanceKm <= 75) {
            score += 5;
            details.locationMatch = 'éloigné';
        } else if (distanceKm <= 100) {
            score += 2;
            details.locationMatch = 'lointain';
        } else {
            details.locationMatch = 'très lointain';
        }
    } else {
        // Fallback: match par nom de ville si pas de géolocalisation
        const jobLocation = (job.localiteaffichage || job.lieuxtravaillocalite?.[0] || '').toLowerCase();
        if (profile.location && jobLocation) {
            const profileLoc = profile.location.toLowerCase();
            
            const cities = ['bruxelles', 'brussels', 'liège', 'liege', 'namur', 'charleroi', 'mons', 
                            'tournai', 'arlon', 'bruges', 'gand', 'ghent', 'anvers', 'antwerpen', 
                            'leuven', 'louvain', 'hasselt', 'wavre', 'nivelles', 'ottignies'];
            
            for (const city of cities) {
                if (profileLoc.includes(city) && jobLocation.includes(city)) {
                    score += 10;
                    details.locationMatch = 'même ville';
                    break;
                }
            }
            
            if (!details.locationMatch) {
                const regions = ['wallonie', 'flandre', 'bruxelles', 'hainaut', 'liège', 'namur', 
                                'luxembourg', 'brabant', 'limbourg', 'anvers'];
                for (const region of regions) {
                    if (profileLoc.includes(region) && jobLocation.includes(region)) {
                        score += 5;
                        details.locationMatch = 'même région';
                        break;
                    }
                }
            }
        }
    }
    
    // 5. Langues (max 10 points)
    if (profile.languages && profile.languages.length > 0) {
        const jobLangField = (job.languetravail || job.langue || '').toLowerCase();
        let langMatched = 0;
        
        profile.languages.forEach(lang => {
            const langName = lang.name.toLowerCase();
            if (jobText.includes(langName) || jobLangField.includes(langName)) {
                langMatched++;
                details.languageMatch = true;
            }
        });
        score += Math.min(10, langMatched * 5);
    }
    
    // 6. Expérience (max 10 points) - bonus si l'expérience correspond
    if (profile.totalExperienceYears !== undefined) {
        // Chercher des patterns d'expérience dans l'offre
        const expPatterns = jobText.match(/(\d+)\s*(ans?|années?|jaar)/gi);
        if (expPatterns) {
            const requiredYears = parseInt(expPatterns[0]);
            if (!isNaN(requiredYears)) {
                if (profile.totalExperienceYears >= requiredYears) {
                    score += 10;
                    details.experienceMatch = 'sufficient';
                } else if (profile.totalExperienceYears >= requiredYears * 0.7) {
                    score += 5;
                    details.experienceMatch = 'partial';
                }
            }
        } else {
            // Pas d'exigence d'expérience mentionnée = bonus léger
            score += 3;
        }
    }
    
    // Normaliser entre 10 et 95 (jamais 0% ni 100% pour le score local)
    score = Math.min(95, Math.max(10, Math.round(score)));
    
    return {
        score,
        matchingKeywords: matchingKeywords.slice(0, 15),
        fuzzyMatches: fuzzyMatches.slice(0, 10),
        isLocalScore: true,
        details
    };
}

/**
 * Génère le prompt de scoring pour Gemini
 * @param {Object} profile - Le profil candidat
 * @param {Object} job - L'offre d'emploi
 * @param {string} extraInfo - Informations supplémentaires fournies par l'utilisateur
 * @param {string} customPrompt - Prompt personnalisé avec variables (optionnel)
 * @returns {string} Le prompt
 */
function generateScoringPrompt(profile, job, extraInfo = '', customPrompt = '') {
    // Extraire les infos pertinentes du profil - max 20 skills
    const skills = profile.skills?.slice(0, 20).map(s => typeof s === 'string' ? s : s.name).filter(Boolean) || [];
    const keywords = profile.keywords?.slice(0, 10) || [];
    
    // Extraire les infos pertinentes de l'offre
    const title = job.titreoffre || job.libelleoffre || '';
    const desc = (job.descriptionoffre || '').substring(0, 600);
    
    // Construire la section infos supplémentaires si fournie
    const extraSection = extraInfo?.trim() 
        ? `\nINFOS SUPPLÉMENTAIRES FOURNIES PAR L'UTILISATEUR:\n${extraInfo.trim().substring(0, 2000)}\n`
        : '';
    
    // Log pour debug
    console.log('Job data for AI scoring:', title, job.nomemployeur, extraInfo ? '(avec infos supplémentaires)' : '', customPrompt ? '[custom prompt]' : '[default]');
    
    // Si un prompt personnalisé est fourni, remplacer les variables
    if (customPrompt) {
        return customPrompt
            .replace(/\{skills\}/g, skills.join(', '))
            .replace(/\{title\}/g, title)
            .replace(/\{description\}/g, desc)
            .replace(/\{location\}/g, job.localiteaffichage || '')
            .replace(/\{experience\}/g, String(profile.totalExperienceYears || 0))
            .replace(/\{headline\}/g, profile.headline || '')
            .replace(/\{extraInfo\}/g, extraSection)
            .replace(/\{employer\}/g, job.nomemployeur || '')
            .replace(/\{keywords\}/g, keywords.join(', '));
    }
    
    // Prompt standard par défaut
    return `Analyse ce match CV/offre. Retourne UNIQUEMENT un JSON valide sans markdown.

CV: ${profile.headline || ''}, Skills: ${skills.join(', ')}, ${profile.totalExperienceYears || 0} ans exp
Offre: ${title}, ${job.localiteaffichage || ''}
${desc}${extraSection}
Retourne ce JSON exact avec tes valeurs:
{"score":50,"skills":["match1","match2"],"missing":["manque1","manque2"],"exp":"ok","loc":"ok","txt":"Résumé de 30-50 mots expliquant la correspondance entre le profil et l'offre."}`;
}

/**
 * Score une offre avec Gemini
 * @param {Object} job - L'offre d'emploi
 * @param {boolean} force - Forcer le recalcul (ignorer le cache)
 * @param {string} extraInfo - Informations supplémentaires fournies par l'utilisateur
 * @param {Object} options - Options avancées {customPrompt, maxTokens, temperature}
 * @returns {Promise<Object>} Le score et les détails
 */
export async function scoreJobWithAi(job, force = false, extraInfo = '', options = {}) {
    const availability = isAiScoringAvailable();
    if (!availability.available) {
        throw new GeminiError(availability.reason, 'NOT_AVAILABLE');
    }
    
    // Options par défaut
    const { customPrompt = '', maxTokens = 8000, temperature = 0.1 } = options;
    
    const profile = getProfile();
    const jobId = job.numerooffreforem || job.id;
    
    // Vérifier si on a déjà un score récent (sauf si force=true)
    // Note: si extraInfo ou customPrompt est fourni, on force toujours le recalcul
    if (!force && !extraInfo && !customPrompt) {
        const cached = getStoredScore(jobId);
        if (cached) {
            console.log('Score depuis le cache local');
            return cached;
        }
    }
    
    // Générer le prompt
    const prompt = generateScoringPrompt(profile, job, extraInfo, customPrompt);
    
    // Log des paramètres utilisés
    console.log(`AI Scoring params: customPrompt=${customPrompt ? 'yes' : 'no'}, maxTokens=${maxTokens}, temperature=${temperature}`);
    
    try {
        // Appeler Gemini
        const response = await generateContent(prompt, {
            generationConfig: {
                temperature: temperature,
                maxOutputTokens: maxTokens
            },
            skipCache: true // Toujours requête fraîche pour scoring
        });
        
        // Parser la réponse JSON
        const result = parseJsonResponse(response);
        
        // Valider et normaliser le score (noms courts du prompt)
        const scoreData = {
            score: Math.min(100, Math.max(0, parseInt(result.score) || 50)),
            matchingSkills: result.skills || result.matchingSkills || [],
            missingSkills: result.missing || result.missingSkills || [],
            experienceMatch: result.exp || result.experienceMatch || 'unknown',
            locationMatch: result.loc || result.locationMatch || 'unknown',
            summary: result.txt || result.summary || '',
            recommendations: result.recommendations || [],
            isAiScore: true,
            jobId: jobId
        };
        
        // Sauvegarder le score
        saveScore(jobId, scoreData);
        
        return scoreData;
        
    } catch (error) {
        console.error('Erreur scoring IA:', error);
        
        // Fallback vers le score local
        const localScore = calculateLocalScore(profile, job);
        if (localScore) {
            localScore.error = error.message;
            return localScore;
        }
        
        throw error;
    }
}

/**
 * Score plusieurs offres en batch (plus efficace)
 * @param {Array} jobs - Liste des offres
 * @param {number} maxBatch - Nombre max par batch
 * @returns {Promise<Map>} Map jobId -> scoreData
 */
export async function scoreJobsBatch(jobs, maxBatch = 5) {
    const results = new Map();
    const profile = getProfile();
    
    if (!profile) {
        // Pas de profil, retourner des scores locaux basiques
        jobs.forEach(job => {
            const jobId = job.numerooffreforem || job.id;
            results.set(jobId, { score: 50, isLocalScore: true, noProfile: true });
        });
        return results;
    }
    
    // D'abord calculer les scores locaux pour tous
    jobs.forEach(job => {
        const jobId = job.numerooffreforem || job.id;
        
        // Vérifier le cache
        const cached = getStoredScore(jobId);
        if (cached) {
            results.set(jobId, cached);
            return;
        }
        
        // Score local comme fallback
        const localScore = calculateLocalScore(profile, job);
        if (localScore) {
            results.set(jobId, localScore);
        }
    });

    return results;
}

/**
 * Score un lot d'offres avec Gemini en une seule requête (Batch processing)
 * Optimise l'utilisation de l'API et évite les rate limits.
 * @param {Array} jobs - Tableau d'offres (max 5-10 recommandés)
 * @param {Function} onWaiting - Callback appelé pendant l'attente avec les secondes restantes
 * @returns {Promise<Map>} Map jobId -> scoreData
 */
export async function scoreBatchWithAi(jobs, onWaiting = null) {
    const availability = isAiScoringAvailable();
    if (!availability.available) {
        throw new GeminiError(availability.reason, 'NOT_AVAILABLE');
    }
    
    const profile = getProfile();
    if (!profile) throw new Error("Profil non trouvé");

    const batchSize = jobs.length;
    console.log(`Préparation du batch de ${batchSize} offres pour l'IA`);

    // Préparer la liste des offres pour le prompt
    const jobsContent = jobs.map(job => {
        const id = job.numerooffreforem || job.id;
        const title = job.titreoffre || job.libelleoffre || 'Sans titre';
        const employer = job.nomemployeur || '';
        const location = job.localiteaffichage || '';
        // Description plus courte pour le batch afin de ne pas exploser les tokens
        const desc = (job.descriptionoffre || '').substring(0, 400).replace(/(\r\n|\n|\r)/gm, " ");
        
        return `JOB_ID: ${id}
Titre: ${title} (${employer}) - ${location}
Description: ${desc}
---`;
    }).join('\n');

    const skills = profile.skills?.slice(0, 15).map(s => typeof s === 'string' ? s : s.name).filter(Boolean) || [];
    
    const prompt = `Tu es un expert en recrutement. Analyse ces ${batchSize} offres d'emploi par rapport au profil suivant.
    
PROFIL CANDIDAT:
Titre: ${profile.headline || 'Non spécifié'}
Compétences: ${skills.join(', ')}
Expérience: ${profile.totalExperienceYears || 0} ans
Localisation: ${profile.location || 'Non spécifiée'}

OFFRES A ANALYSER:
${jobsContent}

INSTRUCTIONS:
Pour chaque offre, évalue la correspondance (0-100).
Retourne Un OBJET JSON unique où les clés sont les JOB_ID.
Format JSON attendu:
{
  "JOB_ID_1": {
    "score": 75,
    "skills": ["match1", "match2"],
    "missing": ["manque1"],
    "exp": "ok",
    "loc": "ok",
    "txt": "Résumé de 30-50 mots expliquant pourquoi le profil correspond ou non à l'offre."
  },
  "JOB_ID_2": { ... }
}

Règles:
1. Score sévère mais juste.
2. "skills" = compétences du profil présentes dans l'offre.
3. "missing" = compétences importantes de l'offre absentes du profil.
4. "txt" = résumé détaillé en français (30-50 mots).
5. Retourne UNIQUEMENT du JSON valide.
`;

    try {
        // Retry logic with exponential backoff for rate limits
        let retries = 0;
        const maxRetries = 3;
        let lastError = null;
        
        while (retries <= maxRetries) {
            try {
                const response = await generateContent(prompt, {
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 4000
                    },
                    skipCache: true
                });

                const result = parseJsonResponse(response);
                const resultsMap = new Map();

                // Traiter chaque résultat
                jobs.forEach(job => {
                    const jobId = job.numerooffreforem || job.id;
                    const jobResult = result[jobId];

                    if (jobResult) {
                        const scoreData = {
                            score: Math.min(100, Math.max(0, parseInt(jobResult.score) || 50)),
                            matchingSkills: jobResult.skills || [],
                            missingSkills: jobResult.missing || [],
                            experienceMatch: jobResult.exp || 'unknown',
                            locationMatch: jobResult.loc || 'unknown',
                            summary: jobResult.txt || '',
                            isAiScore: true,
                            jobId: jobId,
                            timestamp: Date.now()
                        };
                        
                        saveScore(jobId, scoreData);
                        resultsMap.set(jobId, scoreData);
                    }
                });

                return resultsMap;
                
            } catch (error) {
                lastError = error;
                
                // Only retry on rate limit errors
                if (error.code === 'RATE_LIMITED' || error.message?.includes('429')) {
                    retries++;
                    if (retries <= maxRetries) {
                        // Longer backoff: 1min, 5min, 10min
                        const waitTimes = [60000, 300000, 600000]; // 1min, 5min, 10min
                        const waitTime = waitTimes[retries - 1];
                        const waitMinutes = Math.round(waitTime / 60000);
                        console.log(`Rate limited. Retry ${retries}/${maxRetries} in ${waitMinutes} min...`);
                        showToast(`Limite API atteinte. Nouvelle tentative dans ${waitMinutes} min...`, 'warning', Math.min(waitTime, 10000));
                        
                        // Countdown with callback
                        let remainingSeconds = Math.floor(waitTime / 1000);
                        await new Promise(resolve => {
                            const countdownInterval = setInterval(() => {
                                remainingSeconds--;
                                if (onWaiting) onWaiting(remainingSeconds);
                                if (remainingSeconds <= 0) {
                                    clearInterval(countdownInterval);
                                    resolve();
                                }
                            }, 1000);
                        });
                    }
                } else {
                    // For other errors, don't retry
                    throw error;
                }
            }
        }
        
        // All retries exhausted
        throw lastError;

    } catch (error) {
        console.error('Erreur batch IA:', error);
        throw error;
    }
}


/**
 * Obtient la couleur du badge selon le score
 * @param {number} score - Le score (0-100)
 * @returns {Object} { bg, text, border }
 */
export function getScoreColor(score) {
    if (score >= 85) {
        return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', icon: '🟢' };
    }
    if (score >= 60) {
        return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', icon: '🟡' };
    }
    if (score >= 40) {
        return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', icon: '🟠' };
    }
    return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', icon: '🔴' };
}

/**
 * Génère le HTML du badge de score
 * @param {Object} scoreData - Les données du score
 * @returns {string} HTML du badge
 */
export function renderScoreBadge(scoreData) {
    if (!scoreData || scoreData.score === undefined) return '';
    
    const colors = getScoreColor(scoreData.score);
    const isAi = scoreData.isAiScore;
    
    return `
        <div class="flex items-center gap-1 px-2 py-1 rounded-lg ${colors.bg} ${colors.border} border" title="${isAi ? 'Score IA' : 'Score estimé'}">
            <span class="text-sm font-bold ${colors.text}">${scoreData.score}%</span>
            ${isAi ? '<i data-lucide="sparkles" class="h-3 w-3 text-violet-500"></i>' : ''}
        </div>
    `;
}

/**
 * Génère le HTML des compétences matchées
 * @param {Object} scoreData - Les données du score
 * @returns {string} HTML des tags
 */
export function renderMatchingSkills(scoreData) {
    if (!scoreData) return '';
    
    const skills = scoreData.matchingSkills || scoreData.matchingKeywords || [];
    if (skills.length === 0) return '';
    
    return `
        <div class="flex flex-wrap gap-1 mt-2">
            ${skills.slice(0, 5).map(skill => `
                <span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700">
                    <i data-lucide="check" class="h-3 w-3"></i>
                    ${skill}
                </span>
            `).join('')}
            ${skills.length > 5 ? `<span class="text-xs text-slate-400">+${skills.length - 5}</span>` : ''}
        </div>
    `;
}

/**
 * Vide tous les scores stockés
 */
export function clearAllScores() {
    localStorage.removeItem(SCORES_STORAGE);
}

/**
 * Obtient des statistiques sur les scores
 * @returns {Object} Statistiques
 */
export function getScoresStats() {
    const scores = getStoredScores();
    const values = Object.values(scores);
    
    if (values.length === 0) {
        return { count: 0, average: 0, aiCount: 0 };
    }
    
    const sum = values.reduce((acc, s) => acc + (s.score || 0), 0);
    const aiCount = values.filter(s => s.isAiScore).length;
    
    return {
        count: values.length,
        average: Math.round(sum / values.length),
        aiCount: aiCount,
        localCount: values.length - aiCount
    };
}
