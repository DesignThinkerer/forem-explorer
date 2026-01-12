/**
 * Job Modal Module
 * Handles displaying detailed job information in a modal overlay.
 */
import { initIcons } from './utils.js';
import { BASE_URL } from './config.js';
import { getJobState, toggleBookmark, toggleApplied } from './bookmarks.js';

// Store current job ID globally for bookmark/applied handlers
let currentJobId = null;

/**
 * Fetches full job details from the API by record ID.
 * @param {string} recordId - The record ID
 * @returns {Promise<Object>} The complete job record
 */
async function fetchJobDetails(recordId) {
    const url = `${BASE_URL}/${recordId}?timezone=Europe/Brussels`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch job details');
    return await response.json();
}

/**
 * Opens the job detail modal and populates it with job data.
 * Fetches complete job details from the API before displaying.
 * @param {Object} job - The job data object from the search results
 */
export async function openJobModal(job) {
    const modal = document.getElementById('jobModal');
    
    // Show modal with loading state
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('modalTitle').textContent = 'Chargement...';
    
    try {
        // Fetch complete job details
        const fullJob = await fetchJobDetails(job._id);
        populateModal(fullJob);
    } catch (error) {
        console.error('Error fetching job details:', error);
        // Fall back to the data we have
        populateModal(job);
    }
}

/**
 * Populates the modal with job data.
 * @param {Object} job - The complete job data object
 */
