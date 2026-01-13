/**
 * AI Cover Letter Module
 * Génération de lettres de motivation avec Gemini
 */

import { generateContent, GeminiError, hasApiKey, canMakeRequest } from './gemini-client.js';
import { getProfile } from './cv-profile.js';

// Storage pour les lettres sauvegardées
const LETTERS_STORAGE = 'forem_cover_letters';

/**
 * Styles de lettres disponibles
 */
export const LETTER_STYLES = {
    formal: {
        id: 'formal',
        name: 'Formel',
        description: 'Ton professionnel et conventionnel',
        icon: '👔'
    },
    balanced: {
        id: 'balanced',
        name: 'Équilibré',
        description: 'Professionnel mais accessible',
        icon: '⚖️'
    },
    dynamic: {
        id: 'dynamic',
        name: 'Dynamique',
        description: 'Ton enthousiaste et moderne',
        icon: '🚀'
    }
};

/**
 * Vérifie si la génération de lettres est disponible
 * @returns {Object} { available: boolean, reason?: string }
 */
export function isLetterGenerationAvailable() {
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
 * Génère le prompt pour la lettre de motivation
 * @param {Object} profile - Le profil candidat
 * @param {Object} job - L'offre d'emploi
 * @param {string} style - Le style de lettre
 * @param {string} highlights - Points à mettre en avant (optionnel)
 * @returns {string} Le prompt
 */
function generateLetterPrompt(profile, job, style = 'balanced', highlights = '') {
    // Extraire les infos pertinentes du profil
    const profileSummary = {
        name: profile.name || 'Candidat',
        headline: profile.headline || '',
        skills: profile.skills?.slice(0, 10).map(s => s.name) || [],
        experienceYears: profile.totalExperienceYears || 0,
        experiences: profile.experiences?.slice(0, 3).map(e => `${e.position} chez ${e.company}`) || [],
        educationLevel: profile.educationLevel || 'unknown',
        languages: profile.languages?.map(l => l.name) || [],
        location: profile.location || ''
    };
    
    // Extraire les infos pertinentes de l'offre
    const jobSummary = {
        title: job.libelleoffre || job.title || 'Non spécifié',
        company: job.employeur?.denomination || job.nomemployeur || job.company || 'l\'entreprise',
        description: (job.descriptionoffre || job.description || '').substring(0, 1500),
        skills: job.competencesrequises || '',
        location: job.localiteaffichage || job.location || ''
    };

    const styleInstructions = {
        formal: 'un ton très professionnel et formel, utilise un vocabulaire soutenu',
        balanced: 'un ton professionnel mais accessible, équilibre formalité et personnalité',
        dynamic: 'un ton dynamique et enthousiaste, montre de l\'énergie et de la motivation'
    };

    return `Tu es un expert en rédaction de lettres de motivation professionnelles en français de Belgique.

## Profil du candidat
- Nom: ${profileSummary.name}
- Titre: ${profileSummary.headline}
- Compétences clés: ${profileSummary.skills.join(', ')}
- Expérience: ${profileSummary.experienceYears} ans
- Parcours: ${profileSummary.experiences.join(' | ')}
- Formation: ${profileSummary.educationLevel}
- Langues: ${profileSummary.languages.join(', ')}
- Localisation: ${profileSummary.location}

## Offre d'emploi
- Poste: ${jobSummary.title}
- Entreprise: ${jobSummary.company}
- Description: ${jobSummary.description}
- Compétences recherchées: ${jobSummary.skills}
- Lieu: ${jobSummary.location}

## Style demandé
${styleInstructions[style] || styleInstructions.balanced}

${highlights ? `## Points à mettre en avant\n${highlights}` : ''}

## Instructions
Rédige une lettre de motivation complète:
- En français de Belgique
- Commence par "Madame, Monsieur," (pas "À qui de droit")
- 3-4 paragraphes maximum
- Personnalisée pour l'entreprise ${jobSummary.company} et le poste ${jobSummary.title}
- Met en valeur les compétences du candidat qui correspondent au poste
- Accroche originale (évite "Je me permets de vous écrire")
- Conclue avec une formule de politesse belge appropriée
- Termine par le prénom et nom du candidat

Réponds UNIQUEMENT avec la lettre, sans introduction ni commentaire.`;
}

/**
 * Génère une lettre de motivation
 * @param {Object} job - L'offre d'emploi
 * @param {Object} options - Options { style: string, highlights: string }
 * @returns {Promise<Object>} { success: boolean, letter?: string, error?: string }
 */
export async function generateCoverLetter(job, options = {}) {
    const availability = isLetterGenerationAvailable();
    if (!availability.available) {
        return { success: false, error: availability.reason };
    }
    
    const profile = getProfile();
    const style = options.style || 'balanced';
    const highlights = options.highlights || '';
    
    try {
        const prompt = generateLetterPrompt(profile, job, style, highlights);
        
        const letter = await generateContent(prompt, {
            generationConfig: {
                temperature: 0.8, // Plus créatif pour les lettres
                maxOutputTokens: 2048
            }
        });
        
        return {
            success: true,
            letter: letter.trim(),
            jobId: job.numerooffreforem || job.id,
            jobTitle: job.libelleoffre || job.title,
            company: job.employeur?.denomination || job.nomemployeur,
            style: style,
            generatedAt: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('Erreur génération lettre:', error);
        return {
            success: false,
            error: error.message || 'Erreur lors de la génération'
        };
    }
}

/**
 * Régénère une partie de la lettre
 * @param {string} currentLetter - La lettre actuelle
 * @param {string} part - La partie à régénérer ('intro', 'body', 'conclusion')
 * @param {Object} job - L'offre d'emploi
 * @returns {Promise<Object>} { success: boolean, letter?: string, error?: string }
 */
export async function regeneratePart(currentLetter, part, job) {
    const availability = isLetterGenerationAvailable();
    if (!availability.available) {
        return { success: false, error: availability.reason };
    }
    
    const profile = getProfile();
    
    const partInstructions = {
        intro: 'Régénère uniquement le premier paragraphe (l\'accroche) de cette lettre de motivation. Garde le reste identique.',
        body: 'Régénère uniquement le/les paragraphe(s) du milieu de cette lettre. Garde l\'introduction et la conclusion.',
        conclusion: 'Régénère uniquement le dernier paragraphe et la formule de politesse. Garde le reste identique.'
    };
    
    const prompt = `Tu es un expert en rédaction de lettres de motivation.

## Lettre actuelle
${currentLetter}

## Profil candidat
Nom: ${profile.name}
Compétences: ${profile.skills?.slice(0, 5).map(s => s.name).join(', ')}

## Offre
Poste: ${job.libelleoffre || job.title}
Entreprise: ${job.employeur?.denomination || job.nomemployeur}

## Instruction
${partInstructions[part] || partInstructions.body}

Réponds UNIQUEMENT avec la lettre complète modifiée.`;
    
    try {
        const letter = await generateContent(prompt, {
            generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 2048
            }
        });
        
        return { success: true, letter: letter.trim() };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Sauvegarde une lettre générée
 * @param {Object} letterData - Les données de la lettre
 */
export function saveLetter(letterData) {
    try {
        const letters = getSavedLetters();
        
        // Générer un ID unique
        letterData.id = `letter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        letterData.savedAt = new Date().toISOString();
        
        letters.unshift(letterData);
        
        // Limiter à 50 lettres
        if (letters.length > 50) {
            letters.pop();
        }
        
        localStorage.setItem(LETTERS_STORAGE, JSON.stringify(letters));
        return letterData.id;
    } catch (e) {
        console.error('Erreur sauvegarde lettre:', e);
        return null;
    }
}

