/**
 * Dashboard Module
 * Displays statistics, charts, and insights about job search activity.
 */
import { initIcons } from './utils.js';
import { getAllJobStates } from './bookmarks.js';
import { getAllJobsWithNotes, getUpcomingDates } from './notes.js';

/**
 * Initializes the dashboard with current data.
 */
async function init() {
    initIcons();
    loadStatistics();
    loadCharts();
    loadUpcomingFollowUps();
    generateInsights();
}

/**
 * Loads and displays statistics cards.
 */
function loadStatistics() {
    const states = getAllJobStates();
    const notedJobs = getAllJobsWithNotes();
    
    let totalJobs = 0;
    let bookmarkedCount = 0;
    let appliedCount = 0;
    
    Object.values(states).forEach(state => {
        if (state.bookmarked || state.applied || state.ignored) {
            totalJobs++;
        }
        if (state.bookmarked) bookmarkedCount++;
        if (state.applied) appliedCount++;
    });
    
    document.getElementById('totalJobs').textContent = totalJobs;
    document.getElementById('bookmarkedJobs').textContent = bookmarkedCount;
    document.getElementById('appliedJobs').textContent = appliedCount;
    document.getElementById('notedJobs').textContent = notedJobs.length;
}

/**
 * Loads and displays charts.
 */
function loadCharts() {
    createActivityChart();
    createStatusChart();
}

/**
 * Creates the activity timeline chart.
 */