function populateModal(job) {
    // Store job ID for bookmark/applied handlers
    currentJobId = job.numerooffreforem;
    
    // Get current state
    const state = getJobState(currentJobId);
    
    // Update button states
    updateBookmarkButton(state.bookmarked);
    updateAppliedButton(state.applied);
    
    // Log all available fields for debugging
    console.log('Available job fields:', Object.keys(job));
    console.log('Job data:', job);
    
    // Set title
    document.getElementById('modalTitle').textContent = job.titreoffre || "Sans titre";
    
    // Set company
    document.getElementById('modalCompany').innerHTML = `
        <i data-lucide="building-2" class="h-4 w-4"></i>
        ${job.nomemployeur || "Confidentiel"}
    `;
    
    // Set location
    const city = job.lieuxtravaillocalite ? job.lieuxtravaillocalite.join(', ') : "Belgique";
    document.getElementById('modalLocation').innerHTML = `
        <i data-lucide="map-pin" class="h-4 w-4"></i>
        ${city}
    `;
    
    // Set date and calculate days left
    const date = job.datedebutdiffusion 
        ? new Date(job.datedebutdiffusion).toLocaleDateString('fr-BE', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        : "Date non disponible";
    
    // Calculate days left until end of diffusion
    let daysLeftHTML = '';
    if (job.datefindiffusion) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        const endDate = new Date(job.datefindiffusion);
        endDate.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        
        let badgeColor = 'bg-green-100 text-green-700';
        let icon = 'check-circle';
        
        if (daysLeft <= 0) {
            badgeColor = 'bg-red-100 text-red-700';
            icon = 'alert-circle';
        } else if (daysLeft <= 7) {
            badgeColor = 'bg-orange-100 text-orange-700';
            icon = 'alert-triangle';
        }
        
        daysLeftHTML = `
            <span class="${badgeColor} px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ml-2">
                <i data-lucide="${icon}" class="h-3 w-3"></i>
                ${daysLeft > 0 ? `${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}` : 'Expiré'}
            </span>
        `;
    }
    
    document.getElementById('modalDate').innerHTML = `
        <i data-lucide="calendar" class="h-4 w-4"></i>
        ${date}
        ${daysLeftHTML}
    `;
    
    // Set badges
    const badges = [];
    if (job.typecontrat) {
        badges.push(`<span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">${job.typecontrat}</span>`);
    }
    if (job.regimetravail) {
        badges.push(`<span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">${job.regimetravail}</span>`);
    }
    if (job.niveauxetudes && job.niveauxetudes[0]) {
        badges.push(`<span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">${job.niveauxetudes[0]}</span>`);
    }
    if (job.langues && job.langues.length) {
        job.langues.forEach(lang => {
            badges.push(`<span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"><i data-lucide="globe" class="h-3 w-3 inline"></i> ${lang}</span>`);
        });
    }
    document.getElementById('modalBadges').innerHTML = badges.join('');
    
    // Set description section - show ALL text fields dynamically
    const descSection = document.getElementById('modalDescriptionSection');
    const descContent = document.getElementById('modalDescription');
    
    // Collect all long text fields that might contain descriptions
    const textFields = [];
    const skipFields = ['_id', '_timestamp', '_size', 'titreoffre', 'nomemployeur', 'typecontrat', 
                        'regimetravail', 'url', 'metier', 'datedebutdiffusion', 'datecloture',
                        'numerooffreforem', 'referenceexterne', 'source'];
    
    Object.keys(job).forEach(key => {
        const value = job[key];
        // Check if it's a long string (potential description)
        if (typeof value === 'string' && value.length > 100 && !skipFields.includes(key)) {
            textFields.push({ label: key, content: value });
        }
    });
    
    if (textFields.length > 0) {
        descContent.innerHTML = textFields.map(field => `
            <div class="mb-4">
                <div class="text-sm font-semibold text-blue-600 mb-2">${field.label}</div>
                <div class="whitespace-pre-wrap text-slate-700">${field.content}</div>
            </div>
        `).join('');
        descSection.classList.remove('hidden');
    } else {
        // Show message when no description is available
        descContent.innerHTML = `
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <i data-lucide="info" class="h-5 w-5 text-blue-600 inline-block mb-2"></i>
                <p class="text-sm text-blue-800">
                    La description détaillée de cette offre n'est pas disponible via l'API.<br>
                    Cliquez sur <strong>"Voir sur Le Forem"</strong> ci-dessous pour consulter tous les détails.
                </p>
            </div>
        `;
        descSection.classList.remove('hidden');
    }
    
    // Set additional info - display relevant fields in a more organized way
    const additionalInfo = [];
    const displayedInDescription = textFields.map(f => f.label);
    const alreadyDisplayed = [...skipFields, ...displayedInDescription, 'lieuxtravaillocalite', 
                              'lieuxtravailgeo', 'niveauxetudes', 'langues', 'lieuxtravailcodepostal'];
    
    // Priority fields to show first
    const priorityFields = [
        { key: 'numerooffreforem', label: 'Numéro offre FOREM' },
        { key: 'nombrepostes', label: 'Nombre de postes' },
        { key: 'secteurs', label: 'Secteurs' },
        { key: 'lieuxtravailregion', label: 'Région' },
        { key: 'datefindiffusion', label: 'Date fin diffusion' }
    ];
    
    priorityFields.forEach(({ key, label }) => {
        if (job[key] && !alreadyDisplayed.includes(key)) {
            let displayValue = Array.isArray(job[key]) ? job[key].join(', ') : String(job[key]);
            
            // Format dates
            if (key.includes('date') && displayValue.length === 10) {
                try {
                    displayValue = new Date(displayValue).toLocaleDateString('fr-BE', { 
                        year: 'numeric', month: 'long', day: 'numeric' 
                    });
                } catch (e) {}
            }
            
            additionalInfo.push(`
                <div class="bg-slate-50 p-4 rounded-lg">
                    <div class="text-xs text-slate-500 font-medium mb-1">${label}</div>
                    <div class="text-sm text-slate-800 font-medium">${displayValue}</div>
                </div>
            `);
            alreadyDisplayed.push(key);
        }
    });
    
    // Add remaining fields
    Object.keys(job).forEach(key => {
        if (alreadyDisplayed.includes(key)) return;
        
        const value = job[key];
        if (!value || key.startsWith('_')) return;
        
        let displayValue = '';
        if (Array.isArray(value)) {
            displayValue = value.join(', ');
        } else if (typeof value === 'object') {
            return; // Skip complex objects
        } else {
            displayValue = String(value);
        }
        
        if (displayValue && displayValue.length < 200) {
            const label = key.replace(/([A-Z])/g, ' $1')
                            .replace(/^./, str => str.toUpperCase())
                            .trim();
            
            additionalInfo.push(`
                <div class="bg-slate-50 p-4 rounded-lg">
                    <div class="text-xs text-slate-500 font-medium mb-1">${label}</div>
                    <div class="text-sm text-slate-800 font-medium">${displayValue}</div>
                </div>
            `);
        }
    });
    
    document.getElementById('modalAdditionalInfo').innerHTML = additionalInfo.join('');
    
    // Set external link
    document.getElementById('modalExternalLink').href = job.url || '#';
    
    // Reinitialize icons
    setTimeout(() => initIcons(), 50);
}

