/**
 * CV Storage Module
 * Gère le stockage du CV et du profil dans localStorage
 */

const CV_RAW_KEY = 'forem_cv_raw';
const CV_PROFILE_KEY = 'forem_cv_profile';

/**
 * Sauvegarde le CV brut dans localStorage
 * @param {Object} cvData - Les données brutes du CV rx-resume
 */
export function saveRawCV(cvData) {
    try {
        localStorage.setItem(CV_RAW_KEY, JSON.stringify(cvData));
        return true;
    } catch (e) {
        console.error('Erreur lors de la sauvegarde du CV:', e);
        return false;
    }
}

/**
 * Récupère le CV brut depuis localStorage
 * @returns {Object|null} Les données du CV ou null si non trouvé
 */
export function getRawCV() {
    try {
        const data = localStorage.getItem(CV_RAW_KEY);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Erreur lors de la lecture du CV:', e);
        return null;
    }
}

/**
 * Sauvegarde le profil candidat normalisé
 * @param {Object} profile - Le profil candidat extrait
 */
export function saveProfile(profile) {
    try {
        profile.lastUpdated = new Date().toISOString();
        localStorage.setItem(CV_PROFILE_KEY, JSON.stringify(profile));
        return true;
    } catch (e) {
        console.error('Erreur lors de la sauvegarde du profil:', e);
        return false;
    }
}

/**
 * Récupère le profil candidat depuis localStorage
 * @returns {Object|null} Le profil ou null si non trouvé
 */
export function getProfile() {
    try {
        const data = localStorage.getItem(CV_PROFILE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Erreur lors de la lecture du profil:', e);
        return null;
    }
}

/**
 * Vérifie si un profil existe
 * @returns {boolean}
 */
export function hasProfile() {
    return localStorage.getItem(CV_PROFILE_KEY) !== null;
}

/**
 * Supprime le CV et le profil
 */
export function clearCV() {
    localStorage.removeItem(CV_RAW_KEY);
    localStorage.removeItem(CV_PROFILE_KEY);
}

/**
 * Exporte toutes les données CV pour sauvegarde
 * @returns {Object} Les données exportables
 */
export function exportCVData() {
    return {
        raw: getRawCV(),
        profile: getProfile(),
        exportDate: new Date().toISOString()
    };
}

/**
 * Importe des données CV depuis une sauvegarde
 * @param {Object} data - Les données à importer
 * @returns {boolean} Succès de l'import
 */
export function importCVData(data) {
    try {
        if (data.raw) {
            saveRawCV(data.raw);
        }
        if (data.profile) {
            saveProfile(data.profile);
        }
        return true;
    } catch (e) {
        console.error('Erreur lors de l\'import du CV:', e);
        return false;
    }
}
