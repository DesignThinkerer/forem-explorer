/**
 * Search Module
 * Handles job search operations, URL parameter management, and data export functionality.
 */
import { BASE_URL } from './config.js';
import { setRawData, setFullUrl, getRawData, getFullUrl } from './state.js';
import { showToast, copyToClipboard } from './utils.js';
import { buildQuery, parseAndSyncUI } from './query-builder.js';
import { renderResults } from './renderer.js';
import { updateUrlParams } from './url-state.js';

/**
 * Performs a job search based on current UI filter values.
 * Builds query from UI state, fetches results from API, and renders them.
 * Updates URL parameters and shows loading states during the operation.
 * @param {Event} [e] - Optional event object (will call preventDefault if provided)
 * @param {boolean} [isRestore] - If true, skips URL parameter update (used for restoring from URL)
 * @returns {Promise<void>}
 */
export async function handleSearch(e, isRestore) {
    if (e) e.preventDefault();
    
    const loader = document.getElementById('loadingSpinner');
    loader.classList.remove('hidden');
    document.getElementById('resultsCount').textContent = "...";
    document.getElementById('resultsGrid').innerHTML = "";
    document.getElementById('btnExport').classList.add('hidden');

    if (!isRestore) updateUrlParams();

    const params = buildQuery();
    const fullUrl = `${BASE_URL}?${params.toString()}`;
    setFullUrl(fullUrl);
    document.getElementById('queryInput').value = decodeURIComponent(params.toString().replace(/&/g, '\n&'));

    try {
        const res = await fetch(fullUrl);
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        setRawData(data);
        
        document.getElementById('resultsCount').textContent = `${data.total_count} résultats`;
        document.getElementById('statusBar').classList.remove('hidden');
        
        if (data.total_count > 0) {
            // Store results globally for status filter
            window.lastSearchResults = data;
            renderResults(data);
            document.getElementById('btnExport').classList.remove('hidden');
            if (!isRestore) showToast(`${data.total_count} offres`, false);
        } else {
            document.getElementById('resultsGrid').innerHTML = `<div class="text-center py-12 text-slate-400">Aucun résultat</div>`;
            if (!isRestore) showToast("Aucun résultat");
        }
    } catch (err) {
        document.getElementById('resultsGrid').innerHTML = `<div class="p-4 text-red-500 text-center">Erreur ${err.message}</div>`;
        showToast("Erreur", true);
    } finally {
        loader.classList.add('hidden');
    }
}

/**
 * Executes a custom search using a manually entered query string or full URL.
 * Allows advanced users to input raw API query parameters.
 * Syncs the UI filters to match the custom query and updates the browser URL.
 * @returns {Promise<void>}
 */
export async function handleCustomSearch() {
    const val = document.getElementById('queryInput').value.trim().replace(/\n/g, '');
    if (!val) return;
    let url = val.startsWith('http') ? val : `${BASE_URL}?${val}`;
    setFullUrl(url);
    parseAndSyncUI(url);
    
    // Update URL parameters after syncing UI
    updateUrlParams();
    
    const loader = document.getElementById('loadingSpinner');
    loader.classList.remove('hidden');
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        setRawData(data);
        document.getElementById('resultsCount').textContent = `${data.total_count} résultats`;
        // Store results globally for status filter
        window.lastSearchResults = data;
        renderResults(data);
        document.getElementById('btnExport').classList.remove('hidden');
    } catch (e) {
        showToast("Erreur syntaxe", true);
    } finally {
        loader.classList.add('hidden');
    }
}

/**
 * Copies the current search URL to the clipboard.
 * Provides visual feedback via toast notification.
 */
export function copyUrl() {
    copyToClipboard(getFullUrl());
    showToast("Copié !");
}

/**
 * Exports the current search results along with bookmark/applied states as a JSON file.
 * Includes both search results and personal tracking data for backup/import purposes.
 * Downloads a file with the current date in the filename.
 * Does nothing if no search has been performed yet.
 */
export function exportDebugJson() {
    const rawData = getRawData();
    if (!rawData) return;
    
    // Get bookmark data from localStorage
    const bookmarkData = localStorage.getItem('forem_job_states');
    const bookmarks = bookmarkData ? JSON.parse(bookmarkData) : {};
    
    // Get current search parameters from URL
    const searchParams = window.location.search;
    
    // Create export object with search results, personal data, and search parameters
    const exportData = {
        exportDate: new Date().toISOString(),
        searchParams: searchParams,
        searchResults: rawData,
        bookmarks: bookmarks
    };
    
    const a = document.createElement('a');
    a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    a.download = `forem-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

/**
 * Imports bookmark data from a JSON file.
 * Prompts the user to select a file and imports the bookmark data.
 */
export function importBookmarksFromFile() {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            // Check if it's our export format
            if (!data.bookmarks) {
                alert('Format de fichier invalide. Veuillez sélectionner un fichier d\'export FOREM valide.');
                return;
            }
            
            // Import the bookmarks (dynamic import to avoid circular dependency)
            const { importBookmarks } = await import('./bookmarks.js');
            const stats = importBookmarks(data.bookmarks);
            
            // Show success message
            alert(`Import réussi!\n\n` +
                  `Nouveaux suivis: ${stats.newCount}\n` +
                  `Suivis mis à jour: ${stats.updatedCount}\n` +
                  `Total importé: ${stats.total}\n\n` +
                  `Les paramètres de recherche vont être restaurés...`);
            
            // Restore search parameters if they exist
            if (data.searchParams) {
                // Redirect to the URL with the saved search parameters
                window.location.href = window.location.pathname + data.searchParams;
            } else {
                // Just reload if no search params
                window.location.reload();
            }
            
        } catch (error) {
            console.error('Import error:', error);
            alert(`Erreur lors de l'import: ${error.message}`);
        }
    };
    
    input.click();
}
