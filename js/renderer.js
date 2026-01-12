/**
 * Results Renderer Module
 * Handles the display of job search results in a card-based grid layout.
 */
import { initIcons, getDistance } from './utils.js';
import { getUserLocation } from './state.js';
import { openJobModal } from './job-modal.js';
import { getJobState, toggleBookmark, toggleApplied } from './bookmarks.js';

/**
 * Renders job search results as a grid of cards.
 * Creates HTML cards for each job with title, company, location, contract type, and optional badges.
 * Displays distance if user location is available.
 * Cards are clickable to open a detailed modal view.
 * @param {Object} data - The search results data from the API
 * @param {Array} data.results - Array of job objects
 * @param {string} data.results[].titreoffre - Job title
 * @param {string} data.results[].nomemployeur - Employer name
 * @param {string[]} data.results[].lieuxtravaillocalite - Job location(s)
 * @param {string} data.results[].datedebutdiffusion - Publication date (ISO format)
 * @param {string} data.results[].typecontrat - Contract type
 * @param {string} data.results[].regimetravail - Work regime (full-time, part-time, etc.)
 * @param {string[]} data.results[].niveauxetudes - Required education levels
 * @param {Object[]} data.results[].lieuxtravailgeo - Geographic coordinates for location
 * @param {string} data.results[].url - URL to the job posting
 */
