// URL State Management Module
import { getUserLocation, setUserLocation } from './state.js';
import { updateDistanceUI } from './geolocation.js';

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
    
    if ([...p.keys()].length && handleSearchCallback) {
        handleSearchCallback(null, true);
    }
}
