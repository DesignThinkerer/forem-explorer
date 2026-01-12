/**
 * Geolocation Module
 * Handles user location detection via GPS and manual city search.
 * Manages UI visibility for distance-based filtering.
 */
import { showToast } from './utils.js';
import { setUserLocation, getUserLocation } from './state.js';

/**
 * Updates the distance filter UI visibility based on whether user location is available.
 * Shows the distance filter container if location is set, hides it otherwise.
 */
export function updateDistanceUI() {
    const distContainer = document.getElementById('distanceContainer');
    const userLocation = getUserLocation();
    if (userLocation) {
        distContainer.classList.remove('hidden');
    } else {
        distContainer.classList.add('hidden');
    }
}

/**
 * Triggers geolocation detection using the browser's GPS API.
 * Falls back to manual location entry if GPS is unavailable or location is already set.
 * @param {Function} [onSuccess] - Optional callback function to execute after successful location detection
 */
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

/**
 * Shows the manual location entry UI and focuses the city input field.
 * Used as fallback when GPS is unavailable or denied.
 */
export function fallbackManual() {
    document.getElementById('manualLocationContainer').classList.remove('hidden');
    document.getElementById('cityInput').focus();
}

/**
 * Searches for a city using OpenStreetMap Nominatim API and sets user location.
 * Queries cities within Belgium (countrycodes=be) and takes the first result.
 * @param {Function} [onSuccess] - Optional callback function to execute after successful location detection
 * @returns {Promise<void>}
 * @example
 * await manualCitySearch(() => performSearch());
 */
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
