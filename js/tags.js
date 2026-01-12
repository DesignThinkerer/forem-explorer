/**
 * Tags Module
 * Manages custom tags system for categorizing and organizing jobs.
 */

const TAGS_STORAGE_KEY = 'forem_custom_tags';
const JOB_TAGS_STORAGE_KEY = 'forem_job_tags';

/**
 * Gets all defined custom tags.
 * @returns {Array<Object>} Array of tag objects {id, name, color, createdAt}
 */
function getAllTags() {
    try {
        const data = localStorage.getItem(TAGS_STORAGE_KEY);
        return data ? JSON.parse(data) : getDefaultTags();
    } catch (e) {
        console.error('Error reading tags:', e);
        return getDefaultTags();
    }
}

/**
 * Gets default predefined tags.
 * @returns {Array<Object>} Array of default tag objects
 */
function getDefaultTags() {
    return [
        { id: 'priority-high', name: 'Priorité élevée', color: 'red', createdAt: new Date().toISOString() },
        { id: 'interesting', name: 'Intéressant', color: 'blue', createdAt: new Date().toISOString() },
        { id: 'good-salary', name: 'Bon salaire', color: 'green', createdAt: new Date().toISOString() },
        { id: 'remote', name: 'Télétravail', color: 'purple', createdAt: new Date().toISOString() },
        { id: 'waiting-response', name: 'En attente de réponse', color: 'orange', createdAt: new Date().toISOString() }
    ];
}

/**
 * Saves tags to localStorage.
 * @param {Array<Object>} tags - Array of tag objects
 */
function saveTags(tags) {
    try {
        localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
    } catch (e) {
        console.error('Error saving tags:', e);
    }
}

/**
 * Gets job-tag associations.
 * @returns {Object} Object mapping job IDs to arrays of tag IDs
 */
function getJobTagsMapping() {
    try {
        const data = localStorage.getItem(JOB_TAGS_STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error('Error reading job tags:', e);
        return {};
    }
}

/**
 * Saves job-tag associations.
 * @param {Object} mapping - Object mapping job IDs to arrays of tag IDs
 */
function saveJobTagsMapping(mapping) {
    try {
        localStorage.setItem(JOB_TAGS_STORAGE_KEY, JSON.stringify(mapping));
    } catch (e) {
        console.error('Error saving job tags:', e);
    }
}

/**
 * Creates a new custom tag.
 * @param {string} name - Tag name
 * @param {string} color - Tag color (red, blue, green, purple, orange, pink, yellow)
 * @returns {Object} The created tag object
 */
export function createTag(name, color = 'blue') {
    const tags = getAllTags();
    
    // Check if tag already exists
    if (tags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('Ce tag existe déjà');
    }
    
    const tag = {
        id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        name: name,
        color: color,
        createdAt: new Date().toISOString()
    };
    
    tags.push(tag);
    saveTags(tags);
    
    return tag;
}

/**
 * Deletes a custom tag.
 * @param {string} tagId - The tag ID
 */
export function deleteTag(tagId) {
    const tags = getAllTags();
    const filtered = tags.filter(t => t.id !== tagId);
    saveTags(filtered);
    
    // Remove tag from all jobs
    const mapping = getJobTagsMapping();
    Object.keys(mapping).forEach(jobId => {
        mapping[jobId] = mapping[jobId].filter(id => id !== tagId);
        if (mapping[jobId].length === 0) {
            delete mapping[jobId];
        }
    });
    saveJobTagsMapping(mapping);
}

/**
 * Updates a tag.
 * @param {string} tagId - The tag ID
 * @param {Object} updates - Object with name and/or color to update
 */
export function updateTag(tagId, updates) {
    const tags = getAllTags();
    const tag = tags.find(t => t.id === tagId);
    
    if (!tag) {
        throw new Error('Tag non trouvé');
    }
    
    if (updates.name) tag.name = updates.name;
    if (updates.color) tag.color = updates.color;
    
    saveTags(tags);
}

/**
 * Lists all tags.
 * @returns {Array<Object>} Array of all tag objects
 */
export function listTags() {
    return getAllTags();
}

/**
 * Assigns a tag to a job.
 * @param {string} jobId - The job ID
 * @param {string} tagId - The tag ID
 */
export function addTagToJob(jobId, tagId) {
    const mapping = getJobTagsMapping();
    
    if (!mapping[jobId]) {
        mapping[jobId] = [];
    }
    
    if (!mapping[jobId].includes(tagId)) {
        mapping[jobId].push(tagId);
        saveJobTagsMapping(mapping);
    }
}

/**
 * Removes a tag from a job.
 * @param {string} jobId - The job ID
 * @param {string} tagId - The tag ID
 */
export function removeTagFromJob(jobId, tagId) {
    const mapping = getJobTagsMapping();
    
    if (mapping[jobId]) {
        mapping[jobId] = mapping[jobId].filter(id => id !== tagId);
        if (mapping[jobId].length === 0) {
            delete mapping[jobId];
        }
        saveJobTagsMapping(mapping);
    }
}

/**
 * Gets all tags assigned to a job.
 * @param {string} jobId - The job ID
 * @returns {Array<Object>} Array of tag objects
 */
export function getJobTags(jobId) {
    const mapping = getJobTagsMapping();
    const tagIds = mapping[jobId] || [];
    const allTags = getAllTags();
    
    return tagIds
        .map(id => allTags.find(t => t.id === id))
        .filter(t => t !== undefined);
}

/**
 * Gets all jobs with a specific tag.
 * @param {string} tagId - The tag ID
 * @returns {Array<string>} Array of job IDs
 */
export function getJobsByTag(tagId) {
    const mapping = getJobTagsMapping();
    return Object.keys(mapping).filter(jobId => mapping[jobId].includes(tagId));
}

/**
 * Gets tag usage statistics.
 * @returns {Array<Object>} Array of objects with tag and count
 */
export function getTagStats() {
    const allTags = getAllTags();
    const mapping = getJobTagsMapping();
    
    return allTags.map(tag => ({
        ...tag,
        count: Object.values(mapping).filter(tagIds => tagIds.includes(tag.id)).length
    })).sort((a, b) => b.count - a.count);
}
