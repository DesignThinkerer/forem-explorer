/**
 * Geolocation Module
 * Handles user location detection via GPS and manual city search.
 * Manages UI visibility for distance-based filtering.
 */
import { showToast } from './utils.js';
import { setUserLocation, getUserLocation } from './state.js';
import { getProfile } from './cv-profile.js';

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
 * Geocodes the profile location from CV if available and no user location is set.
 * Uses OpenStreetMap Nominatim API to convert city name to coordinates.
 * @returns {Promise<boolean>} True if location was successfully geocoded
 */
export async function geocodeProfileLocation() {
    // Don't override existing location
    if (getUserLocation()) {
        return true;
    }
    
    const profile = getProfile();
    if (!profile || !profile.location) {
        return false;
    }
    
    // Extract city name from location (e.g., "Tournai, BE" -> "Tournai")
    const locationParts = profile.location.split(',');
    const cityName = locationParts[0].trim();
    
    if (!cityName || cityName.length < 2) {
        return false;
    }
    
    try {
        console.log(`[Geolocation] Geocoding profile location: "${cityName}"`);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&countrycodes=be&limit=1`);
        const data = await response.json();
        
        if (data.length > 0) {
            const coords = { 
                lat: parseFloat(data[0].lat), 
                lon: parseFloat(data[0].lon), 
                name: data[0].display_name.split(',')[0] || cityName,
                source: 'cv-profile'
            };
            setUserLocation(coords);
            
            // Update UI
            const gpsInfo = document.getElementById('gpsInfo');
            const gpsCoords = document.getElementById('gpsCoords');
            if (gpsInfo && gpsCoords) {
                gpsInfo.classList.remove('hidden');
                gpsCoords.textContent = `📍 ${coords.name} (CV)`;
            }
            updateDistanceUI();
            
            console.log(`[Geolocation] Profile location geocoded: ${coords.name} (${coords.lat}, ${coords.lon})`);
            return true;
        }
    } catch (error) {
        console.warn('[Geolocation] Failed to geocode profile location:', error);
    }
    
    return false;
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
