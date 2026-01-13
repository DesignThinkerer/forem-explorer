/**
 * Main Application Module
 * Entry point for the FOREM job search application.
 * Initializes components, sets up event handlers, and manages application lifecycle.
 */
import { initIcons, showToast as utilShowToast } from './utils.js';
import { loadFacets } from './facets.js';
import { handleSearch, handleCustomSearch, copyUrl, exportDebugJson, importBookmarksFromFile } from './search.js';
import { triggerGeo, manualCitySearch, initializeLocation } from './geolocation.js';
import { restoreStateFromUrl } from './url-state.js';
import { closeJobModal, handleBookmarkToggle, handleAppliedToggle, handleIgnoredToggle, saveNote, deleteNote, addJobTagFromDropdown, removeJobTag, openTagManagement, closeTagManagement, createNewTag, deleteCustomTag, openCoverLetterModal, closeCoverLetterModal, selectLetterStyle, generateLetter, toggleLetterEdit, regenerateLetter, copyLetter, saveLetter, showLetterOptions, exportLetterPDF } from './job-modal.js';
import { renderResults } from './renderer.js';
import { saveCurrentSearch, loadSavedSearch, deleteSavedSearch, listSavedSearches } from './saved-searches.js';
import { getActiveAlerts, dismissAlert, showToast } from './alerts.js';
import { getProfile } from './cv-profile.js';
import { scoreJobWithAi, isAiScoringAvailable, getStoredScore } from './ai-matching.js';
import { getRawData } from './state.js';

/**
 * Initializes the application.
 * Loads icons, fetches facet data, and restores state from URL parameters.
 * @returns {Promise<void>}
 */
