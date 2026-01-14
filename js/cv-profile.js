/**
 * CV Profile Module
 * Extrait et normalise le profil candidat à partir du CV rx-resume
 */

import { 
    parseRxResume, 
    extractSkills, 
    calculateExperienceYears,
    extractLanguages,
    extractEducation
} from './cv-parser.js';
import { saveRawCV, saveProfile, getProfile, getRawCV, getAllProfiles, getActiveProfileId, setActiveProfile, createNewProfile, duplicateProfile, renameProfile, deleteProfile } from './cv-storage.js';

/**
 * Traite un fichier CV et crée le profil candidat
 * @param {string} jsonString - Le contenu JSON du fichier CV
 * @returns {Object} { success: boolean, profile?: Object, error?: string }
 */
export function processCV(jsonString) {
    // Parser le JSON
    const parseResult = parseRxResume(jsonString);
    
    if (!parseResult.success) {
        return {
            success: false,
            error: parseResult.error
        };
    }
    
    const cvData = parseResult.data;
    
    // Sauvegarder le CV brut
    saveRawCV(cvData);
    
    // Extraire le profil normalisé
    const profile = extractProfile(cvData);
    
    // Sauvegarder le profil
    saveProfile(profile);
    
    return {
        success: true,
        profile: profile
    };
}

/**
 * Extrait le profil normalisé du CV
 * @param {Object} cvData - Les données brutes du CV
 * @returns {Object} Le profil candidat normalisé
 */
export function extractProfile(cvData) {
    const basics = cvData.basics || {};
    const skills = extractSkills(cvData);
    const education = extractEducation(cvData);
    const languages = extractLanguages(cvData);
    const experienceYears = calculateExperienceYears(cvData);
    
    // Extraire les mots-clés pour le matching
    const keywords = new Set();
    
    // Ajouter les compétences
    skills.forEach(skill => {
        keywords.add(skill.name.toLowerCase());
        skill.keywords?.forEach(kw => keywords.add(kw.toLowerCase()));
    });
    
    // Ajouter les domaines d'éducation
    education.fields.forEach(field => {
        keywords.add(field.toLowerCase());
    });
    
    // Construire le profil
    const profile = {
        // Identité
        name: basics.name || '',
        headline: basics.headline || '',
        email: basics.email || '',
        phone: basics.phone || '',
        location: basics.location || '',
        summary: basics.summary || '',
        
        // URL et réseaux sociaux
        website: basics.url?.href || '',
        
        // Compétences
        skills: skills,
        skillsCount: skills.length,
        
        // Expérience
        totalExperienceYears: experienceYears,
        experiences: extractExperiences(cvData),
        
        // Formation
        educationLevel: education.level,
        educationFields: education.fields,
        educations: extractEducations(cvData),
        
        // Langues
        languages: languages,
        
        // Mots-clés pour le matching IA
        keywords: Array.from(keywords),
        
        // Métadonnées
        importDate: new Date().toISOString(),
        cvFormat: 'rx-resume'
    };
    
    return profile;
}

/**
 * Extrait la liste des expériences
 * @param {Object} cvData - Les données du CV
 * @returns {Array} Liste des expériences
 */
function extractExperiences(cvData) {
    if (!cvData.sections?.experience?.items) return [];
    
    return cvData.sections.experience.items.map(exp => ({
        company: exp.company || '',
        position: exp.position || '',
        location: exp.location || '',
        date: exp.date || '',
        summary: exp.summary || '',
        url: exp.url?.href || ''
    }));
}

/**
 * Extrait la liste des formations
 * @param {Object} cvData - Les données du CV
 * @returns {Array} Liste des formations
 */
function extractEducations(cvData) {
    if (!cvData.sections?.education?.items) return [];
    
    return cvData.sections.education.items.map(edu => ({
        institution: edu.institution || '',
        studyType: edu.studyType || edu.degree || '',
        area: edu.area || edu.field || '',
        date: edu.date || '',
        summary: edu.summary || '',
        score: edu.score || ''
    }));
}

/**
 * Met à jour manuellement une compétence du profil
 * @param {string} skillName - Nom de la compétence
 * @param {Object} updates - Les modifications { level?, category? }
 * @returns {boolean} Succès de la mise à jour
 */
