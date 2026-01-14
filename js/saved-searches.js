/**
 * Saved Searches Module
 * Manages saved search configurations in localStorage.
 */

import { getActiveProfileId, setActiveProfile } from './cv-storage.js';

const STORAGE_KEY = 'forem_saved_searches';

/**
 * Gets all saved searches from localStorage.
 * @returns {Object} Object mapping search IDs to their configs
 */
function getSavedSearches() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error('Error reading saved searches:', e);
        return {};
    }
}

/**
 * Saves searches to localStorage.
 * @param {Object} searches - Object mapping search IDs to their configs
 */
function saveSavedSearches(searches) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
    } catch (e) {
        console.error('Error saving searches:', e);
    }
}

/**
 * Generates a unique ID for a search.
 * @returns {string} Unique search ID
 */
function generateSearchId() {
    return 'search_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Saves the current search configuration.
 * @param {string} name - Name for the search
 * @param {string} profileId - Profile ID to associate (optional, defaults to active)
 * @returns {Object} The saved search object
 */
export function saveCurrentSearch(name, profileId = null) {
    const searches = getSavedSearches();
    const searchId = generateSearchId();
    
    const search = {
        id: searchId,
        name: name,
        params: window.location.search,
        profileId: profileId || getActiveProfileId(),
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
    };
    
    searches[searchId] = search;
    saveSavedSearches(searches);
    
    return search;
}

/**
 * Loads a saved search by ID.
 * @param {string} searchId - The search ID
 * @param {boolean} switchProfile - Whether to switch to the associated profile
 */
export function loadSavedSearch(searchId, switchProfile = true) {
    const searches = getSavedSearches();
    const search = searches[searchId];
    
    if (!search) {
        console.error('Search not found:', searchId);
        return;
    }
    
    // Update last used
    search.lastUsed = new Date().toISOString();
    searches[searchId] = search;
    saveSavedSearches(searches);
    
    // Switch to the associated profile if it exists
    if (switchProfile && search.profileId) {
        setActiveProfile(search.profileId);
    }
    
    // Navigate to the saved search URL
    window.location.href = window.location.pathname + search.params;
}

/**
 * Deletes a saved search.
 * @param {string} searchId - The search ID to delete
 */
export function deleteSavedSearch(searchId) {
    const searches = getSavedSearches();
    delete searches[searchId];
    saveSavedSearches(searches);
}

/**
 * Gets all saved searches as an array.
 * @returns {Array} Array of search objects sorted by last used
 */
export function listSavedSearches() {
    const searches = getSavedSearches();
    return Object.values(searches).sort((a, b) => 
        new Date(b.lastUsed) - new Date(a.lastUsed)
    );
}

/**
 * Updates the name of a saved search.
 * @param {string} searchId - The search ID
 * @param {string} newName - The new name
 */
export function renameSavedSearch(searchId, newName) {
    const searches = getSavedSearches();
    if (searches[searchId]) {
        searches[searchId].name = newName;
        saveSavedSearches(searches);
    }
}

/**
 * Updates a saved search with current URL parameters and profile.
 * @param {string} searchId - The search ID
 * @returns {boolean} Success
 */
export function updateSavedSearchParams(searchId) {
    const searches = getSavedSearches();
    if (searches[searchId]) {
        searches[searchId].params = window.location.search;
        searches[searchId].profileId = getActiveProfileId();
        searches[searchId].lastUsed = new Date().toISOString();
        saveSavedSearches(searches);
        return true;
    }
    return false;
}
