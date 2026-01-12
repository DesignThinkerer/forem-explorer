/**
 * Main Application Module
 * Entry point for the FOREM job search application.
 * Initializes components, sets up event handlers, and manages application lifecycle.
 */
import { initIcons } from './utils.js';
import { loadFacets } from './facets.js';
import { handleSearch, handleCustomSearch, copyUrl, exportDebugJson, importBookmarksFromFile } from './search.js';
import { triggerGeo, manualCitySearch } from './geolocation.js';
import { restoreStateFromUrl } from './url-state.js';
import { closeJobModal, handleBookmarkToggle, handleAppliedToggle, handleIgnoredToggle, saveNote, deleteNote, addNoteTag, removeNoteTag } from './job-modal.js';
import { renderResults } from './renderer.js';
import { saveCurrentSearch, loadSavedSearch, deleteSavedSearch, listSavedSearches } from './saved-searches.js';

/**
 * Initializes the application.
 * Loads icons, fetches facet data, and restores state from URL parameters.
 * @returns {Promise<void>}
 */
async function init() {
    initIcons();
    await loadFacets();
    restoreStateFromUrl(handleSearch);
}

/**
 * Handles changes to the sort filter dropdown.
 * Triggers geolocation if sorting by distance, otherwise hides manual location UI.
 * @param {HTMLSelectElement} s - The sort select element
 */
function handleSortChange(s) {
    if (s.value === 'geo_distance') {
        triggerGeo(handleSearch);
    } else {
        document.getElementById('manualLocationContainer').classList.add('hidden');
    }
}

/**
 * Handles changes to the distance filter dropdown.
 * Triggers geolocation and performs search if a distance value is selected.
 * @param {HTMLSelectElement} s - The distance select element
 */
function handleDistanceChange(s) { 
    if (s.value) triggerGeo(handleSearch); 
}

/**
 * Handles manual city search submission.
 * Wrapper function that calls manualCitySearch with search callback.
 */
function handleManualCitySearch() {
    manualCitySearch(handleSearch);
}

/**
 * Handles status filter changes.
 * Re-renders results with the new filter applied.
 */
function handleStatusFilterChange() {
    // Get current results from the last search
    const lastResults = window.lastSearchResults;
    if (lastResults) {
        renderResults(lastResults);
    }
}

/**
 * Handles saving the current search configuration.
 */
function handleSaveCurrentSearch() {
    const name = prompt('Nom de cette recherche:');
    if (!name) return;
    
    saveCurrentSearch(name);
    refreshSavedSearchesDropdown();
    alert(`Recherche "${name}" sauvegardée!`);
}

/**
 * Handles loading a saved search from dropdown.
 */
function handleLoadSavedSearch(selectElement) {
    const searchId = selectElement.value;
    if (!searchId) return;
    
    loadSavedSearch(searchId);
}

/**
 * Opens the saved searches management modal.
 */
function handleManageSavedSearches() {
    const modal = document.getElementById('savedSearchesModal');
    const list = document.getElementById('savedSearchesList');
    const noSearches = document.getElementById('noSavedSearches');
    
    const searches = listSavedSearches();
    
    if (searches.length === 0) {
        list.classList.add('hidden');
        noSearches.classList.remove('hidden');
    } else {
        list.classList.remove('hidden');
        noSearches.classList.add('hidden');
        
        list.innerHTML = searches.map(search => `
            <div class="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-amber-300 transition-all">
                <i data-lucide="star" class="h-5 w-5 text-amber-500 flex-shrink-0"></i>
                <div class="flex-1 min-w-0">
                    <div class="font-semibold text-slate-800 truncate">${search.name}</div>
                    <div class="text-xs text-slate-500">
                        Utilisée: ${new Date(search.lastUsed).toLocaleDateString('fr-BE')}
                    </div>
                </div>
                <button onclick="window.loadSavedSearch('${search.id}')" class="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-all">
                    Charger
                </button>
                <button onclick="window.deleteSavedSearchFromModal('${search.id}')" class="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition-all">
                    <i data-lucide="trash-2" class="h-4 w-4"></i>
                </button>
            </div>
        `).join('');
        
        initIcons();
    }
    
    modal.classList.remove('hidden');
}

/**
 * Closes the saved searches modal.
 */
function closeSavedSearchesModal() {
    document.getElementById('savedSearchesModal').classList.add('hidden');
}

/**
 * Deletes a saved search from the modal.
 */
function deleteSavedSearchFromModal(searchId) {
    if (!confirm('Supprimer cette recherche sauvegardée?')) return;
    
    deleteSavedSearch(searchId);
    refreshSavedSearchesDropdown();
    handleManageSavedSearches(); // Refresh modal
}

/**
 * Refreshes the saved searches dropdown.
 */
function refreshSavedSearchesDropdown() {
    const dropdown = document.getElementById('savedSearchesDropdown');
    if (!dropdown) return;
    
    const searches = listSavedSearches();
    
    dropdown.innerHTML = '<option value="">Recherches sauvegardées...</option>' +
        searches.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

// Expose functions to window for HTML event handlers
window.handleSearch = handleSearch;
window.handleCustomSearch = handleCustomSearch;
window.handleSortChange = handleSortChange;
window.handleDistanceChange = handleDistanceChange;
window.handleStatusFilterChange = handleStatusFilterChange;
window.manualCitySearch = handleManualCitySearch;
window.copyUrl = copyUrl;
window.exportDebugJson = exportDebugJson;
window.importBookmarksFromFile = importBookmarksFromFile;
window.closeJobModal = closeJobModal;
window.handleBookmarkToggle = handleBookmarkToggle;
window.handleAppliedToggle = handleAppliedToggle;
window.handleIgnoredToggle = handleIgnoredToggle;
window.handleSaveCurrentSearch = handleSaveCurrentSearch;
window.handleLoadSavedSearch = handleLoadSavedSearch;
window.handleManageSavedSearches = handleManageSavedSearches;
window.closeSavedSearchesModal = closeSavedSearchesModal;
window.deleteSavedSearchFromModal = deleteSavedSearchFromModal;
window.loadSavedSearch = loadSavedSearch;
window.saveNote = saveNote;
window.deleteNote = deleteNote;
window.addNoteTag = addNoteTag;
window.removeNoteTag = removeNoteTag;

// Initialize when DOM is ready
init();

// Refresh saved searches dropdown on load
refreshSavedSearchesDropdown();
