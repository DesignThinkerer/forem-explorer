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
import { closeJobModal, handleBookmarkToggle, handleAppliedToggle, handleIgnoredToggle, saveNote, deleteNote, addJobTagFromDropdown, removeJobTag, openTagManagement, closeTagManagement, createNewTag, deleteCustomTag, openCoverLetterModal, closeCoverLetterModal, selectLetterStyle, generateLetter, toggleLetterEdit, regenerateLetter, copyLetter, saveLetter, showLetterOptions, exportLetterPDF } from './job-modal.js';
import { renderResults } from './renderer.js';
import { saveCurrentSearch, loadSavedSearch, deleteSavedSearch, listSavedSearches } from './saved-searches.js';
import { getActiveAlerts, dismissAlert, showToast } from './alerts.js';

/**
 * Initializes the application.
 * Loads icons, fetches facet data, and restores state from URL parameters.
 * @returns {Promise<void>}
 */
async function init() {
    initIcons();
    await loadFacets();
    restoreStateFromUrl(handleSearch);
    checkAndDisplayAlerts();
}

/**
 * Checks for active alerts and displays them.
 */
function checkAndDisplayAlerts() {
    const alerts = getActiveAlerts();
    
    if (alerts.length > 0) {
        const alertsPanel = document.getElementById('alertsPanel');
        if (alertsPanel) {
            displayAlerts(alerts);
        }
        
        // Show toast for critical/high urgency alerts
        const urgentAlerts = alerts.filter(a => a.urgency === 'critical' || a.urgency === 'high');
        if (urgentAlerts.length > 0) {
            const alert = urgentAlerts[0];
            setTimeout(() => {
                showToast(alert.title, alert.urgency === 'critical' ? 'error' : 'warning', 5000);
            }, 1000);
        }
    }
}

/**
 * Displays alerts in the alerts panel.
 * @param {Array<Object>} alerts - Array of alert objects
 */
function displayAlerts(alerts) {
    const panel = document.getElementById('alertsPanel');
    if (!panel) return;
    
    const colorMap = {
        red: 'border-red-300 bg-red-50',
        orange: 'border-orange-300 bg-orange-50',
        yellow: 'border-yellow-300 bg-yellow-50',
        blue: 'border-blue-300 bg-blue-50'
    };
    
    const iconColorMap = {
        red: 'text-red-600',
        orange: 'text-orange-600',
        yellow: 'text-yellow-600',
        blue: 'text-blue-600'
    };
    
    const html = alerts.map(alert => `
        <div class="flex items-start gap-3 p-4 rounded-lg border-2 ${colorMap[alert.color] || 'border-slate-300 bg-slate-50'}">
            <div class="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                <i data-lucide="${alert.icon}" class="h-5 w-5 ${iconColorMap[alert.color] || 'text-slate-600'}"></i>
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="font-semibold text-slate-800 text-sm">${alert.title}</h4>
                <p class="text-xs text-slate-600 mt-1">${alert.message}</p>
            </div>
            <div class="flex gap-2">
                ${alert.actionUrl ? `<a href="${alert.actionUrl}" class="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-medium transition-all">${alert.actionLabel || 'Voir'}</a>` : ''}
                <button onclick="window.dismissAlertById('${alert.id}')" class="px-2 py-1 text-slate-400 hover:text-slate-600 transition-colors">
                    <i data-lucide="x" class="h-4 w-4"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    panel.innerHTML = html;
    panel.classList.remove('hidden');
    initIcons();
}

/**
 * Dismisses an alert by ID.
 * @param {string} alertId - The alert ID
 */
export function dismissAlertById(alertId) {
    dismissAlert(alertId);
    checkAndDisplayAlerts();
    
    // Recheck if panel should be hidden
    const alerts = getActiveAlerts();
    if (alerts.length === 0) {
        const panel = document.getElementById('alertsPanel');
        if (panel) panel.classList.add('hidden');
    }
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
 * Handles score filter changes.
 * Re-renders results with the score filter applied.
 */
function handleScoreFilterChange() {
    const lastResults = window.lastSearchResults;
    if (lastResults) {
        renderResults(lastResults);
    }
}

/**
 * Handles saving the current search configuration.
 * Opens a modal to enter the search name.
 */
function handleSaveCurrentSearch() {
    const modal = document.getElementById('saveSearchModal');
    const input = document.getElementById('saveSearchName');
    
    input.value = '';
    modal.classList.remove('hidden');
    
    // Focus input after modal is visible
    setTimeout(() => input.focus(), 100);
    
    initIcons();
}

/**
 * Closes the save search modal.
 */
function closeSaveSearchModal() {
    document.getElementById('saveSearchModal').classList.add('hidden');
}

/**
 * Confirms and saves the search with the entered name.
 */
function confirmSaveSearch() {
    const input = document.getElementById('saveSearchName');
    const name = input.value.trim();
    
    if (!name) {
        input.focus();
        input.classList.add('border-red-500');
        setTimeout(() => input.classList.remove('border-red-500'), 2000);
        return;
    }
    
    saveCurrentSearch(name);
    refreshSavedSearchesDropdown();
    closeSaveSearchModal();
    
    // Show success toast
    showToast(`Recherche "${name}" sauvegardée!`, 'success', 3000);
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
window.handleScoreFilterChange = handleScoreFilterChange;
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
window.closeSaveSearchModal = closeSaveSearchModal;
window.confirmSaveSearch = confirmSaveSearch;
window.deleteSavedSearchFromModal = deleteSavedSearchFromModal;
window.loadSavedSearch = loadSavedSearch;
window.saveNote = saveNote;
window.deleteNote = deleteNote;
window.addJobTagFromDropdown = addJobTagFromDropdown;
window.removeJobTag = removeJobTag;
window.openTagManagement = openTagManagement;
window.closeTagManagement = closeTagManagement;
window.createNewTag = createNewTag;
window.deleteCustomTag = deleteCustomTag;
window.dismissAlertById = dismissAlertById;
// Cover letter functions
window.openCoverLetterModal = openCoverLetterModal;
window.closeCoverLetterModal = closeCoverLetterModal;
window.selectLetterStyle = selectLetterStyle;
window.generateLetter = generateLetter;
window.toggleLetterEdit = toggleLetterEdit;
window.regenerateLetter = regenerateLetter;
window.copyLetter = copyLetter;
window.saveLetter = saveLetter;
window.showLetterOptions = showLetterOptions;
window.exportLetterPDF = exportLetterPDF;

// Initialize when DOM is ready
init();

// Refresh saved searches dropdown on load
refreshSavedSearchesDropdown();
