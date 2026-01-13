/**
 * Alerts Module
 * Manages intelligent notifications and reminders for job search activities.
 */

import { getAllJobStates } from './bookmarks.js';
import { getUpcomingDates } from './notes.js';

const ALERTS_STORAGE_KEY = 'forem_alerts_dismissed';

/**
 * Gets dismissed alerts from localStorage.
 * @returns {Array<string>} Array of dismissed alert IDs
 */
function getDismissedAlerts() {
    try {
        const data = localStorage.getItem(ALERTS_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error reading dismissed alerts:', e);
        return [];
    }
}

/**
 * Marks an alert as dismissed.
 * @param {string} alertId - The alert ID
 */
export function dismissAlert(alertId) {
    const dismissed = getDismissedAlerts();
    if (!dismissed.includes(alertId)) {
        dismissed.push(alertId);
        localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(dismissed));
    }
}

/**
 * Checks if an alert was dismissed.
 * @param {string} alertId - The alert ID
 * @returns {boolean} True if dismissed
 */
function isAlertDismissed(alertId) {
    return getDismissedAlerts().includes(alertId);
}

/**
 * Gets all active alerts.
 * @returns {Array<Object>} Array of alert objects
 */
export function getActiveAlerts() {
    const alerts = [];
    
    // Check upcoming follow-ups
    const upcoming = getUpcomingDates(7);
    upcoming.forEach(item => {
        const date = new Date(item.customDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
        
        const alertId = `follow-up-${item.jobId}-${item.customDate}`;
        if (!isAlertDismissed(alertId)) {
            let urgency = 'low';
            let icon = 'calendar';
            let color = 'blue';
            let message = `Suivi prévu dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`;
            
            if (daysUntil <= 0) {
                urgency = 'critical';
                icon = 'alert-circle';
                color = 'red';
                message = daysUntil === 0 ? 'Suivi prévu aujourd\'hui!' : 'Suivi en retard!';
            } else if (daysUntil === 1) {
                urgency = 'high';
                icon = 'bell';
                color = 'orange';
                message = 'Suivi prévu demain';
            }
            
            alerts.push({
                id: alertId,
                type: 'follow-up',
                urgency,
                icon,
                color,
                title: message,
                message: item.detailedStatus || 'N\'oubliez pas votre suivi',
                actionLabel: 'Voir',
                actionUrl: 'index.html',
                date: item.customDate
            });
        }
    });
    
    // Check stale bookmarks (bookmarked > 14 days without follow-up)
    const states = getAllJobStates();
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    Object.entries(states).forEach(([jobId, state]) => {
        if (state.bookmarked && !state.applied) {
            const bookmarkDate = new Date(state.date);
            if (bookmarkDate < twoWeeksAgo) {
                const alertId = `stale-bookmark-${jobId}`;
                if (!isAlertDismissed(alertId)) {
                    const daysSince = Math.floor((new Date() - bookmarkDate) / (1000 * 60 * 60 * 24));
                    alerts.push({
                        id: alertId,
                        type: 'stale-bookmark',
                        urgency: 'medium',
                        icon: 'clock',
                        color: 'yellow',
                        title: 'Offre en attente',
                        message: `Marquée à consulter il y a ${daysSince} jours. Toujours intéressante?`,
                        actionLabel: 'Réviser',
                        actionUrl: 'index.html'
                    });
                }
            }
        }
    });
    
    // Check inactivity (no action in last 7 days)
    const allStates = Object.values(states);
    if (allStates.length > 0) {
        const latestAction = Math.max(...allStates.map(s => {
            const dates = [s.date, s.appliedDate, s.ignoredDate].filter(Boolean);
            return dates.length > 0 ? Math.max(...dates.map(d => new Date(d).getTime())) : 0;
        }));
        
        const daysSinceAction = Math.floor((new Date() - latestAction) / (1000 * 60 * 60 * 24));
        
        if (daysSinceAction >= 7) {
            const alertId = 'inactivity-reminder';
            if (!isAlertDismissed(alertId)) {
                alerts.push({
                    id: alertId,
                    type: 'inactivity',
                    urgency: 'low',
                    icon: 'activity',
                    color: 'blue',
                    title: 'Reprenez votre recherche',
                    message: `Aucune activité depuis ${daysSinceAction} jours. Explorez de nouvelles offres!`,
                    actionLabel: 'Rechercher',
                    actionUrl: 'index.html'
                });
            }
        }
    }
    
    // Sort by urgency
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
    
    return alerts;
}

/**
 * Shows a toast notification.
 * @param {string} message - The message to display
 * @param {string} type - The type (success, warning, error, info)
 * @param {number} duration - Duration in milliseconds (default 3000)
 */
export function showToast(message, type = 'info', duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const toastMsg = document.getElementById('toastMsg');
    const toastIcon = toast.querySelector('i');
    
    toastMsg.textContent = message;
    
    // Update colors based on type
    toast.className = 'fixed bottom-6 right-6 text-white px-6 py-4 rounded-xl shadow-2xl transform translate-y-24 transition-transform duration-300 z-[100] flex items-center gap-4 max-w-sm';
    
    let bgColor = 'bg-emerald-600';
    let iconName = 'check';
    
    switch (type) {
        case 'success':
            bgColor = 'bg-emerald-600';
            iconName = 'check';
            break;
        case 'warning':
            bgColor = 'bg-orange-600';
            iconName = 'alert-triangle';
            break;
        case 'error':
            bgColor = 'bg-red-600';
            iconName = 'x-circle';
            break;
        case 'info':
            bgColor = 'bg-blue-600';
            iconName = 'info';
            break;
    }
    
    toast.classList.add(bgColor);
    if (toastIcon) {
        toastIcon.setAttribute('data-lucide', iconName);
        lucide.createIcons();
    }
    
    // Show toast
    toast.style.transform = 'translateY(0)';
    
    // Hide after duration
    setTimeout(() => {
        toast.style.transform = 'translateY(200%)';
    }, duration);
}
