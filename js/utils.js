// Utility Functions

export function initIcons() { 
    if (typeof lucide !== 'undefined') {
        lucide.createIcons(); 
    }
}

export function showToast(msg, isError = false) {
    const t = document.getElementById('toast');
    if (!t) return;
    
    document.getElementById('toastMsg').textContent = msg;
    t.className = isError 
        ? "fixed bottom-6 right-6 bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl transform transition-transform duration-300 z-50 flex items-center gap-4 max-w-sm" 
        : "fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl transform transition-transform duration-300 z-50 flex items-center gap-4 max-w-sm";
    t.style.transform = "translateY(0)";
    setTimeout(() => t.style.transform = "translateY(150%)", 4000);
}

export function deg2rad(deg) { 
    return deg * (Math.PI / 180); 
}

export function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = deg2rad(lat2 - lat1); 
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
              Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return (R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(1);
}

export function copyToClipboard(text) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
}