export function updateSkill(skillName, updates) {
    const profile = getProfile();
    if (!profile) return false;
    
    const skill = profile.skills.find(s => s.name === skillName);
    if (!skill) return false;
    
    Object.assign(skill, updates);
    saveProfile(profile);
    return true;
}

/**
 * Ajoute une compétence manuelle au profil
 * @param {Object} skill - La compétence { name, level, category }
 * @returns {boolean} Succès de l'ajout
 */
export function addSkill(skill) {
    const profile = getProfile();
    if (!profile) return false;
    
    // Vérifier si la compétence existe déjà
    if (profile.skills.find(s => s.name.toLowerCase() === skill.name.toLowerCase())) {
        return false;
    }
    
    profile.skills.push({
        name: skill.name,
        level: skill.level || 3,
        category: skill.category || 'other',
        keywords: skill.keywords || [],
        manual: true
    });
    
    profile.skillsCount = profile.skills.length;
    profile.keywords.push(skill.name.toLowerCase());
    
    saveProfile(profile);
    return true;
}

/**
 * Supprime une compétence du profil
 * @param {string} skillName - Nom de la compétence à supprimer
 * @returns {boolean} Succès de la suppression
 */
export function removeSkill(skillName) {
    const profile = getProfile();
    if (!profile) return false;
    
    const index = profile.skills.findIndex(s => s.name === skillName);
    if (index === -1) return false;
    
    profile.skills.splice(index, 1);
    profile.skillsCount = profile.skills.length;
    
    // Retirer des mots-clés
    const kwIndex = profile.keywords.indexOf(skillName.toLowerCase());
    if (kwIndex > -1) {
        profile.keywords.splice(kwIndex, 1);
    }
    
    saveProfile(profile);
    return true;
}

/**
 * Obtient un résumé du profil pour l'affichage
 * @returns {Object|null} Résumé du profil
 */
export function getProfileSummary() {
    const profile = getProfile();
    if (!profile) return null;
    
    return {
        name: profile.name,
        headline: profile.headline,
        email: profile.email,
        location: profile.location,
        experienceYears: profile.totalExperienceYears,
        skillsCount: profile.skillsCount,
        topSkills: profile.skills.slice(0, 5).map(s => s.name),
        educationLevel: profile.educationLevel,
        languagesCount: profile.languages.length,
        importDate: profile.importDate
    };
}

/**
 * Met à jour les informations de base du profil
 * @param {Object} updates - Les champs à mettre à jour
 * @returns {boolean} Succès de la mise à jour
 */
export function updateProfile(updates) {
    const profile = getProfile();
    if (!profile) return false;
    
    // Mettre à jour les champs autorisés
    const allowedFields = ['name', 'headline', 'email', 'phone', 'location', 'summary', 'totalExperienceYears', 'educationLevel'];
    
    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            profile[field] = updates[field];
        }
    }
    
    saveProfile(profile);
    return true;
}

/**
 * Ajoute une langue au profil
 * @param {Object} language - La langue { name, level }
 * @returns {boolean} Succès de l'ajout
 */
export function addLanguage(language) {
    const profile = getProfile();
    if (!profile) return false;
    
    // Vérifier si la langue existe déjà
    if (profile.languages.find(l => l.name.toLowerCase() === language.name.toLowerCase())) {
        return false;
    }
    
    profile.languages.push({
        name: language.name,
        level: language.level || 'intermediate',
        manual: true
    });
    
    saveProfile(profile);
    return true;
}

/**
 * Supprime une langue du profil
 * @param {string} languageName - Nom de la langue à supprimer
 * @returns {boolean} Succès de la suppression
 */
export function removeLanguage(languageName) {
    const profile = getProfile();
    if (!profile) return false;
    
    const index = profile.languages.findIndex(l => l.name.toLowerCase() === languageName.toLowerCase());
    if (index === -1) return false;
    
    profile.languages.splice(index, 1);
    saveProfile(profile);
    return true;
}

// Exposer pour utilisation globale
export { getProfile, getRawCV, getAllProfiles, getActiveProfileId, setActiveProfile, createNewProfile, duplicateProfile, renameProfile, deleteProfile };