/**
 * Récupère les lettres sauvegardées
 * @returns {Array} Liste des lettres
 */
export function getSavedLetters() {
    try {
        const data = localStorage.getItem(LETTERS_STORAGE);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

/**
 * Récupère une lettre par son ID
 * @param {string} letterId - L'ID de la lettre
 * @returns {Object|null}
 */
export function getLetterById(letterId) {
    const letters = getSavedLetters();
    return letters.find(l => l.id === letterId) || null;
}

/**
 * Récupère les lettres pour une offre spécifique
 * @param {string} jobId - L'ID de l'offre
 * @returns {Array} Liste des lettres pour cette offre
 */
export function getLettersForJob(jobId) {
    const letters = getSavedLetters();
    return letters.filter(l => l.jobId === jobId);
}

/**
 * Supprime une lettre
 * @param {string} letterId - L'ID de la lettre
 * @returns {boolean}
 */
export function deleteLetter(letterId) {
    try {
        const letters = getSavedLetters();
        const index = letters.findIndex(l => l.id === letterId);
        if (index === -1) return false;
        
        letters.splice(index, 1);
        localStorage.setItem(LETTERS_STORAGE, JSON.stringify(letters));
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Vide toutes les lettres
 */
export function clearAllLetters() {
    localStorage.removeItem(LETTERS_STORAGE);
}

/**
 * Copie le texte dans le presse-papier
 * @param {string} text - Le texte à copier
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (e) {
        // Fallback pour les navigateurs plus anciens
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
    }
}

/**
 * Obtient des statistiques sur les lettres
 * @returns {Object}
 */
export function getLettersStats() {
    const letters = getSavedLetters();
    return {
        total: letters.length,
        byStyle: {
            formal: letters.filter(l => l.style === 'formal').length,
            balanced: letters.filter(l => l.style === 'balanced').length,
            dynamic: letters.filter(l => l.style === 'dynamic').length
        },
        uniqueJobs: new Set(letters.map(l => l.jobId)).size
    };
}
