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
    
    let score = 50; // Score de base
    const matchingKeywords = [];
    const details = {};
    
    // Texte de l'offre à analyser
    const jobText = [
        job.libelleoffre || job.title || '',
        job.descriptionoffre || job.description || '',
        job.competencesrequises || '',
        job.languetravail || ''
    ].join(' ').toLowerCase();
    
    // Match des compétences
    if (profile.skills && profile.skills.length > 0) {
        let matched = 0;
        profile.skills.forEach(skill => {
            const skillLower = skill.name.toLowerCase();
            if (jobText.includes(skillLower)) {
                matched++;
                matchingKeywords.push(skill.name);
            }
            // Vérifier aussi les keywords de la compétence
            if (skill.keywords) {
                skill.keywords.forEach(kw => {
                    if (jobText.includes(kw.toLowerCase()) && !matchingKeywords.includes(kw)) {
                        matched++;
                        matchingKeywords.push(kw);
                    }
                });
            }
        });
        
        const skillScore = Math.min(40, (matched / Math.max(5, profile.skills.length)) * 40);
        score += skillScore;
        details.skillsMatched = matched;
    }
    
    // Match des mots-clés généraux
    if (profile.keywords && profile.keywords.length > 0) {
        let keywordMatches = 0;
        profile.keywords.forEach(kw => {
            if (jobText.includes(kw.toLowerCase())) {
                keywordMatches++;
                if (!matchingKeywords.includes(kw)) {
                    matchingKeywords.push(kw);
                }
            }
        });
        details.keywordsMatched = keywordMatches;
    }
    
    // Localisation
    if (profile.location && job.localiteaffichage) {
        const profileLoc = profile.location.toLowerCase();
        const jobLoc = job.localiteaffichage.toLowerCase();
        
        // Extraction des villes principales de Belgique
        const cities = ['bruxelles', 'liège', 'namur', 'charleroi', 'mons', 'tournai', 'arlon', 'bruges', 'gand', 'anvers'];
        
        for (const city of cities) {
            if (profileLoc.includes(city) && jobLoc.includes(city)) {
                score += 5;
                details.locationMatch = true;
                break;
            }
        }
    }
    
    // Langues
    if (profile.languages && job.languetravail) {
        const jobLang = job.languetravail.toLowerCase();
        profile.languages.forEach(lang => {
            if (jobLang.includes(lang.name.toLowerCase())) {
                score += 3;
                details.languageMatch = true;
            }
        });
    }
    
    // Normaliser le score entre 0 et 100
    score = Math.min(100, Math.max(0, Math.round(score)));
    
    return {
        score,
        matchingKeywords: matchingKeywords.slice(0, 10),
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
