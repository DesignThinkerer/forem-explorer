// Geolocation Module
import { showToast } from './utils.js';
import { setUserLocation, getUserLocation } from './state.js';

export function updateDistanceUI() {
    const distContainer = document.getElementById('distanceContainer');
    const userLocation = getUserLocation();
    if (userLocation) {
        distContainer.classList.remove('hidden');
    } else {
        distContainer.classList.add('hidden');
    }
}

export function triggerGeo(onSuccess) {
    const userLocation = getUserLocation();
    if (userLocation) {
        updateDistanceUI();
        return;
    }
    if (!navigator.geolocation) { 
        fallbackManual(); 
        return; 
    }
    showToast("GPS...", false);
    navigator.geolocation.getCurrentPosition(
        p => {
            setUserLocation({ lat: p.coords.latitude, lon: p.coords.longitude, name: "GPS" });
            document.getElementById('gpsInfo').classList.remove('hidden');
            document.getElementById('gpsCoords').textContent = "📍 GPS";
            updateDistanceUI();
            if (onSuccess) onSuccess();
        },
        e => { fallbackManual(); }
    );
}

export function fallbackManual() {
    document.getElementById('manualLocationContainer').classList.remove('hidden');
    document.getElementById('cityInput').focus();
}

export async function manualCitySearch(onSuccess) {
    const q = document.getElementById('cityInput').value;
    if (!q) return;
    try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&countrycodes=be&limit=1`);
        const d = await r.json();
        if (d.length) {
            setUserLocation({ lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon), name: d[0].name });
            document.getElementById('gpsInfo').classList.remove('hidden');
            document.getElementById('gpsCoords').textContent = `📍 ${d[0].name}`;
            updateDistanceUI();
            if (onSuccess) onSuccess();
        } else {
            showToast("Ville introuvable", true);
        }
    } catch (e) { 
        showToast("Erreur", true); 
    }
}