/**
 * Closes the job detail modal.
 */
export function closeJobModal() {
    const modal = document.getElementById('jobModal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    currentJobId = null;
}

/**
 * Updates the bookmark button appearance based on state.
 * @param {boolean} isBookmarked - Whether the job is bookmarked
 */
function updateBookmarkButton(isBookmarked) {
    const btn = document.getElementById('btnBookmark');
    const icon = btn.querySelector('i');
    const text = btn.querySelector('.bookmark-text');
    
    if (isBookmarked) {
        btn.classList.remove('border-amber-300', 'text-amber-700', 'hover:bg-amber-50', 'bg-white');
        btn.classList.add('bg-amber-500', 'text-white', 'hover:bg-amber-600', 'border-amber-500');
        icon.setAttribute('data-lucide', 'bookmark-check');
        text.textContent = 'À consulter ✓';
    } else {
        btn.classList.remove('bg-amber-500', 'text-white', 'hover:bg-amber-600', 'border-amber-500');
        btn.classList.add('border-amber-300', 'text-amber-700', 'hover:bg-amber-50', 'bg-white');
        icon.setAttribute('data-lucide', 'bookmark');
        text.textContent = 'À consulter';
    }
    
    setTimeout(() => initIcons(), 10);
}

/**
 * Updates the applied button appearance based on state.
 * @param {boolean} isApplied - Whether the user has applied
 */
function updateAppliedButton(isApplied) {
    const btn = document.getElementById('btnApplied');
    const icon = btn.querySelector('i');
    const text = btn.querySelector('.applied-text');
    
    if (isApplied) {
        btn.classList.remove('border-green-300', 'text-green-700', 'hover:bg-green-50', 'bg-white');
        btn.classList.add('bg-green-500', 'text-white', 'hover:bg-green-600', 'border-green-500');
        icon.setAttribute('data-lucide', 'check-circle-2');
        text.textContent = 'Postulé ✓';
    } else {
        btn.classList.remove('bg-green-500', 'text-white', 'hover:bg-green-600', 'border-green-500');
        btn.classList.add('border-green-300', 'text-green-700', 'hover:bg-green-50', 'bg-white');
        icon.setAttribute('data-lucide', 'check-circle');
        text.textContent = 'Marquer comme postulé';
    }
    
    setTimeout(() => initIcons(), 10);
}

/**
 * Handles bookmark toggle action.
 */
export function handleBookmarkToggle() {
    if (!currentJobId) return;
    const newState = toggleBookmark(currentJobId);
    updateBookmarkButton(newState);
    
    // Update the result card if visible
    window.dispatchEvent(new CustomEvent('jobStateChanged', { 
        detail: { jobId: currentJobId, type: 'bookmark', value: newState }
    }));
}

/**
 * Handles applied toggle action.
 */
export function handleAppliedToggle() {
    if (!currentJobId) return;
    const newState = toggleApplied(currentJobId);
    updateAppliedButton(newState);
    
    // Update the result card if visible
    window.dispatchEvent(new CustomEvent('jobStateChanged', { 
        detail: { jobId: currentJobId, type: 'applied', value: newState }
    }));
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeJobModal();
    }
});

// Close modal on backdrop click
document.getElementById('jobModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'jobModal') {
        closeJobModal();
    }
});