async function init() {
    initIcons();
    await loadFacets();
    
    // Initialize location: CV > GPS > Manual
    await initializeLocation();
    
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
// Store current score data for copy/debug
let currentScoreDebugData = null;

/**
 * Opens the score detail modal
 * @param {Object} scoreData - The score data
 * @param {Object} jobData - The job data
 */
function openScoreModal(scoreData, jobData) {
    const modal = document.getElementById('scoreModal');
    if (!modal) return;
    
    // Get profile for debug JSON
    const profile = getProfile();
    
    // Store debug data
    currentScoreDebugData = {
        profile: profile ? {
            headline: profile.headline,
            skills: profile.skills?.map(s => s.name),
            keywords: profile.keywords?.slice(0, 30),
            location: profile.location,
            languages: profile.languages,
            totalExperienceYears: profile.totalExperienceYears
        } : null,
        job: jobData,
        score: scoreData
    };
    
    // Update modal content
    document.getElementById('scoreModalJobTitle').textContent = jobData.titreoffre || 'Offre';
    document.getElementById('scoreModalValue').textContent = scoreData.score + '%';
    document.getElementById('scoreModalType').textContent = scoreData.isAiScore ? 'Score IA (Gemini)' : 'Score local (algorithme)';
    
    // Color based on score
    const valueEl = document.getElementById('scoreModalValue');
    valueEl.className = 'text-5xl font-bold';
    if (scoreData.score >= 70) {
        valueEl.classList.add('text-emerald-600');
    } else if (scoreData.score >= 50) {
        valueEl.classList.add('text-amber-600');
    } else if (scoreData.score >= 30) {
        valueEl.classList.add('text-orange-600');
    } else {
        valueEl.classList.add('text-red-600');
    }
    
    // Keywords (local score) ou matchingSkills (AI score)
    const keywordsEl = document.getElementById('scoreModalKeywords');
    const matchedSkills = scoreData.matchingKeywords || scoreData.matchingSkills || [];
    if (matchedSkills.length > 0) {
        keywordsEl.innerHTML = matchedSkills.map(kw => 
            `<span class="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">${kw}</span>`
        ).join('');
    } else {
        keywordsEl.innerHTML = '<span class="text-sm text-slate-400 italic">Aucune correspondance exacte</span>';
    }
    
    // Missing skills (AI score only)
    const fuzzySection = document.getElementById('scoreModalFuzzySection');
    const fuzzyEl = document.getElementById('scoreModalFuzzy');
    
    // Fuzzy matches (local) ou missing skills (AI)
    if (scoreData.fuzzyMatches && scoreData.fuzzyMatches.length > 0) {
        fuzzySection.classList.remove('hidden');
        document.querySelector('#scoreModalFuzzySection h4').innerHTML = '<i data-lucide="search" class="h-4 w-4 text-amber-600"></i> Correspondances approximatives (Levenshtein)';
        fuzzyEl.innerHTML = scoreData.fuzzyMatches.map(fm => 
            `<span class="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">${fm}</span>`
        ).join('');
    } else if (scoreData.missingSkills && scoreData.missingSkills.length > 0) {
        fuzzySection.classList.remove('hidden');
        document.querySelector('#scoreModalFuzzySection h4').innerHTML = '<i data-lucide="alert-circle" class="h-4 w-4 text-red-500"></i> Compétences manquantes';
        fuzzyEl.innerHTML = scoreData.missingSkills.map(s => 
            `<span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">${s}</span>`
        ).join('');
    } else {
        fuzzySection.classList.add('hidden');
    }
    
    // Details - different display for AI vs local score
    const detailsEl = document.getElementById('scoreModalDetails');
    let detailsHtml = '<div class="space-y-1.5">';
    
    if (scoreData.isAiScore) {
        // AI Score display
        if (scoreData.experienceMatch) {
            const expLabel = scoreData.experienceMatch === 'good' ? 'Bonne' : 
                            scoreData.experienceMatch === 'partial' ? 'Partielle' : 
                            scoreData.experienceMatch === 'excellent' ? 'Excellente' : scoreData.experienceMatch;
            detailsHtml += `<div class="flex justify-between items-center">
                <span class="text-slate-600">Expérience:</span>
                <span class="font-medium">${expLabel}</span>
            </div>`;
        }
        if (scoreData.locationMatch) {
            detailsHtml += `<div class="flex justify-between items-center">
                <span class="text-slate-600">Localisation:</span>
                <span class="font-medium">${scoreData.locationMatch}</span>
            </div>`;
        }
        if (scoreData.summary) {
            detailsHtml += `<div class="border-t border-slate-100 pt-2 mt-2">
                <span class="text-slate-600 block mb-1">Résumé IA:</span>
                <p class="text-sm text-slate-700 italic">"${scoreData.summary}"</p>
            </div>`;
        }
        if (scoreData.recommendations && scoreData.recommendations.length > 0) {
            detailsHtml += `<div class="border-t border-slate-100 pt-2 mt-2">
                <span class="text-slate-600 block mb-1">Recommandations:</span>
                <ul class="text-sm text-slate-700 list-disc pl-4">
                    ${scoreData.recommendations.map(r => `<li>${r}</li>`).join('')}
                </ul>
            </div>`;
        }
    } else {
        // Local Score display
        const details = scoreData.details || {};
    
    // Compétences matchées (max 40pts) + title bonus (max 15pts)
    if (details.skillsMatched !== undefined) {
        // Calculer les points approximatifs
        let skillPts = 0;
        const m = details.skillsMatched;
        if (m >= 1) skillPts += 10;
        if (m >= 2) skillPts += 8;
        if (m >= 3) skillPts += 6;
        if (m >= 4) skillPts += 5;
        if (m >= 5) skillPts += Math.min(11, (m - 4) * 3);
        skillPts = Math.min(40, skillPts);
        
        const titlePts = Math.min(15, (details.titleMatches || 0) * 8);
        
        detailsHtml += `<div class="flex justify-between items-center">
            <span class="text-slate-600">Compétences:</span>
            <span class="font-medium">${details.skillsMatched} matchées <span class="text-emerald-600">+${skillPts}pts</span></span>
        </div>`;
        
        if (details.titleMatches) {
            detailsHtml += `<div class="flex justify-between items-center text-sm">
                <span class="text-slate-500 pl-4">↳ dont dans le titre:</span>
                <span class="font-medium">${details.titleMatches} <span class="text-emerald-600">+${titlePts}pts</span></span>
            </div>`;
        }
    }
    
    // Headline (max 15pts)
    if (details.headlineMatch !== undefined) {
        const headlinePts = details.headlineMatchCount ? Math.min(15, Math.round(details.headlineMatchCount) * 5) : 0;
        detailsHtml += `<div class="flex justify-between items-center">
            <span class="text-slate-600">Headline/Métier:</span>
            <span class="font-medium">${details.headlineMatch ? 'Match' : 'Non'} ${headlinePts > 0 ? `<span class="text-emerald-600">+${headlinePts}pts</span>` : ''}</span>
        </div>`;
    }
    
    // Keywords (max 12pts + 16pts bonus titre)
    if (details.keywordsMatched !== undefined) {
        const kwPts = Math.min(12, details.keywordsMatched * 3);
        const kwTitlePts = Math.min(16, (details.keywordTitleMatches || 0) * 8);
        
        detailsHtml += `<div class="flex justify-between items-center">
            <span class="text-slate-600">Mots-clés CV:</span>
            <span class="font-medium">${details.keywordsMatched} matchés <span class="text-emerald-600">+${kwPts}pts</span></span>
        </div>`;
        
        if (details.keywordTitleMatches > 0) {
            detailsHtml += `<div class="flex justify-between items-center text-sm">
                <span class="text-slate-500 pl-4">↳ dont dans le titre:</span>
                <span class="font-medium text-emerald-600">${details.keywordTitleMatches} ⭐ +${kwTitlePts}pts</span>
            </div>`;
        }
    }
    
    // Distance/Localisation (max 15pts)
    if (details.distanceKm !== undefined) {
        let locPts = 0;
        const d = details.distanceKm;
        if (d <= 10) locPts = 15;
        else if (d <= 25) locPts = 12;
        else if (d <= 50) locPts = 8;
        else if (d <= 75) locPts = 5;
        else if (d <= 100) locPts = 2;
        
        const distColor = d <= 25 ? 'text-emerald-600' : d <= 50 ? 'text-blue-600' : 'text-amber-600';
        detailsHtml += `<div class="flex justify-between items-center">
            <span class="text-slate-600">Distance:</span>
            <span class="font-medium ${distColor}">${details.distanceKm} km (${details.locationMatch || ''}) <span class="text-emerald-600">+${locPts}pts</span></span>
        </div>`;
    } else if (details.locationMatch) {
        const locPts = details.locationMatch === 'même ville' ? 10 : details.locationMatch === 'même région' ? 5 : 0;
        detailsHtml += `<div class="flex justify-between items-center">
            <span class="text-slate-600">Localisation:</span>
            <span class="font-medium">${details.locationMatch} ${locPts > 0 ? `<span class="text-emerald-600">+${locPts}pts</span>` : ''}</span>
        </div>`;
    }
    
    // Langues (max 10pts)
    if (details.languageMatch !== undefined) {
        const langPts = details.languageMatch ? 5 : 0; // Au moins 5pts si match
        detailsHtml += `<div class="flex justify-between items-center">
            <span class="text-slate-600">Langues:</span>
            <span class="font-medium">${details.languageMatch ? 'Match' : 'Non'} ${langPts > 0 ? `<span class="text-emerald-600">+${langPts}pts</span>` : ''}</span>
        </div>`;
    }
    
    // Expérience (max 10pts)
    if (details.experienceMatch) {
        const expPts = details.experienceMatch === 'sufficient' ? 10 : details.experienceMatch === 'partial' ? 5 : 3;
        const expLabel = details.experienceMatch === 'sufficient' ? 'Suffisante' : details.experienceMatch === 'partial' ? 'Partielle' : details.experienceMatch;
        detailsHtml += `<div class="flex justify-between items-center">
            <span class="text-slate-600">Expérience:</span>
            <span class="font-medium">${expLabel} <span class="text-emerald-600">+${expPts}pts</span></span>
        </div>`;
    }
    
    // Matches fuzzy
    if (details.fuzzyMatches && details.fuzzyMatches.length > 0) {
        detailsHtml += `<div class="flex justify-between items-center text-sm border-t border-slate-100 pt-1 mt-1">
            <span class="text-slate-500">Matches approximatifs:</span>
            <span class="font-medium text-amber-600">${details.fuzzyMatches.length} (Levenshtein)</span>
        </div>`;
    }
    
    if (details.noData) {
        detailsHtml += `<div class="text-amber-600 italic mt-2">⚠️ Données insuffisantes dans l'offre</div>`;
    }
    } // End of local score details
    
    detailsHtml += '</div>';
    
    detailsEl.innerHTML = detailsHtml || '<span class="text-slate-400 italic">Pas de détails disponibles</span>';
    
    // JSON
    document.getElementById('scoreModalJson').textContent = JSON.stringify(currentScoreDebugData, null, 2);
    
    // Show modal
    modal.classList.remove('hidden');
    initIcons();
}

/**
 * Closes the score detail modal
 */
function closeScoreModal() {
    const modal = document.getElementById('scoreModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    currentScoreDebugData = null;
}

/**
 * Copies the debug JSON to clipboard
 */
function copyScoreDebugJson() {
    if (!currentScoreDebugData) return;
    
    const json = JSON.stringify(currentScoreDebugData, null, 2);
    navigator.clipboard.writeText(json).then(() => {
        showToast('JSON copié dans le presse-papier!', 'success', 2000);
    }).catch(err => {
        console.error('Erreur copie:', err);
        showToast('Erreur lors de la copie', 'error', 2000);
    });
}

/**
 * Recalculates the score for the current job in the modal
 * @param {string} mode - 'local' or 'ai'
 */
async function recalculateScore(mode = 'local') {
    if (!currentScoreDebugData || !currentScoreDebugData.job) {
        showToast('Données insuffisantes pour recalculer', 'error', 2000);
        return;
    }
    
    const jobId = currentScoreDebugData.job.numerooffreforem;
    if (!jobId) {
        showToast('ID de l\'offre manquant', 'error', 2000);
        return;
    }
    
    // Find the full job data from the last search results
    const lastResults = window.lastSearchResults;
    const jobs = lastResults?.results || [];
    const fullJob = jobs.find(j => j.numerooffreforem === jobId);
    
    if (!fullJob) {
        showToast('Offre non trouvée dans les résultats', 'error', 2000);
        return;
    }
    
    // Show loading state on the clicked button
    const btnSelector = mode === 'ai' 
        ? '#scoreModal button[onclick="window.recalculateScore(\'ai\')"]'
        : '#scoreModal button[onclick="window.recalculateScore(\'local\')"]';
    const btn = document.querySelector(btnSelector);
    const originalHtml = btn?.innerHTML;
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="h-4 w-4 animate-spin"></i> Calcul...';
        initIcons();
    }
    
    try {
        const profile = getProfile();
        
        if (!profile) {
            showToast('Profil non chargé', 'error', 2000);
            return;
        }
        
        let newScore;
        
        if (mode === 'ai') {
            // Use AI scoring
            const { scoreJobWithAi, isAiScoringAvailable } = await import('./ai-matching.js');
            
            const availability = isAiScoringAvailable();
            if (!availability.available) {
                showToast(availability.reason, 'error', 3000);
                return;
            }
            
            // Force recalculation by passing true as second argument
            newScore = await scoreJobWithAi(fullJob, true);
            showToast('Score IA recalculé (forcé)!', 'success', 2000);
        } else {
            // Use local scoring
            const { calculateLocalScore } = await import('./ai-matching.js');
            newScore = calculateLocalScore(profile, fullJob);
            showToast('Score local recalculé!', 'success', 2000);
        }
        
        if (newScore) {
            // Update the modal with new score
            openScoreModal(newScore, currentScoreDebugData.job);
            
            // Also update the card in the grid if visible
            updateJobCardScore(jobId, newScore);
        }
    } catch (error) {
        console.error('Erreur recalcul:', error);
        showToast('Erreur: ' + error.message, 'error', 3000);
    } finally {
        // Restore button
        if (btn && originalHtml) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
            initIcons();
        }
    }
}

