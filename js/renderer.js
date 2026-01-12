/**
 * Results Renderer Module
 * Handles the display of job search results in a card-based grid layout.
 */
import { initIcons, getDistance } from './utils.js';
import { getUserLocation } from './state.js';

/**
 * Renders job search results as a grid of cards.
 * Creates HTML cards for each job with title, company, location, contract type, and optional badges.
 * Displays distance if user location is available.
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
    
    data.results.forEach(job => {
        const title = job.titreoffre || "Sans titre";
        const comp = job.nomemployeur || "Confidentiel";
        const city = job.lieuxtravaillocalite ? job.lieuxtravaillocalite[0] : "Belgique";
        const date = job.datedebutdiffusion ? new Date(job.datedebutdiffusion).toLocaleDateString('fr-BE') : "?";
        const contract = job.typecontrat || "";
        
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
        el.className = "bg-white border border-slate-200 p-4 rounded-lg hover:shadow-md transition-shadow flex flex-col md:flex-row gap-4 relative overflow-hidden";
        el.innerHTML = `
            <div class="absolute left-0 top-0 bottom-0 w-1 ${contract.includes('indéterminée') ? 'bg-green-500' : 'bg-slate-300'}"></div>
            <div class="flex-1 min-w-0">
                <div class="flex gap-2 mb-1">${regime}${edu}</div>
                <h3 class="font-bold text-slate-800 truncate"><a href="${job.url}" target="_blank" class="hover:text-blue-600">${title}</a></h3>
                <div class="text-sm text-slate-600 flex items-center gap-2 mt-1">
                    <i data-lucide="building-2" class="h-3 w-3"></i> ${comp}
                    <span class="text-slate-300">|</span>
                    <i data-lucide="map-pin" class="h-3 w-3"></i> ${city} ${distBadge}
                </div>
            </div>
            <div class="text-right flex flex-col items-end justify-between">
                <span class="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-700">${contract}</span>
                <span class="text-xs text-slate-400 mt-2">${date}</span>
            </div>
        `;
        grid.appendChild(el);
    });
    initIcons();
}