function createActivityChart() {
    const ctx = document.getElementById('activityChart');
    const states = getAllJobStates();
    const notedJobs = getAllJobsWithNotes();
    
    // Generate data for last 30 days
    const days = [];
    const bookmarkData = [];
    const appliedData = [];
    const noteData = [];
    
    // Pre-process: group activities by day
    const bookmarksByDay = {};
    const appliedByDay = {};
    const notesByDay = {};
    
    Object.values(states).forEach(state => {
        if (state.bookmarked && state.date) {
            const dayKey = new Date(state.date).toISOString().split('T')[0];
            bookmarksByDay[dayKey] = (bookmarksByDay[dayKey] || 0) + 1;
        }
        if (state.applied && state.appliedDate) {
            const dayKey = new Date(state.appliedDate).toISOString().split('T')[0];
            appliedByDay[dayKey] = (appliedByDay[dayKey] || 0) + 1;
        }
    });
    
    notedJobs.forEach(note => {
        if (note.createdAt) {
            const dayKey = new Date(note.createdAt).toISOString().split('T')[0];
            notesByDay[dayKey] = (notesByDay[dayKey] || 0) + 1;
        }
    });
    
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const dayKey = date.toISOString().split('T')[0];
        const dayLabel = date.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit' });
        days.push(dayLabel);
        
        // Count actions on this day
        bookmarkData.push(bookmarksByDay[dayKey] || 0);
        appliedData.push(appliedByDay[dayKey] || 0);
        noteData.push(notesByDay[dayKey] || 0);
    }
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [
                {
                    label: 'À consulter',
                    data: bookmarkData,
                    borderColor: 'rgb(245, 158, 11)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Postulées',
                    data: appliedData,
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Notes ajoutées',
                    data: noteData,
                    borderColor: 'rgb(168, 85, 247)',
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

/**
 * Creates the status distribution pie chart.
 */
function createStatusChart() {
    const ctx = document.getElementById('statusChart');
    const states = getAllJobStates();
    
    let bookmarkedCount = 0;
    let appliedCount = 0;
    let ignoredCount = 0;
    let bothCount = 0;
    
    Object.values(states).forEach(state => {
        if (state.bookmarked && state.applied) {
            bothCount++;
        } else if (state.bookmarked) {
            bookmarkedCount++;
        } else if (state.applied) {
            appliedCount++;
        } else if (state.ignored) {
            ignoredCount++;
        }
    });
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['À consulter', 'Postulées', 'Consultées + Postulées', 'Ignorées'],
            datasets: [{
                data: [bookmarkedCount, appliedCount, bothCount, ignoredCount],
                backgroundColor: [
                    'rgb(245, 158, 11)',
                    'rgb(34, 197, 94)',
                    'rgb(59, 130, 246)',
                    'rgb(239, 68, 68)'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

/**
 * Loads and displays upcoming follow-ups.
 */
function loadUpcomingFollowUps() {
    const upcoming = getUpcomingDates(7);
    const container = document.getElementById('upcomingList');
    
    if (upcoming.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-slate-400">
                <i data-lucide="calendar-x" class="h-12 w-12 mx-auto mb-2 opacity-30"></i>
                <p>Aucun suivi planifié</p>
            </div>
        `;
        initIcons();
        return;
    }
    
    container.innerHTML = upcoming.map(item => {
        const date = new Date(item.customDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
        
        let urgencyColor = 'bg-green-100 text-green-700 border-green-200';
        if (daysUntil <= 1) urgencyColor = 'bg-red-100 text-red-700 border-red-200';
        else if (daysUntil <= 3) urgencyColor = 'bg-orange-100 text-orange-700 border-orange-200';
        
        return `
            <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all">
                <div class="flex-shrink-0">
                    <div class="${urgencyColor} px-3 py-2 rounded-lg font-bold text-center">
                        <div class="text-xs uppercase">Dans</div>
                        <div class="text-2xl">${daysUntil}</div>
                        <div class="text-xs">jour${daysUntil > 1 ? 's' : ''}</div>
                    </div>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-semibold text-slate-800">${date.toLocaleDateString('fr-BE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    ${item.detailedStatus ? `<div class="text-sm text-slate-600 mt-1">${item.detailedStatus}</div>` : ''}
                    ${item.text ? `<div class="text-xs text-slate-500 mt-1 truncate">${item.text}</div>` : ''}
                </div>
                <a href="index.html" class="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all">
                    Voir
                </a>
            </div>
        `;
    }).join('');
    
    initIcons();
}

/**
 * Generates insights and recommendations based on user activity.
 */
function generateInsights() {
    const states = getAllJobStates();
    const notedJobs = getAllJobsWithNotes();
    const container = document.getElementById('insightsList');
    
    const insights = [];
    
    let bookmarkedCount = 0;
    let appliedCount = 0;
    let ignoredCount = 0;
    
    Object.values(states).forEach(state => {
        if (state.bookmarked) bookmarkedCount++;
        if (state.applied) appliedCount++;
        if (state.ignored) ignoredCount++;
    });
    
    // Insight 1: Bookmark to Apply ratio
    if (bookmarkedCount > 0 && appliedCount === 0) {
        insights.push({
            type: 'warning',
            icon: 'alert-triangle',
            color: 'orange',
            title: 'Aucune candidature envoyée',
            message: `Vous avez ${bookmarkedCount} offre${bookmarkedCount > 1 ? 's' : ''} à consulter mais aucune candidature envoyée. C'est le moment de passer à l'action!`
        });
    } else if (bookmarkedCount > appliedCount * 3) {
        insights.push({
            type: 'tip',
            icon: 'trending-up',
            color: 'blue',
            title: 'Taux de conversion bas',
            message: `Vous consultez beaucoup d'offres (${bookmarkedCount}) mais postulez peu (${appliedCount}). Pensez à affiner vos critères de recherche.`
        });
    }
    
    // Insight 2: Notes usage
    if (appliedCount > 0 && notedJobs.length === 0) {
        insights.push({
            type: 'tip',
            icon: 'file-edit',
            color: 'purple',
            title: 'Utilisez les notes',
            message: 'Ajoutez des notes à vos candidatures pour suivre vos échanges, impressions et prochaines étapes.'
        });
    }
    
    // Insight 3: Good activity
    if (appliedCount >= 5) {
        insights.push({
            type: 'success',
            icon: 'check-circle',
            color: 'green',
            title: 'Bonne activité!',
            message: `Vous avez déjà envoyé ${appliedCount} candidatures. Continuez sur cette lancée!`
        });
    }
    
    // Insight 4: High ignore rate
    if (ignoredCount > (bookmarkedCount + appliedCount) * 2) {
        insights.push({
            type: 'info',
            icon: 'info',
            color: 'slate',
            title: 'Beaucoup d\'offres ignorées',
            message: `Vous ignorez beaucoup d'offres (${ignoredCount}). Vos filtres de recherche sont peut-être trop larges.`
        });
    }
    
    // Default insight if no specific ones
    if (insights.length === 0) {
        insights.push({
            type: 'info',
            icon: 'compass',
            color: 'blue',
            title: 'Commencez votre recherche',
            message: 'Utilisez la page de recherche pour trouver des offres d\'emploi et suivez votre progression ici.'
        });
    }
    
    container.innerHTML = insights.map(insight => `
        <div class="flex items-start gap-3 p-4 bg-white rounded-lg border border-${insight.color}-200">
            <div class="flex-shrink-0 p-2 bg-${insight.color}-100 rounded-lg">
                <i data-lucide="${insight.icon}" class="h-5 w-5 text-${insight.color}-600"></i>
            </div>
            <div class="flex-1">
                <h3 class="font-semibold text-slate-800 mb-1">${insight.title}</h3>
                <p class="text-sm text-slate-600">${insight.message}</p>
            </div>
        </div>
    `).join('');
    
    initIcons();
}

// Initialize dashboard when DOM is ready
init();