/**
 * Updates a job card's score badge in the grid
 */
function updateJobCardScore(jobId, scoreData) {
    const card = document.querySelector(`[data-job-id="${jobId}"]`);
    if (!card) return;
    
    const scoreBadge = card.querySelector('.score-badge');
    if (scoreBadge) {
        // Update the badge data
        scoreBadge.dataset.score = encodeURIComponent(JSON.stringify(scoreData));
        
        // Update the displayed score
        const scoreText = scoreBadge.querySelector('span');
        if (scoreText) {
            scoreText.textContent = scoreData.score + '%';
        }
        
        // Update colors
        const colors = getScoreColor(scoreData.score);
        scoreBadge.className = `score-badge flex items-center gap-1 px-2 py-0.5 rounded ${colors.bg} border ${colors.border} hover:opacity-80 transition-opacity cursor-pointer`;
        scoreText.className = `text-xs font-bold ${colors.text}`;
    }
}

/**
 * Gets score color classes based on score value
 */
function getScoreColor(score) {
    if (score >= 70) return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' };
    if (score >= 50) return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' };
    if (score >= 30) return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' };
    return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' };
}

/**
 * Score visible jobs with AI
 * Scores all currently displayed jobs using Gemini AI
 */
async function scoreVisibleJobsWithAI() {
    const profile = getProfile();
    if (!profile) {
        showToast('Veuillez d\'abord configurer votre profil CV', 'error', 3000);
        return;
    }
    
    const availability = isAiScoringAvailable();
    if (!availability.available) {
        showToast(availability.reason, 'error', 3000);
        return;
    }
    
    // Get current visible jobs from the grid
    const rawData = getRawData();
    if (!rawData || !rawData.results || rawData.results.length === 0) {
        showToast('Aucune offre à scorer', 'warning', 2000);
        return;
    }
    
    // Get jobs that are currently visible (not filtered out)
    const visibleCards = document.querySelectorAll('#resultsGrid > div[data-job-id]');
    const visibleJobIds = new Set(Array.from(visibleCards).map(card => card.dataset.jobId));
    
    // Filter jobs to only those visible and not already AI-scored
    const jobsToScore = rawData.results.filter(job => {
        const jobId = job.numerooffreforem;
        if (!visibleJobIds.has(jobId)) return false;
        
        const existing = getStoredScore(jobId);
        return !existing || !existing.isAiScore;
    });
    
    if (jobsToScore.length === 0) {
        showToast('Toutes les offres visibles ont déjà un score IA', 'info', 2000);
        return;
    }
    
    // Update button state
    const btn = document.getElementById('btnAiScore');
    const btnText = document.getElementById('btnAiScoreText');
    const btnCount = document.getElementById('btnAiScoreCount');
    
    btn.disabled = true;
    const totalToScore = jobsToScore.length;
    let scored = 0;
    let errors = 0;
    
    btnText.textContent = 'Scoring...';
    btnCount.textContent = `0/${totalToScore}`;
    
    // Score each job sequentially (to respect rate limits)
    for (const job of jobsToScore) {
        try {
            btnCount.textContent = `${scored + 1}/${totalToScore}`;
            await scoreJobWithAi(job);
            scored++;
            
            // Small delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error('Error scoring job:', job.numerooffreforem, error);
            errors++;
            
            // If we hit rate limit, stop
            if (error.code === 'RATE_LIMITED' || error.message?.includes('429')) {
                showToast('Limite de requêtes atteinte, réessayez plus tard', 'warning', 3000);
                break;
            }
        }
    }
    
    // Re-render results to show new scores
    renderResults(rawData);
    initIcons();
    
    // Update button state
    btn.disabled = false;
    btnText.textContent = 'Scorer avec IA';
    updateAiScoreButton();
    
    // Show result
    if (errors > 0) {
        showToast(`${scored} offres scorées, ${errors} erreurs`, 'warning', 3000);
    } else {
        showToast(`${scored} offres scorées avec succès!`, 'success', 3000);
    }
}

