/**
 * AI Matching Module
 * Scoring intelligent des offres d'emploi par rapport au profil candidat
 */

import { generateContent, parseJsonResponse, GeminiError, hasApiKey, canMakeRequest } from './gemini-client.js';
import { getProfile } from './cv-profile.js';

// Storage pour les scores calculés
const SCORES_STORAGE = 'forem_matching_scores';

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
 * Calcule un score local rapide (sans IA)
 * @param {Object} profile - Le profil candidat
 * @param {Object} job - L'offre d'emploi
 * @returns {Object} Score local avec détails
 */
export function calculateLocalScore(profile, job) {
    if (!profile || !job) return null;
    
    let score = 0; // Commence à 0, pas 50
    const matchingKeywords = [];
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
    
    // 1. Match des compétences (max 45 points)
    if (profile.skills && profile.skills.length > 0) {
        let matched = 0;
        let titleMatched = 0;
        
        profile.skills.forEach(skill => {
            const skillLower = skill.name.toLowerCase();
            const skillWords = skillLower.split(/[\s\-\/]+/);
            
            // Match exact ou partiel
            const isMatch = jobText.includes(skillLower) || 
                           skillWords.some(w => w.length > 3 && jobText.includes(w));
            
            if (isMatch) {
                matched++;
                matchingKeywords.push(skill.name);
                
                // Bonus si dans le titre
                if (jobTitle.includes(skillLower) || skillWords.some(w => w.length > 3 && jobTitle.includes(w))) {
                    titleMatched++;
                }
            }
            
            // Vérifier aussi les keywords de la compétence
            if (skill.keywords) {
                skill.keywords.forEach(kw => {
                    const kwLower = kw.toLowerCase();
                    if (kwLower.length > 2 && jobText.includes(kwLower) && !matchingKeywords.includes(kw)) {
                        matched += 0.5;
                        matchingKeywords.push(kw);
                    }
                });
            }
        });
        
        // Score proportionnel au nombre de compétences matchées
        const matchRatio = matched / Math.max(3, profile.skills.length);
        const skillScore = Math.min(35, Math.round(matchRatio * 50));
        score += skillScore;
        
        // Bonus pour match dans le titre (+10 max)
        score += Math.min(10, titleMatched * 5);
        
        details.skillsMatched = Math.round(matched);
        details.titleMatches = titleMatched;
    }
    
    // 2. Match du headline/métier (max 15 points)
    if (profile.headline) {
        const headlineWords = profile.headline.toLowerCase().split(/[\s\-\/,]+/).filter(w => w.length > 3);
        let headlineMatches = 0;
        
        headlineWords.forEach(word => {
            if (jobTitle.includes(word) || jobText.includes(word)) {
                headlineMatches++;
            }
        });
        
        const headlineScore = Math.min(15, Math.round((headlineMatches / Math.max(1, headlineWords.length)) * 20));
        score += headlineScore;
        details.headlineMatch = headlineMatches > 0;
    }
    
    // 3. Match des mots-clés extraits du CV (max 10 points)
    if (profile.keywords && profile.keywords.length > 0) {
        let keywordMatches = 0;
        profile.keywords.forEach(kw => {
            if (kw.length > 3 && jobText.includes(kw.toLowerCase())) {
                keywordMatches++;
                if (!matchingKeywords.includes(kw)) {
                    matchingKeywords.push(kw);
                }
            }
        });
        score += Math.min(10, keywordMatches * 2);
        details.keywordsMatched = keywordMatches;
    }
    
    // 4. Localisation (max 10 points)
    const jobLocation = (job.localiteaffichage || job.lieuxtravaillocalite?.[0] || '').toLowerCase();
    if (profile.location && jobLocation) {
        const profileLoc = profile.location.toLowerCase();
        
        // Villes belges
        const cities = ['bruxelles', 'brussels', 'liège', 'liege', 'namur', 'charleroi', 'mons', 
                        'tournai', 'arlon', 'bruges', 'gand', 'ghent', 'anvers', 'antwerpen', 
                        'leuven', 'louvain', 'hasselt', 'wavre', 'nivelles', 'ottignies'];
        
        for (const city of cities) {
            if (profileLoc.includes(city) && jobLocation.includes(city)) {
                score += 10;
                details.locationMatch = 'exact';
                break;
            }
        }
        
        // Match de province/région
        if (!details.locationMatch) {
            const regions = ['wallonie', 'flandre', 'bruxelles', 'hainaut', 'liège', 'namur', 
                            'luxembourg', 'brabant', 'limbourg', 'anvers'];
            for (const region of regions) {
                if (profileLoc.includes(region) && jobLocation.includes(region)) {
                    score += 5;
                    details.locationMatch = 'region';
                    break;
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
        isLocalScore: true,
        details
    };
}

/**
 * Génère le prompt de scoring pour Gemini
 * @param {Object} profile - Le profil candidat
 * @param {Object} job - L'offre d'emploi
 * @returns {string} Le prompt
 */
function generateScoringPrompt(profile, job) {
    // Extraire les infos pertinentes du profil (ne pas envoyer tout le CV)
    const profileSummary = {
        headline: profile.headline || '',
        skills: profile.skills?.slice(0, 15).map(s => s.name) || [],
        experienceYears: profile.totalExperienceYears || 0,
        educationLevel: profile.educationLevel || 'unknown',
        languages: profile.languages?.map(l => `${l.name} (${l.level})`) || [],
        location: profile.location || ''
    };
    
    // Extraire les infos pertinentes de l'offre
    const jobSummary = {
        title: job.libelleoffre || job.title || 'Non spécifié',
        company: job.employeur?.denomination || job.company || 'Non spécifié',
        description: (job.descriptionoffre || job.description || '').substring(0, 1000),
        skills: job.competencesrequises || '',
        experience: job.experienceexige || job.experience || '',
        location: job.localiteaffichage || job.location || '',
        contract: job.regimetravail || '',
        language: job.languetravail || ''
    };
    
    return `Tu es un expert en recrutement. Analyse la correspondance entre ce profil candidat et cette offre d'emploi.

## Profil candidat
- Titre: ${profileSummary.headline}
- Compétences: ${profileSummary.skills.join(', ')}
- Expérience: ${profileSummary.experienceYears} ans
- Formation: ${profileSummary.educationLevel}
- Langues: ${profileSummary.languages.join(', ')}
- Localisation: ${profileSummary.location}

## Offre d'emploi
- Titre: ${jobSummary.title}
- Entreprise: ${jobSummary.company}
- Description: ${jobSummary.description}
- Compétences requises: ${jobSummary.skills}
- Expérience requise: ${jobSummary.experience}
- Localisation: ${jobSummary.location}
- Contrat: ${jobSummary.contract}
- Langue de travail: ${jobSummary.language}

## Instructions
Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks):
{
  "score": <number 0-100>,
  "matchingSkills": ["skill1", "skill2"],
  "missingSkills": ["skill1", "skill2"],
  "experienceMatch": "excellent|good|partial|insufficient",
  "locationMatch": "exact|nearby|remote_possible|far",
  "summary": "<résumé de 2-3 phrases en français>",
  "recommendations": ["conseil1", "conseil2"]
}`;
}

/**
 * Score une offre avec Gemini
 * @param {Object} job - L'offre d'emploi
 * @returns {Promise<Object>} Le score et les détails
 */
export async function scoreJobWithAi(job) {
    const availability = isAiScoringAvailable();
    if (!availability.available) {
        throw new GeminiError(availability.reason, 'NOT_AVAILABLE');
    }
    
    const profile = getProfile();
    const jobId = job.numerooffreforem || job.id;
    
    // Vérifier si on a déjà un score récent
    const cached = getStoredScore(jobId);
    if (cached) {
        console.log('Score depuis le cache local');
        return cached;
    }
    
    // Générer le prompt
    const prompt = generateScoringPrompt(profile, job);
    
    try {
        // Appeler Gemini
        const response = await generateContent(prompt, {
            generationConfig: {
                temperature: 0.3, // Plus déterministe pour le scoring
                maxOutputTokens: 1024
            }
        });
        
        // Parser la réponse JSON
        const result = parseJsonResponse(response);
        
        // Valider et normaliser le score
        const scoreData = {
            score: Math.min(100, Math.max(0, parseInt(result.score) || 50)),
            matchingSkills: result.matchingSkills || [],
            missingSkills: result.missingSkills || [],
            experienceMatch: result.experienceMatch || 'unknown',
            locationMatch: result.locationMatch || 'unknown',
            summary: result.summary || '',
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
    
    // Si l'IA est disponible, enrichir les scores les plus prometteurs
    const availability = isAiScoringAvailable();
    if (availability.available) {
        // Trier par score local décroissant et prendre les top
        const jobsToScore = jobs
            .filter(job => {
                const jobId = job.numerooffreforem || job.id;
                const existing = results.get(jobId);
                return existing && existing.isLocalScore && existing.score >= 60;
            })
            .slice(0, maxBatch);
        
        // Scorer avec l'IA (en séquentiel pour respecter les rate limits)
        for (const job of jobsToScore) {
            try {
                const aiScore = await scoreJobWithAi(job);
                const jobId = job.numerooffreforem || job.id;
                results.set(jobId, aiScore);
            } catch (error) {
                console.warn('Erreur scoring IA pour', job.numerooffreforem, error.message);
            }
        }
    }
    
    return results;
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
