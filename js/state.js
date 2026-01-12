/**
 * Application State Module
 * Centralized state management for the application.
 * Stores search results, current URL, and user location data.
 */

/**
 * Global application state object
 * @type {Object}
 * @property {Object|null} currentRawData - Raw API response data from the last search
 * @property {string} currentFullUrl - Complete URL of the last executed search query
 * @property {Object|null} userLocation - User's geographic location
 * @property {number} userLocation.lat - Latitude
 * @property {number} userLocation.lon - Longitude
 * @property {string} userLocation.name - Location name (e.g., "GPS" or city name)
 */
export const state = {
    currentRawData: null,
    currentFullUrl: "",
    userLocation: null
};

/**
 * Sets the raw API response data in the application state.
 * @param {Object} data - The raw API response data
 */
export function setRawData(data) {
    state.currentRawData = data;
}

/**
 * Sets the current search query URL in the application state.
 * @param {string} url - The complete URL including query parameters
 */
export function setFullUrl(url) {
    state.currentFullUrl = url;
}

/**
 * Sets the user's geographic location in the application state.
 * @param {Object} location - The user's location object
 * @param {number} location.lat - Latitude
 * @param {number} location.lon - Longitude
 * @param {string} location.name - Location name (e.g., "GPS" or city name)
 */
export function setUserLocation(location) {
    state.userLocation = location;
}

/**
 * Gets the user's geographic location from the application state.
 * @returns {Object|null} The user's location object or null if not set
 */
export function getUserLocation() {
    return state.userLocation;
}

/**
 * Gets the raw API response data from the application state.
 * @returns {Object|null} The raw API response data or null if no search has been performed
 */
export function getRawData() {
    return state.currentRawData;
}

/**
 * Gets the current search query URL from the application state.
 * @returns {string} The complete URL including query parameters
 */
export function getFullUrl() {
    return state.currentFullUrl;
}
