/**
 * Geolocation Module
 * Handles user location detection with priority: CV > GPS > Manual.
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
 * Main location initialization function.
 * Priority order: 1) CV profile location, 2) GPS, 3) Manual input
 * @returns {Promise<void>}
 */
export async function initializeLocation() {
    // 1. Try CV profile location first (most stable - represents home)
    const cvSuccess = await geocodeProfileLocation();
    if (cvSuccess) {
        console.log('[Geolocation] Using CV profile location');
        return;
    }
    
    // 2. Try GPS as fallback
    console.log('[Geolocation] No CV location, trying GPS...');
    const gpsSuccess = await tryGPS();
    if (gpsSuccess) {
        console.log('[Geolocation] Using GPS location');
        return;
    }
    
    // 3. Show manual input as last resort
    console.log('[Geolocation] GPS failed, showing manual input');
    fallbackManual();
}

/**
 * Attempts to get GPS location (promise-based).
 * @returns {Promise<boolean>} True if GPS location was obtained
 */
function tryGPS() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(false);
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({ 
                    lat: position.coords.latitude, 
                    lon: position.coords.longitude, 
                    name: "GPS",
                    source: 'gps'
                });
                document.getElementById('gpsInfo')?.classList.remove('hidden');
                document.getElementById('gpsCoords').textContent = "📍 GPS";
                updateDistanceUI();
                resolve(true);
            },
            (error) => {
                console.warn('[Geolocation] GPS error:', error.message);
                resolve(false);
            },
            { timeout: 5000, maximumAge: 300000 } // 5s timeout, cache 5min
        );
    });
}

/**
 * Geocodes the profile location from CV if available.
 * Uses OpenStreetMap Nominatim API to convert city name to coordinates.
 * @returns {Promise<boolean>} True if location was successfully geocoded
 */
export async function geocodeProfileLocation() {
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
 * Used when user explicitly requests GPS (e.g., sorting by proximity).
 * @param {Function} [onSuccess] - Optional callback function to execute after successful location detection
 */
export function triggerGeo(onSuccess) {
    const userLocation = getUserLocation();
    if (userLocation) {
        updateDistanceUI();
        if (onSuccess) onSuccess();
        return;
    }
    if (!navigator.geolocation) { 
        fallbackManual(); 
        return; 
    }
    showToast("GPS...", false);
    navigator.geolocation.getCurrentPosition(
        p => {
            setUserLocation({ lat: p.coords.latitude, lon: p.coords.longitude, name: "GPS", source: 'gps' });
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
