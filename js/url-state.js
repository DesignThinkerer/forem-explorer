/**
 * URL State Management Module
 * Synchronizes application state with browser URL for deep linking and navigation.
 * Enables sharing searches and using browser back/forward buttons.
 */
import { getUserLocation, setUserLocation } from './state.js';
import { updateDistanceUI } from './geolocation.js';

/**
 * Updates the browser URL to reflect the current filter state.
 * Encodes all active filters (keywords, category, location, etc.) into URL query parameters.
 * Skips default values to keep URLs clean.
 * Uses replaceState to avoid polluting browser history on every filter change.
 */
export function updateUrlParams() {
    try {
        const p = new URLSearchParams();
        const ids = ['keywords', 'categoryFilter', 'limitFilter', 'sortFilter', 'dateFilter', 'regimeFilter', 'educationFilter', 'distanceFilter'];
        const keys = ['q', 'cat', 'limit', 'sort', 'days', 'regime', 'edu', 'dist'];
        
        ids.forEach((id, i) => {
            const v = document.getElementById(id).value;
            if (v && v !== '50' && v !== 'datedebutdiffusion desc') p.set(keys[i], v);
        });

        const getVals = (n) => Array.from(document.querySelectorAll(`input[name="${n}"]:checked`)).map(c => c.value).join(',');
        const locs = getVals('loc'); if (locs) p.set('loc', locs);
        const contracts = getVals('contract'); if (contracts) p.set('contract', contracts);
        const langs = getVals('lang'); if (langs) p.set('lang', langs);
        
        // Status filters
        const bookmarkFilter = document.getElementById('bookmarkFilter')?.value;
        const appliedFilter = document.getElementById('appliedFilter')?.value;
        const ignoredFilter = document.getElementById('ignoredFilter')?.value;
        if (bookmarkFilter && bookmarkFilter !== 'all') p.set('bookmarkFilter', bookmarkFilter);
        if (appliedFilter && appliedFilter !== 'all') p.set('appliedFilter', appliedFilter);
        if (ignoredFilter && ignoredFilter !== 'show') p.set('ignoredFilter', ignoredFilter);
        
        const userLocation = getUserLocation();
        if (userLocation) {
            p.set('lat', userLocation.lat); 
            p.set('lon', userLocation.lon); 
            p.set('city', userLocation.name);
        }
        window.history.replaceState({}, '', `${window.location.pathname}?${p.toString()}`);
    } catch (e) {
        console.error("URL update error:", e);
    }
}

/**
 * Restores application state from URL query parameters.
 * Reads URL parameters and sets corresponding UI filter values.
 * Restores user location if lat/lon parameters are present.
 * Triggers search automatically if any parameters are found.
 * @param {Function} handleSearchCallback - Callback function to execute after state restoration (typically handleSearch)
 */
export function restoreStateFromUrl(handleSearchCallback) {
    const p = new URLSearchParams(window.location.search);
    const map = {
        'q': 'keywords', 'cat': 'categoryFilter', 'limit': 'limitFilter',
        'sort': 'sortFilter', 'days': 'dateFilter', 'regime': 'regimeFilter', 
        'edu': 'educationFilter', 'dist': 'distanceFilter'
    };
    
    for (const [k, id] of Object.entries(map)) {
        if (p.has(k)) document.getElementById(id).value = p.get(k);
    }

    const restoreChecks = () => {
        const keys = ['loc', 'contract', 'lang'];
        keys.forEach(k => {
            if (p.has(k)) {
                p.get(k).split(',').forEach(v => {
                    const cb = document.querySelector(`input[name="${k}"][value="${v}"]`);
                    if (cb) cb.checked = true;
                });
            }
        });
    };
    setTimeout(restoreChecks, 500);

    if (p.has('lat')) {
        setUserLocation({ 
            lat: parseFloat(p.get('lat')), 
            lon: parseFloat(p.get('lon')), 
            name: p.get('city') 
        });
        document.getElementById('gpsInfo').classList.remove('hidden');
        document.getElementById('gpsCoords').textContent = `📍 ${p.get('city')}`;
        updateDistanceUI();
    }
    
    // Restore status filters
    if (p.has('bookmarkFilter')) {
        const el = document.getElementById('bookmarkFilter');
        if (el) el.value = p.get('bookmarkFilter');
    }
    if (p.has('appliedFilter')) {
        const el = document.getElementById('appliedFilter');
        if (el) el.value = p.get('appliedFilter');
    }
    if (p.has('ignoredFilter')) {
        const el = document.getElementById('ignoredFilter');
        if (el) el.value = p.get('ignoredFilter');
    }
    
    // When tracked=true, set both filters to 'all' for visual consistency
    if (p.get('tracked') === 'true') {
        const bookmarkEl = document.getElementById('bookmarkFilter');
        const appliedEl = document.getElementById('appliedFilter');
        if (bookmarkEl) bookmarkEl.value = 'all';
        if (appliedEl) appliedEl.value = 'all';
    }
    
    if ([...p.keys()].length && handleSearchCallback) {
        handleSearchCallback(null, true);
    }
}