/**
 * Updates the AI score button visibility and count
 */
function updateAiScoreButton() {
    const btn = document.getElementById('btnAiScore');
    const btnCount = document.getElementById('btnAiScoreCount');
    
    if (!btn) return;
    
    const profile = getProfile();
    const rawData = getRawData();
    
    if (!profile || !rawData || !rawData.results) {
        btn.classList.add('hidden');
        btn.classList.remove('flex');
        return;
    }
    
    // Count visible jobs without AI score
    const visibleCards = document.querySelectorAll('#resultsGrid > div[data-job-id]');
    const visibleJobIds = new Set(Array.from(visibleCards).map(card => card.dataset.jobId));
    
    const jobsWithoutAiScore = rawData.results.filter(job => {
        const jobId = job.numerooffreforem;
        if (!visibleJobIds.has(jobId)) return false;
        const existing = getStoredScore(jobId);
        return !existing || !existing.isAiScore;
    }).length;
    
    if (jobsWithoutAiScore > 0) {
        btn.classList.remove('hidden');
        btn.classList.add('flex');
        btnCount.textContent = jobsWithoutAiScore;
    } else {
        btn.classList.add('hidden');
        btn.classList.remove('flex');
    }
}

// Export for use after render
window.updateAiScoreButton = updateAiScoreButton;
window.scoreVisibleJobsWithAI = scoreVisibleJobsWithAI;

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
// Score modal functions
window.openScoreModal = openScoreModal;
window.closeScoreModal = closeScoreModal;
window.copyScoreDebugJson = copyScoreDebugJson;
window.recalculateScore = recalculateScore;

// Initialize when DOM is ready
init();

// Refresh saved searches dropdown on load
refreshSavedSearchesDropdown();
