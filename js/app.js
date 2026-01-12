// Main Application Module
import { initIcons } from './utils.js';
import { loadFacets } from './facets.js';
import { handleSearch, handleCustomSearch, copyUrl, exportDebugJson } from './search.js';
import { triggerGeo, manualCitySearch } from './geolocation.js';
import { restoreStateFromUrl } from './url-state.js';

// Initialize application
async function init() {
    initIcons();
    await loadFacets();
    restoreStateFromUrl(handleSearch);
}

// Handle sort change
function handleSortChange(s) {
    if (s.value === 'geo_distance') {
        triggerGeo(handleSearch);
    } else {
        document.getElementById('manualLocationContainer').classList.add('hidden');
    }
}

// Handle distance change
function handleDistanceChange(s) { 
    if (s.value) triggerGeo(handleSearch); 
}

// Handle manual city search
function handleManualCitySearch() {
    manualCitySearch(handleSearch);
}

// Expose functions to window for HTML event handlers
window.handleSearch = handleSearch;
window.handleCustomSearch = handleCustomSearch;
window.handleSortChange = handleSortChange;
window.handleDistanceChange = handleDistanceChange;
window.manualCitySearch = handleManualCitySearch;
window.copyUrl = copyUrl;
window.exportDebugJson = exportDebugJson;

// Initialize when DOM is ready
init();
