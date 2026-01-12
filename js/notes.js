/**
 * Notes Module
 * Manages personal notes, tags, custom dates, and detailed status for job postings.
 */

const NOTES_STORAGE_KEY = 'forem_job_notes';

/**
 * Gets all notes from localStorage.
 * @returns {Object} Object mapping job IDs to their notes data
 */
function getAllNotes() {
    try {
        const data = localStorage.getItem(NOTES_STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error('Error reading notes:', e);
        return {};
    }
}

/**
 * Saves all notes to localStorage.
 * @param {Object} notes - Object mapping job IDs to their notes data
 */
function saveAllNotes(notes) {
    try {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
        console.error('Error saving notes:', e);
    }
}

/**
 * Gets note data for a specific job.
 * @param {string} jobId - The job ID
 * @returns {Object} Note object with text, tags, customDate, detailedStatus, createdAt, updatedAt
 */
export function getJobNote(jobId) {
    const notes = getAllNotes();
    return notes[jobId] || {
        text: '',
        tags: [],
        customDate: null, // ISO date string for follow-up, interview, etc.
        detailedStatus: '', // e.g., "Interview scheduled", "Waiting for response", etc.
        createdAt: null,
        updatedAt: null
    };
}

/**
 * Saves or updates a note for a job.
 * @param {string} jobId - The job ID
 * @param {Object} noteData - Note data object
 * @param {string} noteData.text - Note text content
 * @param {Array<string>} noteData.tags - Array of custom tags
 * @param {string} noteData.customDate - ISO date string for follow-up date
 * @param {string} noteData.detailedStatus - Detailed status description
 * @returns {Object} The saved note object
 */
export function saveJobNote(jobId, noteData) {
    const notes = getAllNotes();
    const existing = notes[jobId] || {};
    
    const now = new Date().toISOString();
    const note = {
        text: noteData.text || '',
        tags: noteData.tags || [],
        customDate: noteData.customDate || null,
        detailedStatus: noteData.detailedStatus || '',
        createdAt: existing.createdAt || now,
        updatedAt: now
    };
    
    notes[jobId] = note;
    saveAllNotes(notes);
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('jobNoteChanged', {
        detail: { jobId, note }
    }));
    
    return note;
}

/**
 * Deletes a note for a job.
 * @param {string} jobId - The job ID
 */
export function deleteJobNote(jobId) {
    const notes = getAllNotes();
    delete notes[jobId];
    saveAllNotes(notes);
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('jobNoteChanged', {
        detail: { jobId, note: null }
    }));
}

/**
 * Checks if a job has a note.
 * @param {string} jobId - The job ID
 * @returns {boolean} True if job has note with content
 */
export function hasNote(jobId) {
    const note = getJobNote(jobId);
    return !!(note.text || note.tags.length > 0 || note.customDate || note.detailedStatus);
}

/**
 * Gets all jobs with notes.
 * @returns {Array<Object>} Array of objects with jobId and note data
 */
export function getAllJobsWithNotes() {
    const notes = getAllNotes();
    return Object.entries(notes)
        .filter(([_, note]) => note.text || note.tags.length > 0 || note.customDate || note.detailedStatus)
        .map(([jobId, note]) => ({ jobId, ...note }));
}

/**
 * Searches notes by text content.
 * @param {string} query - Search query
 * @returns {Array<string>} Array of job IDs matching the query
 */
export function searchNotes(query) {
    const notes = getAllNotes();
    const lowerQuery = query.toLowerCase();
    
    return Object.entries(notes)
        .filter(([_, note]) => 
            note.text?.toLowerCase().includes(lowerQuery) ||
            note.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
            note.detailedStatus?.toLowerCase().includes(lowerQuery)
        )
        .map(([jobId, _]) => jobId);
}

/**
 * Gets jobs with upcoming custom dates.
 * @param {number} daysAhead - Number of days to look ahead (default 7)
 * @returns {Array<Object>} Array of objects with jobId and note data
 */
export function getUpcomingDates(daysAhead = 7) {
    const notes = getAllNotes();
    const now = new Date();
    const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    
    return Object.entries(notes)
        .filter(([_, note]) => {
            if (!note.customDate) return false;
            const date = new Date(note.customDate);
            return date >= now && date <= future;
        })
        .map(([jobId, note]) => ({ jobId, ...note }))
        .sort((a, b) => new Date(a.customDate) - new Date(b.customDate));
}