export function renderResults(data) {
    const grid = document.getElementById('resultsGrid');
    const userLocation = getUserLocation();
    grid.innerHTML = "";
    
    // Get status filter
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    
    // Filter results based on status
    let filteredResults = data.results.filter(job => {
        const jobId = job.numerooffreforem;
        const state = getJobState(jobId);
        
        switch (statusFilter) {
            case 'bookmarked':
                return state.bookmarked;
            case 'applied':
                return state.applied;
            case 'not-applied':
                return !state.applied;
            case 'exclude-applied':
                return !state.applied;
            case 'all':
            default:
                return true;
        }
    });
    
    // Show message if no results after filtering
    if (filteredResults.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i data-lucide="filter-x" class="h-12 w-12 text-slate-300 mx-auto mb-4"></i>
                <p class="text-slate-500 font-medium">Aucune offre ne correspond au filtre de statut sélectionné.</p>
                <p class="text-slate-400 text-sm mt-2">Essayez de changer le filtre ou d'effectuer une nouvelle recherche.</p>
            </div>
        `;
        initIcons();
        return;
    }
    
    filteredResults.forEach(job => {
        const jobId = job.numerooffreforem;
        const state = getJobState(jobId);
        
        const title = job.titreoffre || "Sans titre";
        const comp = job.nomemployeur || "Confidentiel";
        const city = job.lieuxtravaillocalite ? job.lieuxtravaillocalite[0] : "Belgique";
        const date = job.datedebutdiffusion ? new Date(job.datedebutdiffusion).toLocaleDateString('fr-BE') : "?";
        const contract = job.typecontrat || "";
        
        // Status badges
        const bookmarkBadge = state.bookmarked 
            ? `<span class="px-2 py-0.5 bg-amber-100 text-amber-700 rounded border border-amber-200 text-xs font-semibold flex items-center gap-1">
                <i data-lucide="bookmark-check" class="h-3 w-3"></i> À consulter
               </span>` 
            : "";
        const appliedBadge = state.applied 
            ? `<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded border border-green-200 text-xs font-semibold flex items-center gap-1">
                <i data-lucide="check-circle-2" class="h-3 w-3"></i> Postulé
               </span>` 
            : "";
        
        const regime = job.regimetravail 
            ? `<span class="px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-100 text-xs">${job.regimetravail}</span>` 
            : "";
        const edu = job.niveauxetudes && job.niveauxetudes[0] 
            ? `<span class="px-2 py-0.5 bg-orange-50 text-orange-700 rounded border border-orange-100 text-xs truncate max-w-[150px]">${job.niveauxetudes[0]}</span>` 
            : "";

        let distBadge = "";
        if (userLocation && job.lieuxtravailgeo && job.lieuxtravailgeo[0]) {
            const km = getDistance(userLocation.lat, userLocation.lon, job.lieuxtravailgeo[0].lat, job.lieuxtravailgeo[0].lon);
            distBadge = `<span class="ml-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-1 rounded">${km} km</span>`;
        }

        const el = document.createElement('div');
        el.className = "bg-white border border-slate-200 p-4 rounded-lg hover:shadow-md transition-shadow flex flex-col md:flex-row gap-4 relative overflow-hidden cursor-pointer";
        el.dataset.jobId = jobId; // Store job ID for updates
        el.innerHTML = `
            <div class="absolute left-0 top-0 bottom-0 w-1 ${contract.includes('indéterminée') ? 'bg-green-500' : 'bg-slate-300'}"></div>
            <div class="flex-1 min-w-0">
                <div class="flex flex-wrap gap-2 mb-1">${bookmarkBadge}${appliedBadge}${regime}${edu}</div>
                <h3 class="font-bold text-slate-800 truncate hover:text-blue-600">${title}</h3>
                <div class="text-sm text-slate-600 flex items-center gap-2 mt-1">
                    <i data-lucide="building-2" class="h-3 w-3"></i> ${comp}
                    <span class="text-slate-300">|</span>
                    <i data-lucide="map-pin" class="h-3 w-3"></i> ${city} ${distBadge}
                </div>
            </div>
            <div class="text-right flex flex-col items-end justify-between gap-2">
                <div class="flex gap-2">
                    <button class="bookmark-btn p-2 rounded-lg transition-all ${state.bookmarked ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-600'}" 
                            data-job-id="${jobId}" 
                            title="À consulter"
                            aria-label="À consulter">
                        <i data-lucide="${state.bookmarked ? 'bookmark-check' : 'bookmark'}" class="h-4 w-4"></i>
                    </button>
                    <button class="applied-btn p-2 rounded-lg transition-all ${state.applied ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-slate-100 text-slate-400 hover:bg-green-50 hover:text-green-600'}" 
                            data-job-id="${jobId}" 
                            title="Marquer comme postulé"
                            aria-label="Marquer comme postulé">
                        <i data-lucide="${state.applied ? 'check-circle-2' : 'check-circle'}" class="h-4 w-4"></i>
                    </button>
                </div>
                <span class="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-700">${contract}</span>
                <span class="text-xs text-slate-400">${date}</span>
            </div>
        `;
        
        // Add click handler to open modal
        el.addEventListener('click', (e) => {
            // Don't open modal if clicking on action buttons
            if (e.target.closest('.bookmark-btn') || e.target.closest('.applied-btn')) {
                return;
            }
            openJobModal(job);
        });
        
        // Add bookmark button handler
        const bookmarkBtn = el.querySelector('.bookmark-btn');
        if (bookmarkBtn) {
            bookmarkBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevent card click
                const newState = toggleBookmark(jobId);
                updateCardButton(bookmarkBtn, newState, 'bookmark');
                updateCardBadges(el, jobId); // Update badges too
            });
        }
        
        // Add applied button handler
        const appliedBtn = el.querySelector('.applied-btn');
        if (appliedBtn) {
            appliedBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevent card click
                const newState = toggleApplied(jobId);
                updateCardButton(appliedBtn, newState, 'applied');
                updateCardBadges(el, jobId); // Update badges too
            });
        }
        
        grid.appendChild(el);
    });
    initIcons();
}

/**
 * Updates a single button's appearance based on state.
 * @param {HTMLElement} btn - The button element
 * @param {boolean} isActive - Whether the state is active
 * @param {string} type - 'bookmark' or 'applied'
 */
function updateCardButton(btn, isActive, type) {
    if (!btn) return; // Safety check
    
    if (type === 'bookmark') {
        if (isActive) {
            btn.className = 'bookmark-btn p-2 rounded-lg transition-all bg-amber-500 text-white hover:bg-amber-600';
            btn.innerHTML = '<i data-lucide="bookmark-check" class="h-4 w-4"></i>';
            btn.title = 'À consulter ✓';
        } else {
            btn.className = 'bookmark-btn p-2 rounded-lg transition-all bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-600';
            btn.innerHTML = '<i data-lucide="bookmark" class="h-4 w-4"></i>';
            btn.title = 'À consulter';
        }
    } else if (type === 'applied') {
        if (isActive) {
            btn.className = 'applied-btn p-2 rounded-lg transition-all bg-green-500 text-white hover:bg-green-600';
            btn.innerHTML = '<i data-lucide="check-circle-2" class="h-4 w-4"></i>';
            btn.title = 'Postulé ✓';
        } else {
            btn.className = 'applied-btn p-2 rounded-lg transition-all bg-slate-100 text-slate-400 hover:bg-green-50 hover:text-green-600';
            btn.innerHTML = '<i data-lucide="check-circle" class="h-4 w-4"></i>';
            btn.title = 'Marquer comme postulé';
        }
    }
    
    // Reinitialize icons for this button
    initIcons();
}

/**
 * Updates the status badges in a card based on current state.
 * @param {HTMLElement} card - The card element
 * @param {string} jobId - The job ID
 */
function updateCardBadges(card, jobId) {
    const state = getJobState(jobId);
    const badgeContainer = card.querySelector('.flex-wrap');
    if (!badgeContainer) return;
    
    // Remove existing status badges
    const existingBookmark = badgeContainer.querySelector('[data-lucide="bookmark-check"]')?.closest('span');
    const existingApplied = badgeContainer.querySelector('[data-lucide="check-circle-2"]')?.closest('span');
    if (existingBookmark) existingBookmark.remove();
    if (existingApplied) existingApplied.remove();
    
    // Add bookmark badge if active
    if (state.bookmarked) {
        const badge = document.createElement('span');
        badge.className = 'px-2 py-0.5 bg-amber-100 text-amber-700 rounded border border-amber-200 text-xs font-semibold flex items-center gap-1';
        badge.innerHTML = '<i data-lucide="bookmark-check" class="h-3 w-3"></i> À consulter';
        badgeContainer.insertBefore(badge, badgeContainer.firstChild);
    }
    
    // Add applied badge if active
    if (state.applied) {
        const badge = document.createElement('span');
        badge.className = 'px-2 py-0.5 bg-green-100 text-green-700 rounded border border-green-200 text-xs font-semibold flex items-center gap-1';
        badge.innerHTML = '<i data-lucide="check-circle-2" class="h-3 w-3"></i> Postulé';
        const bookmark = badgeContainer.querySelector('[data-lucide="bookmark-check"]')?.closest('span');
        if (bookmark) {
            bookmark.after(badge);
        } else {
            badgeContainer.insertBefore(badge, badgeContainer.firstChild);
        }
    }
    
    initIcons();
}

// Listen for state changes and update cards in real-time
window.addEventListener('jobStateChanged', (event) => {
    const { jobId, type, value } = event.detail;
    const card = document.querySelector(`[data-job-id="${jobId}"]`);
    
    if (!card) return;
    
    // Update the icon buttons
    if (type === 'bookmark') {
        const btn = card.querySelector('.bookmark-btn');
        if (btn) updateCardButton(btn, value, 'bookmark');
    } else if (type === 'applied') {
        const btn = card.querySelector('.applied-btn');
        if (btn) updateCardButton(btn, value, 'applied');
    }
    
    // Update all badges in the card
    updateCardBadges(card, jobId);
});
