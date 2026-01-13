/**
 * Bookmarks Module
 * Manages job tracking states (watchlist and application status) in localStorage.
 */

const STORAGE_KEY = 'forem_job_states';

/**
 * Gets all saved job states from localStorage.
 * @returns {Object} Object mapping job IDs to their states
 */
function getJobStates() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error('Error reading job states:', e);
        return {};
    }
}

/**
 * Saves job states to localStorage.
 * @param {Object} states - Object mapping job IDs to their states
 */
function saveJobStates(states) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
    } catch (e) {
        console.error('Error saving job states:', e);
    }
}

/**
 * Gets the state of a specific job.
 * @param {string} jobId - The job numerooffreforem
 * @returns {Object} Job state object { bookmarked, applied, ignored, date }
 */
export function getJobState(jobId) {
    const states = getJobStates();
    return states[jobId] || { bookmarked: false, applied: false, ignored: false };
}

/**
 * Toggles the bookmarked (watchlist) state of a job.
 * @param {string} jobId - The job numerooffreforem
 * @returns {boolean} New bookmarked state
 */
export function toggleBookmark(jobId) {
    const states = getJobStates();
    const currentState = states[jobId] || { bookmarked: false, applied: false, ignored: false };
    
    const wasBookmarked = currentState.bookmarked;
    currentState.bookmarked = !wasBookmarked;
    
    // Only set date when bookmarking, not when removing
    if (!wasBookmarked) {
        currentState.bookmarkedDate = new Date().toISOString();
    }
    // Keep legacy 'date' field for backward compatibility
    if (!currentState.date) {
        currentState.date = new Date().toISOString();
    }
    
    states[jobId] = currentState;
    saveJobStates(states);
    
    return currentState.bookmarked;
}

/**
 * Toggles the applied state of a job.
 * @param {string} jobId - The job numerooffreforem
 * @returns {boolean} New applied state
 */
export function toggleApplied(jobId) {
    const states = getJobStates();
    const currentState = states[jobId] || { bookmarked: false, applied: false, ignored: false };
    
    const wasApplied = currentState.applied;
    currentState.applied = !wasApplied;
    
    // Only set date when marking as applied, not when removing
    if (!wasApplied) {
        currentState.appliedDate = new Date().toISOString();
    }
    
    states[jobId] = currentState;
    saveJobStates(states);
    
    return currentState.applied;
}

/**
 * Toggles the ignored state of a job.
 * @param {string} jobId - The job numerooffreforem
 * @returns {boolean} New ignored state
 */
export function toggleIgnored(jobId) {
    const states = getJobStates();
    const currentState = states[jobId] || { bookmarked: false, applied: false, ignored: false };
    
    const wasIgnored = currentState.ignored;
    currentState.ignored = !wasIgnored;
    
    // Only set date when ignoring, not when removing
    if (!wasIgnored) {
        currentState.ignoredDate = new Date().toISOString();
    }
    
    states[jobId] = currentState;
    saveJobStates(states);
    
    return currentState.ignored;
}

/**
 * Gets all bookmarked job IDs.
 * @returns {string[]} Array of bookmarked job IDs
 */
export function getBookmarkedJobs() {
    const states = getJobStates();
    return Object.keys(states).filter(id => states[id].bookmarked);
}

/**
 * Gets all applied job IDs.
 * @returns {string[]} Array of applied job IDs
 */
export function getAppliedJobs() {
    const states = getJobStates();
    return Object.keys(states).filter(id => states[id].applied);
}

/**
 * Gets all ignored job IDs.
 * @returns {string[]} Array of ignored job IDs
 */
export function getIgnoredJobs() {
    const states = getJobStates();
    return Object.keys(states).filter(id => states[id].ignored);
}

/**
 * Gets statistics about tracked jobs.
 * @returns {Object} Statistics object
 */
export function getStats() {
    const states = getJobStates();
    const allIds = Object.keys(states);
    
    return {
        total: allIds.length,
        bookmarked: allIds.filter(id => states[id].bookmarked).length,
        applied: allIds.filter(id => states[id].applied).length
    };
}

/**
 * Gets all job states.
 * @returns {Object} All job states mapping
 */
export function getAllJobStates() {
    return getJobStates();
}

/**
 * Clears all job states (for debugging/maintenance).
 */
export function clearAllStates() {
    if (confirm('Êtes-vous sûr de vouloir effacer tous les suivis ?')) {
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
    }
}

/**
 * Imports bookmark data from an exported JSON file.
 * Merges imported data with existing data (keeps existing + adds new).
 * @param {Object} importedBookmarks - The bookmarks object from the export file
 * @returns {Object} Statistics about the import
 */
export function importBookmarks(importedBookmarks) {
    if (!importedBookmarks || typeof importedBookmarks !== 'object') {
        throw new Error('Format de données invalide');
    }
    
    // Get existing data
    const existingStates = getJobStates();
    
    // Count what we're importing
    let newCount = 0;
    let updatedCount = 0;
    
    // Merge imported data with existing
    Object.keys(importedBookmarks).forEach(jobId => {
        const importedState = importedBookmarks[jobId];
        
        // Validate imported state structure
        if (typeof importedState !== 'object') return;
        
        if (existingStates[jobId]) {
            updatedCount++;
        } else {
            newCount++;
        }
        
        // Merge with existing or create new, preserving all fields
        existingStates[jobId] = {
            bookmarked: importedState.bookmarked || false,
            applied: importedState.applied || false,
            ignored: importedState.ignored || false,
            date: importedState.date || new Date().toISOString(),
            bookmarkedDate: importedState.bookmarkedDate || null,
            appliedDate: importedState.appliedDate || null,
            ignoredDate: importedState.ignoredDate || null
        };
    });
    
    // Save merged data
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingStates));
    
    return {
        newCount,
        updatedCount,
        total: newCount + updatedCount
    };
}
