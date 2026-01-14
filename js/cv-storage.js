/**
 * CV Storage Module
 * Gère le stockage multi-profils dans localStorage
 */

const PROFILES_KEY = 'forem_profiles';
const ACTIVE_PROFILE_KEY = 'forem_active_profile';

// Legacy keys for migration
const CV_RAW_KEY = 'forem_cv_raw';
const CV_PROFILE_KEY = 'forem_cv_profile';

/**
 * Génère un ID unique pour un profil
 * @returns {string}
 */
function generateProfileId() {
    return 'profile_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Migre les anciennes données vers le nouveau format multi-profils
 */
function migrateFromLegacy() {
    const profiles = localStorage.getItem(PROFILES_KEY);
    if (profiles) return; // Déjà migré
    
    const oldProfile = localStorage.getItem(CV_PROFILE_KEY);
    const oldRaw = localStorage.getItem(CV_RAW_KEY);
    
    if (oldProfile) {
        const profile = JSON.parse(oldProfile);
        const raw = oldRaw ? JSON.parse(oldRaw) : null;
        
        const profileId = generateProfileId();
        const newProfiles = [{
            id: profileId,
            name: profile.name || 'Mon CV',
            profile: profile,
            raw: raw,
            createdAt: profile.importDate || new Date().toISOString()
        }];
        
        localStorage.setItem(PROFILES_KEY, JSON.stringify(newProfiles));
        localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
        
        // Nettoyer les anciennes clés
        localStorage.removeItem(CV_RAW_KEY);
        localStorage.removeItem(CV_PROFILE_KEY);
        
        console.log('[CV Storage] Migrated legacy profile to multi-profile format');
    }
}

// Exécuter la migration au chargement
migrateFromLegacy();

/**
 * Récupère tous les profils
 * @returns {Array} Liste des profils
 */
export function getAllProfiles() {
    try {
        const data = localStorage.getItem(PROFILES_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Erreur lors de la lecture des profils:', e);
        return [];
    }
}

/**
 * Sauvegarde tous les profils
 * @param {Array} profiles 
 */
function saveAllProfiles(profiles) {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

/**
 * Récupère l'ID du profil actif
 * @returns {string|null}
 */
export function getActiveProfileId() {
    return localStorage.getItem(ACTIVE_PROFILE_KEY);
}

/**
 * Définit le profil actif
 * @param {string} profileId 
 */
export function setActiveProfile(profileId) {
    const profiles = getAllProfiles();
    if (profiles.find(p => p.id === profileId)) {
        localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
        return true;
    }
    return false;
}

/**
 * Récupère le profil actif
 * @returns {Object|null}
 */
export function getProfile() {
    const activeId = getActiveProfileId();
    if (!activeId) return null;
    
    const profiles = getAllProfiles();
    const profileData = profiles.find(p => p.id === activeId);
    return profileData?.profile || null;
}

/**
 * Récupère le CV brut du profil actif
 * @returns {Object|null}
 */
export function getRawCV() {
    const activeId = getActiveProfileId();
    if (!activeId) return null;
    
    const profiles = getAllProfiles();
    const profileData = profiles.find(p => p.id === activeId);
    return profileData?.raw || null;
}

/**
 * Sauvegarde un nouveau profil ou met à jour l'existant
 * @param {Object} profile - Le profil candidat
 * @param {Object} rawCV - Les données brutes du CV (optionnel)
 * @param {string} profileName - Nom du profil (optionnel)
 * @returns {string} L'ID du profil créé/mis à jour
 */
export function saveProfile(profile, rawCV = null, profileName = null) {
    try {
        const profiles = getAllProfiles();
        const activeId = getActiveProfileId();
        
        profile.lastUpdated = new Date().toISOString();
        
        // Si un profil actif existe, le mettre à jour
        if (activeId) {
            const index = profiles.findIndex(p => p.id === activeId);
            if (index !== -1) {
                profiles[index].profile = profile;
                if (rawCV) profiles[index].raw = rawCV;
                if (profileName) profiles[index].name = profileName;
                saveAllProfiles(profiles);
                return activeId;
            }
        }
        
        // Sinon créer un nouveau profil
        const newId = generateProfileId();
        profiles.push({
            id: newId,
            name: profileName || profile.name || 'Mon CV',
            profile: profile,
            raw: rawCV,
            createdAt: new Date().toISOString()
        });
        
        saveAllProfiles(profiles);
        localStorage.setItem(ACTIVE_PROFILE_KEY, newId);
        
        return newId;
    } catch (e) {
        console.error('Erreur lors de la sauvegarde du profil:', e);
        return null;
    }
}

/**
 * Sauvegarde le CV brut (pour compatibilité)
 * @param {Object} cvData 
 */
export function saveRawCV(cvData) {
    const activeId = getActiveProfileId();
    if (!activeId) return false;
    
    const profiles = getAllProfiles();
    const index = profiles.findIndex(p => p.id === activeId);
    
    if (index !== -1) {
        profiles[index].raw = cvData;
        saveAllProfiles(profiles);
        return true;
    }
    return false;
}

/**
 * Crée un nouveau profil vide et le définit comme actif
 * @param {string} name - Nom du profil
 * @returns {string} L'ID du nouveau profil
 */
export function createNewProfile(name = 'Nouveau profil') {
    const profiles = getAllProfiles();
    const newId = generateProfileId();
    
    profiles.push({
        id: newId,
        name: name,
        profile: null,
        raw: null,
        createdAt: new Date().toISOString()
    });
    
    saveAllProfiles(profiles);
    localStorage.setItem(ACTIVE_PROFILE_KEY, newId);
    
    return newId;
}

/**
 * Duplique un profil existant
 * @param {string} profileId - ID du profil à dupliquer
 * @param {string} newName - Nom du nouveau profil
 * @returns {string|null} L'ID du nouveau profil
 */
export function duplicateProfile(profileId, newName) {
    const profiles = getAllProfiles();
    const source = profiles.find(p => p.id === profileId);
    
    if (!source) return null;
    
    const newId = generateProfileId();
    profiles.push({
        id: newId,
        name: newName || `${source.name} (copie)`,
        profile: source.profile ? JSON.parse(JSON.stringify(source.profile)) : null,
        raw: source.raw ? JSON.parse(JSON.stringify(source.raw)) : null,
        createdAt: new Date().toISOString()
    });
    
    saveAllProfiles(profiles);
    return newId;
}

/**
 * Renomme un profil
 * @param {string} profileId 
 * @param {string} newName 
 */
export function renameProfile(profileId, newName) {
    const profiles = getAllProfiles();
    const profile = profiles.find(p => p.id === profileId);
    
    if (profile) {
        profile.name = newName;
        saveAllProfiles(profiles);
        return true;
    }
    return false;
}

/**
 * Supprime un profil
 * @param {string} profileId 
 */
export function deleteProfile(profileId) {
    let profiles = getAllProfiles();
    const index = profiles.findIndex(p => p.id === profileId);
    
    if (index === -1) return false;
    
    profiles.splice(index, 1);
    saveAllProfiles(profiles);
    
    // Si c'était le profil actif, sélectionner le premier disponible
    if (getActiveProfileId() === profileId) {
        if (profiles.length > 0) {
            localStorage.setItem(ACTIVE_PROFILE_KEY, profiles[0].id);
        } else {
            localStorage.removeItem(ACTIVE_PROFILE_KEY);
        }
    }
    
    return true;
}

/**
 * Vérifie si un profil existe
 * @returns {boolean}
 */
export function hasProfile() {
    return getProfile() !== null;
}

/**
 * Supprime le profil actif (pour compatibilité)
 */
export function clearCV() {
    const activeId = getActiveProfileId();
    if (activeId) {
        deleteProfile(activeId);
    }
}

/**
 * Exporte toutes les données CV pour sauvegarde
 * @returns {Object} Les données exportables
 */
export function exportCVData() {
    return {
        profiles: getAllProfiles(),
        activeProfileId: getActiveProfileId(),
        exportDate: new Date().toISOString(),
        version: 2
    };
}

/**
 * Importe des données CV depuis une sauvegarde
 * @param {Object} data - Les données à importer
 * @returns {boolean} Succès de l'import
 */
export function importCVData(data) {
    try {
        // Nouveau format multi-profils
        if (data.version === 2 && data.profiles) {
            const currentProfiles = getAllProfiles();
            
            // Fusionner les profils (éviter les doublons par nom)
            data.profiles.forEach(importedProfile => {
                const exists = currentProfiles.find(p => p.id === importedProfile.id);
                if (!exists) {
                    currentProfiles.push(importedProfile);
                }
            });
            
            saveAllProfiles(currentProfiles);
            
            // Définir le profil actif si aucun n'est actif
            if (!getActiveProfileId() && currentProfiles.length > 0) {
                localStorage.setItem(ACTIVE_PROFILE_KEY, currentProfiles[0].id);
            }
            
            return true;
        }
        
        // Ancien format (compatibilité)
        if (data.profile) {
            saveProfile(data.profile, data.raw);
            return true;
        }
        
        return false;
    } catch (e) {
        console.error('Erreur lors de l\'import du CV:', e);
        return false;
    }
}
