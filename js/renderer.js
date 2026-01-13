/**
 * Results Renderer Module
 * Handles the display of job search results in a card-based grid layout.
 */
import { initIcons, getDistance } from './utils.js';
import { getUserLocation } from './state.js';
import { openJobModal } from './job-modal.js';
import { getJobState, toggleBookmark, toggleApplied, toggleIgnored } from './bookmarks.js';
import { hasNote } from './notes.js';
import { getJobTags } from './tags.js';
import { getStoredScore, calculateLocalScore, getScoreColor } from './ai-matching.js';
import { getProfile } from './cv-profile.js';

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
    
    // Get status filters
    const bookmarkFilter = document.getElementById('bookmarkFilter')?.value || 'all';
    const appliedFilter = document.getElementById('appliedFilter')?.value || 'all';
    const ignoredFilter = document.getElementById('ignoredFilter')?.value || 'show';
    
    // Check for tracked=true URL parameter (shows all bookmarked OR applied)
    const urlParams = new URLSearchParams(window.location.search);
    const showTrackedOnly = urlParams.get('tracked') === 'true';
    const showNotedOnly = urlParams.get('noted') === 'true';
    
    // Filter results based on all status filters
    let filteredResults = data.results.filter(job => {
        const jobId = job.numerooffreforem;
        const state = getJobState(jobId);
        
        // If noted=true, only show jobs with notes
        if (showNotedOnly) {
            if (!hasNote(jobId)) return false;
            // Still respect ignored filter
            if (ignoredFilter === 'hide' && state.ignored) return false;
            return true;
        }
        
        // If tracked=true, only show bookmarked OR applied jobs
        if (showTrackedOnly) {
            if (!state.bookmarked && !state.applied) return false;
            // Still respect ignored filter
            if (ignoredFilter === 'hide' && state.ignored) return false;
            return true;
        }
        
        // Check ignored filter first (most restrictive)
        if (ignoredFilter === 'hide' && state.ignored) return false;
        if (ignoredFilter === 'only' && !state.ignored) return false;
        
        // Check bookmark filter
        let bookmarkPass = true;
        switch (bookmarkFilter) {
            case 'only':
                bookmarkPass = state.bookmarked;
                break;
            case 'exclude':
                bookmarkPass = !state.bookmarked;
                break;
            case 'all':
            default:
                bookmarkPass = true;
        }
        
        // Check applied filter
        let appliedPass = true;
        switch (appliedFilter) {
            case 'only':
                appliedPass = state.applied;
                break;
            case 'exclude':
                appliedPass = !state.applied;
                break;
            case 'all':
            default:
                appliedPass = true;
        }
        
        // Job must pass all filters
        return bookmarkPass && appliedPass;
    });

    // Apply score filter if profile exists
    const profile = getProfile();
    const scoreFilter = parseInt(document.getElementById('scoreFilter')?.value || '0');
    const scoreFilterContainer = document.getElementById('scoreFilterContainer');
    
    // Show/hide score filter based on profile existence
    if (scoreFilterContainer) {
        if (profile) {
            scoreFilterContainer.classList.remove('hidden');
        } else {
            scoreFilterContainer.classList.add('hidden');
        }
    }
    
    // Filter by minimum score if profile exists and filter is set
    if (profile && scoreFilter > 0) {
        filteredResults = filteredResults.filter(job => {
            const jobId = job.numerooffreforem;
            let scoreData = getStoredScore(jobId);
            if (!scoreData) {
                scoreData = calculateLocalScore(profile, job);
            }
            return scoreData && scoreData.score >= scoreFilter;
        });
    }
    
    // Show message if no results after filtering
    if (filteredResults.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i data-lucide="filter-x" class="h-12 w-12 text-slate-300 mx-auto mb-4"></i>
                <p class="text-slate-500 font-medium">Aucune offre ne correspond aux filtres sélectionnés.</p>
                <p class="text-slate-400 text-sm mt-2">Essayez de changer les filtres ou d'effectuer une nouvelle recherche.</p>
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
        
        // Note indicator badge
        const noteBadge = hasNote(jobId)
            ? `<span class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded border border-purple-200 text-xs font-semibold flex items-center gap-1">
                <i data-lucide="file-edit" class="h-3 w-3"></i> Note
               </span>`
            : "";
        
        // Custom tags badges (first 2 only)
        const jobTags = getJobTags(jobId).slice(0, 2);
        const colorMap = {
            red: 'bg-red-100 text-red-700 border-red-200',
            blue: 'bg-blue-100 text-blue-700 border-blue-200',
            green: 'bg-green-100 text-green-700 border-green-200',
            purple: 'bg-purple-100 text-purple-700 border-purple-200',
            orange: 'bg-orange-100 text-orange-700 border-orange-200',
            pink: 'bg-pink-100 text-pink-700 border-pink-200',
            yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200'
        };
        const tagBadges = jobTags.map(tag => 
            `<span class="px-2 py-0.5 ${colorMap[tag.color] || 'bg-slate-100 text-slate-700 border-slate-200'} rounded border text-xs font-medium">${tag.name}</span>`
        ).join('');
        
        const regime = job.regimetravail 
            ? `<span class="px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-100 text-xs">${job.regimetravail}</span>` 
            : "";
        const edu = job.niveauxetudes && job.niveauxetudes[0] 
            ? `<span class="px-2 py-0.5 bg-orange-50 text-orange-700 rounded border border-orange-100 text-xs truncate max-w-[150px]">${job.niveauxetudes[0]}</span>` 
            : "";
        const contractBadge = contract 
            ? `<span class="px-2 py-0.5 ${contract.includes('indéterminée') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-50 text-slate-700 border-slate-100'} rounded border text-xs">${contract}</span>` 
            : "";

        let distBadge = "";
        if (userLocation && job.lieuxtravailgeo && job.lieuxtravailgeo[0]) {
            const km = getDistance(userLocation.lat, userLocation.lon, job.lieuxtravailgeo[0].lat, job.lieuxtravailgeo[0].lon);
            distBadge = `<span class="ml-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-1 rounded">${km} km</span>`;
        }

        // AI Matching score badge
        let scoreBadge = "";
        const profile = getProfile();
        if (profile) {
            // Check for stored AI score first, then calculate local score
            let scoreData = getStoredScore(jobId);
            if (!scoreData) {
                scoreData = calculateLocalScore(profile, job);
            }
            if (scoreData && scoreData.score !== undefined) {
                const colors = getScoreColor(scoreData.score);
                const isAi = scoreData.isAiScore;
                // Store score data for the modal
                const scoreDataEncoded = encodeURIComponent(JSON.stringify(scoreData));
                const jobDataEncoded = encodeURIComponent(JSON.stringify({
                    titreoffre: job.titreoffre,
                    numerooffreforem: job.numerooffreforem,
                    nomemployeur: job.nomemployeur,
                    localiteaffichage: job.localiteaffichage || job.lieuxtravaillocalite?.[0]
                }));
                scoreBadge = `
                    <button class="score-badge flex items-center gap-1 px-2 py-0.5 rounded ${colors.bg} border ${colors.border} hover:opacity-80 transition-opacity cursor-pointer" 
                            title="Cliquez pour voir le détail du score"
                            data-score='${scoreDataEncoded}'
                            data-job='${jobDataEncoded}'>
                        <span class="text-xs font-bold ${colors.text}">${scoreData.score}%</span>
                        ${isAi ? '<i data-lucide="sparkles" class="h-3 w-3 text-violet-500"></i>' : ''}
                    </button>
                `;
            }
        }

        const el = document.createElement('div');
        el.className = "bg-white border border-slate-200 p-4 rounded-lg hover:shadow-md transition-shadow flex flex-col md:flex-row gap-4 relative overflow-hidden cursor-pointer";
        el.dataset.jobId = jobId; // Store job ID for updates
        el.innerHTML = `
            <div class="absolute left-0 top-0 bottom-0 w-1 ${contract.includes('indéterminée') ? 'bg-green-500' : 'bg-slate-300'}"></div>
            <div class="flex-1 min-w-0">
                <div class="flex flex-wrap gap-2 mb-1">${scoreBadge}${bookmarkBadge}${appliedBadge}${noteBadge}${tagBadges}${contractBadge}${regime}${edu}</div>
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
                    <button class="ignored-btn p-2 rounded-lg transition-all ${state.ignored ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600'}" 
                            data-job-id="${jobId}" 
                            title="Ignorer cette offre"
                            aria-label="Ignorer cette offre">
                        <i data-lucide="${state.ignored ? 'x-circle' : 'eye-off'}" class="h-4 w-4"></i>
                    </button>
                </div>
                <span class="text-xs text-slate-400">${date}</span>
            </div>
        `;
        
        // Add click handler to open modal
        el.addEventListener('click', (e) => {
            // Don't open modal if clicking on action buttons
            if (e.target.closest('.bookmark-btn') || e.target.closest('.applied-btn') || e.target.closest('.ignored-btn')) {
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
        
        // Add ignored button handler
        const ignoredBtn = el.querySelector('.ignored-btn');
        if (ignoredBtn) {
            ignoredBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevent card click
                const newState = toggleIgnored(jobId);
                updateCardButton(ignoredBtn, newState, 'ignored');
                updateCardBadges(el, jobId); // Update badges too
            });
        }
        
        // Add score badge handler
        const scoreBadge = el.querySelector('.score-badge');
        if (scoreBadge) {
            scoreBadge.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevent card click
                try {
                    const scoreData = JSON.parse(decodeURIComponent(scoreBadge.dataset.score));
                    const jobData = JSON.parse(decodeURIComponent(scoreBadge.dataset.job));
                    if (window.openScoreModal) {
                        window.openScoreModal(scoreData, jobData);
                    }
                } catch (err) {
                    console.error('Erreur parsing score data:', err);
                }
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
 * @param {string} type - 'bookmark', 'applied', or 'ignored'
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
    } else if (type === 'ignored') {
        if (isActive) {
            btn.className = 'ignored-btn p-2 rounded-lg transition-all bg-red-500 text-white hover:bg-red-600';
            btn.innerHTML = '<i data-lucide="x-circle" class="h-4 w-4"></i>';
            btn.title = 'Ignoré ✓';
        } else {
            btn.className = 'ignored-btn p-2 rounded-lg transition-all bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600';
            btn.innerHTML = '<i data-lucide="eye-off" class="h-4 w-4"></i>';
            btn.title = 'Ignorer cette offre';
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
    const existingNote = badgeContainer.querySelector('[data-lucide="file-edit"]')?.closest('span');
    // Remove existing tag badges
    const existingTags = badgeContainer.querySelectorAll('span:not([data-lucide])');
    existingTags.forEach(tag => {
        if (!tag.querySelector('[data-lucide]') && tag.className.includes('border-')) {
            tag.remove();
        }
    });
    
    if (existingBookmark) existingBookmark.remove();
    if (existingApplied) existingApplied.remove();
    if (existingNote) existingNote.remove();
    
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
    
    // Add note badge if present
    if (hasNote(jobId)) {
        const badge = document.createElement('span');
        badge.className = 'px-2 py-0.5 bg-purple-100 text-purple-700 rounded border border-purple-200 text-xs font-semibold flex items-center gap-1';
        badge.innerHTML = '<i data-lucide="file-edit" class="h-3 w-3"></i> Note';
        const applied = badgeContainer.querySelector('[data-lucide="check-circle-2"]')?.closest('span');
        const bookmark = badgeContainer.querySelector('[data-lucide="bookmark-check"]')?.closest('span');
        if (applied) {
            applied.after(badge);
        } else if (bookmark) {
            bookmark.after(badge);
        } else {
            badgeContainer.insertBefore(badge, badgeContainer.firstChild);
        }
    }
    
    // Add custom tags (first 2 only)
    const jobTags = getJobTags(jobId).slice(0, 2);
    const colorMap = {
        red: 'bg-red-100 text-red-700 border-red-200',
        blue: 'bg-blue-100 text-blue-700 border-blue-200',
        green: 'bg-green-100 text-green-700 border-green-200',
        purple: 'bg-purple-100 text-purple-700 border-purple-200',
        orange: 'bg-orange-100 text-orange-700 border-orange-200',
        pink: 'bg-pink-100 text-pink-700 border-pink-200',
        yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200'
    };
    
    const noteElement = badgeContainer.querySelector('[data-lucide="file-edit"]')?.closest('span');
    jobTags.forEach(tag => {
        const badge = document.createElement('span');
        badge.className = `px-2 py-0.5 ${colorMap[tag.color] || 'bg-slate-100 text-slate-700 border-slate-200'} rounded border text-xs font-medium`;
        badge.textContent = tag.name;
        if (noteElement) {
            noteElement.after(badge);
        } else {
            badgeContainer.appendChild(badge);
        }
    });
    
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
    } else if (type === 'ignored') {
        const btn = card.querySelector('.ignored-btn');
        if (btn) updateCardButton(btn, value, 'ignored');
    }
    
    // Update all badges in the card
    updateCardBadges(card, jobId);
});

// Listen for note changes and update cards
window.addEventListener('jobNoteChanged', (event) => {
    const { jobId } = event.detail;
    const card = document.querySelector(`[data-job-id="${jobId}"]`);
    
    if (!card) return;
    
    // Update badges to show/hide note indicator
    updateCardBadges(card, jobId);
});

// Listen for tag changes and update cards
window.addEventListener('jobTagsChanged', (event) => {
    const { jobId } = event.detail;
    const card = document.querySelector(`[data-job-id="${jobId}"]`);
    
    if (!card) return;
    
    // Update badges to show tags
    updateCardBadges(card, jobId);
});
