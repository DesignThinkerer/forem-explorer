/**
 * Utility Functions Module
 * Collection of reusable helper functions for UI operations, calculations, and clipboard management.
 */

/**
 * Initializes Lucide icons throughout the application.
 * Scans the DOM for icon elements and renders them.
 * Safe to call multiple times and checks for Lucide availability.
 */
export function initIcons() { 
    if (typeof lucide !== 'undefined') {
        lucide.createIcons(); 
    }
}

/**
 * Displays a temporary toast notification at the bottom-right of the screen.
 * Toast automatically slides away after 4 seconds.
 * @param {string} msg - The message to display in the toast
 * @param {string|boolean} [type='success'] - Type of toast: 'success', 'warning', 'error', or boolean (true=error)
 */
export function showToast(msg, type = 'success') {
    // Créer le toast s'il n'existe pas
    let t = document.getElementById('toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        t.innerHTML = '<span id="toastMsg"></span>';
        t.style.transform = 'translateY(150%)';
        document.body.appendChild(t);
    }
    
    // Support de l'ancien format booléen
    if (typeof type === 'boolean') {
        type = type ? 'error' : 'success';
    }
    
    const colors = {
        success: 'bg-emerald-600',
        warning: 'bg-amber-500',
        error: 'bg-red-600'
    };
    
    const color = colors[type] || colors.success;
    
    document.getElementById('toastMsg').textContent = msg;
    t.className = `fixed bottom-6 right-6 ${color} text-white px-6 py-4 rounded-xl shadow-2xl transform transition-transform duration-300 z-50 flex items-center gap-4 max-w-sm`;
    t.style.transform = "translateY(0)";
    setTimeout(() => t.style.transform = "translateY(150%)", 4000);
}

/**
 * Converts degrees to radians.
 * @param {number} deg - Angle in degrees
 * @returns {number} Angle in radians
 */
export function deg2rad(deg) { 
    return deg * (Math.PI / 180); 
}

/**
 * Calculates the distance between two geographic coordinates using the Haversine formula.
 * Returns the great-circle distance between two points on Earth.
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {string} Distance in kilometers, rounded to 1 decimal place
 */
export function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = deg2rad(lat2 - lat1); 
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
              Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return (R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(1);
}

/**
 * Copies text to the system clipboard.
 * Creates a temporary textarea element to leverage the legacy execCommand API.
 * @param {string} text - The text to copy to clipboard
 */
export function copyToClipboard(text) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
}
