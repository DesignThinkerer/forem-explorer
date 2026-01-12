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
 * @returns {Object} Job state object { bookmarked, applied, date }
 */
export function getJobState(jobId) {
    const states = getJobStates();
    return states[jobId] || { bookmarked: false, applied: false };
}

/**
 * Toggles the bookmarked (watchlist) state of a job.
 * @param {string} jobId - The job numerooffreforem
 * @returns {boolean} New bookmarked state
 */
export function toggleBookmark(jobId) {
    const states = getJobStates();
    const currentState = states[jobId] || { bookmarked: false, applied: false };
    
    currentState.bookmarked = !currentState.bookmarked;
    currentState.date = new Date().toISOString();
    
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
    const currentState = states[jobId] || { bookmarked: false, applied: false };
    
    currentState.applied = !currentState.applied;
    currentState.appliedDate = new Date().toISOString();
    
    states[jobId] = currentState;
    saveJobStates(states);
    
    return currentState.applied;
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
 * Clears all job states (for debugging/maintenance).
 */
export function clearAllStates() {
    if (confirm('Êtes-vous sûr de vouloir effacer tous les suivis ?')) {
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
    }
}
