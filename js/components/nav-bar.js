/**
 * Custom Web Component for the navigation bar
 * Usage: <nav-bar current="index"></nav-bar>
 * 
 * Attributes:
 * - current: The current page identifier (index, profile, letters, dashboard, aide, settings)
 */
class NavBar extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['current'];
    }

    connectedCallback() {
        this.render();
        this.initIcons();
    }

    attributeChangedCallback() {
        this.render();
        this.initIcons();
    }

    initIcons() {
        // Attendre que Lucide soit disponible
        if (typeof lucide !== 'undefined') {
            setTimeout(() => {
                lucide.createIcons({
                    icons: {
                        'database': lucide.icons.database,
                        'search': lucide.icons.search,
                        'user-circle': lucide.icons['user-circle'],
                        'file-pen': lucide.icons['file-pen'],
                        'bar-chart-3': lucide.icons['bar-chart-3'],
                        'help-circle': lucide.icons['help-circle'],
                        'sparkles': lucide.icons.sparkles,
                        'download': lucide.icons.download,
                        'upload': lucide.icons.upload
                    },
                    nameAttr: 'data-lucide'
                }, this.shadowRoot);
            }, 0);
        }
    }

    get current() {
        return this.getAttribute('current') || '';
    }

    getNavItems() {
        return [
            { id: 'index', href: 'index.html', icon: 'search', label: 'Rechercher', color: 'blue' },
            { id: 'profile', href: 'profile.html', icon: 'user-circle', label: 'Profil', color: 'emerald' },
            { id: 'letters', href: 'letters.html', icon: 'file-pen', label: 'Lettres', color: 'violet' },
            { id: 'dashboard', href: 'dashboard.html', icon: 'bar-chart-3', label: 'Dashboard', color: 'purple' },
            { id: 'settings', href: 'settings.html', icon: 'sparkles', label: 'IA', color: 'indigo' },
            { id: 'aide', href: 'aide.html', icon: 'help-circle', label: 'Aide', color: 'amber' }
        ];
    }

    getButtonClass(item) {
        const isCurrent = item.id === this.current;
        const colorMap = {
            blue: { bg: 'bg-blue-600', hover: 'hover:bg-blue-700' },
            emerald: { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700' },
            violet: { bg: 'bg-violet-600', hover: 'hover:bg-violet-700' },
            purple: { bg: 'bg-purple-600', hover: 'hover:bg-purple-700' },
            amber: { bg: 'bg-amber-500', hover: 'hover:bg-amber-600' },
            indigo: { bg: 'bg-indigo-600', hover: 'hover:bg-indigo-700' }
        };
        
        const colors = colorMap[item.color];
        
        if (isCurrent) {
            // Page courante: style avec ring pour indiquer la sélection
            return `flex items-center gap-2 px-3 py-2 text-sm font-medium text-white ${colors.bg} rounded-lg shadow-sm ring-2 ring-offset-2 ring-${item.color}-400`;
        }
        
        return `flex items-center gap-2 px-3 py-2 text-sm font-medium text-white ${colors.bg} ${colors.hover} rounded-lg shadow-sm transition-all`;
    }

    render() {
        const navItems = this.getNavItems();
        
        this.shadowRoot.innerHTML = `
            <style>
                @import url('https://cdn.tailwindcss.com');
            </style>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <style>
                :host {
                    display: block;
                }
                .nav-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    border-radius: 0.5rem;
                    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                    transition: all 150ms;
                    text-decoration: none;
                }
                .nav-btn svg {
                    width: 1rem;
                    height: 1rem;
                }
                .nav-btn-blue { background: #2563eb; color: white; }
                .nav-btn-blue:hover { background: #1d4ed8; }
                .nav-btn-emerald { background: #059669; color: white; }
                .nav-btn-emerald:hover { background: #047857; }
                .nav-btn-violet { background: #7c3aed; color: white; }
                .nav-btn-violet:hover { background: #6d28d9; }
                .nav-btn-purple { background: #9333ea; color: white; }
                .nav-btn-purple:hover { background: #7e22ce; }
                .nav-btn-amber { background: #f59e0b; color: white; }
                .nav-btn-amber:hover { background: #d97706; }
                .nav-btn-indigo { background: #4f46e5; color: white; }
                .nav-btn-indigo:hover { background: #4338ca; }
                .nav-btn-white { background: white; color: #334155; border: 1px solid #cbd5e1; }
                .nav-btn-white:hover { background: #f8fafc; }
                .nav-btn.current { 
                    box-shadow: 0 0 0 2px white, 0 0 0 4px currentColor;
                }
                .nav-btn-blue.current { box-shadow: 0 0 0 2px white, 0 0 0 4px #3b82f6; }
                .nav-btn-emerald.current { box-shadow: 0 0 0 2px white, 0 0 0 4px #10b981; }
                .nav-btn-violet.current { box-shadow: 0 0 0 2px white, 0 0 0 4px #8b5cf6; }
                .nav-btn-purple.current { box-shadow: 0 0 0 2px white, 0 0 0 4px #a855f7; }
                .nav-btn-amber.current { box-shadow: 0 0 0 2px white, 0 0 0 4px #fbbf24; }
                .nav-btn-indigo.current { box-shadow: 0 0 0 2px white, 0 0 0 4px #6366f1; }
                
                /* Dropdown styles */
                .dropdown {
                    position: relative;
                }
                .dropdown-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    border-radius: 0.5rem;
                    background: white;
                    color: #334155;
                    border: 1px solid #cbd5e1;
                    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                    cursor: pointer;
                    transition: all 150ms;
                }
                .dropdown-btn:hover {
                    background: #f8fafc;
                }
                .dropdown-btn svg {
                    width: 1rem;
                    height: 1rem;
                }
                .dropdown-menu {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    margin-top: 0.25rem;
                    min-width: 160px;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 0.5rem;
                    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
                    opacity: 0;
                    visibility: hidden;
                    transform: translateY(-0.5rem);
                    transition: all 150ms;
                    z-index: 50;
                }
                .dropdown:hover .dropdown-menu,
                .dropdown-menu:hover {
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(0);
                }
                .dropdown-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    width: 100%;
                    padding: 0.625rem 1rem;
                    font-size: 0.875rem;
                    color: #334155;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    transition: background 150ms;
                    text-align: left;
                }
                .dropdown-item:first-child {
                    border-radius: 0.5rem 0.5rem 0 0;
                }
                .dropdown-item:last-child {
                    border-radius: 0 0 0.5rem 0.5rem;
                }
                .dropdown-item:hover {
                    background: #f1f5f9;
                }
                .dropdown-item svg {
                    width: 1rem;
                    height: 1rem;
                    color: #64748b;
                }
                
                header {
                    background: white;
                    border-bottom: 1px solid #e2e8f0;
                    position: sticky;
                    top: 0;
                    z-index: 20;
                    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                }
                .header-content {
                    max-width: 80rem;
                    margin: 0 auto;
                    padding: 1rem;
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: space-between;
                    align-items: center;
                    gap: 1rem;
                }
                .logo-link {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    text-decoration: none;
                    transition: opacity 150ms;
                }
                .logo-link:hover {
                    opacity: 0.8;
                }
                .logo-icon {
                    background: #2563eb;
                    padding: 0.5rem;
                    border-radius: 0.5rem;
                    color: white;
                }
                .logo-icon svg {
                    width: 1.5rem;
                    height: 1.5rem;
                }
                .logo-text h1 {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #1e293b;
                    line-height: 1.25;
                    margin: 0;
                }
                .logo-text p {
                    font-size: 0.75rem;
                    color: #64748b;
                    font-weight: 500;
                    margin: 0;
                }
                .nav-buttons {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                    align-items: center;
                }
                .nav-separator {
                    width: 1px;
                    height: 1.5rem;
                    background: #cbd5e1;
                    margin: 0 0.25rem;
                }
                @media (max-width: 768px) {
                    .header-content {
                        flex-direction: column;
                    }
                    .nav-buttons {
                        justify-content: center;
                    }
                    .nav-separator {
                        display: none;
                    }
                }
            </style>
            
            <header>
                <div class="header-content">
                    <a href="index.html" class="logo-link">
                        <div class="logo-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
                        </div>
                        <div class="logo-text">
                            <h1>Forem Explorer</h1>
                            <p>Open Data v2.1</p>
                        </div>
                    </a>
                    <div class="nav-buttons">
                        ${navItems.map(item => `
                            <a href="${item.href}" class="nav-btn nav-btn-${item.color}${item.id === this.current ? ' current' : ''}">
                                ${this.getIcon(item.icon)}
                                ${item.label}
                            </a>
                        `).join('')}
                        <span class="nav-separator"></span>
                        <div class="dropdown">
                            <button class="dropdown-btn">
                                ${this.getIcon('folder-sync')}
                                Données
                                ${this.getIcon('chevron-down')}
                            </button>
                            <div class="dropdown-menu">
                                <button class="dropdown-item" onclick="window.exportDebugJson()">
                                    ${this.getIcon('upload')}
                                    Exporter
                                </button>
                                <button class="dropdown-item" onclick="window.importBookmarksFromFile()">
                                    ${this.getIcon('download')}
                                    Importer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        `;
    }

    getIcon(name) {
        const icons = {
            'database': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>',
            'search': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
            'user-circle': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></svg>',
            'file-pen': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v10"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-4 1 1-4Z"/></svg>',
            'bar-chart-3': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
            'help-circle': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
            'sparkles': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>',
            'download': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
            'upload': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>',
            'folder-sync': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v1"/><path d="M12 10v4h4"/><path d="m12 14 1.5-1.5c.9-.9 2.2-1.5 3.5-1.5s2.6.6 3.5 1.5c.4.4.8 1 1 1.5"/><path d="M22 22v-4h-4"/><path d="m22 18-1.5 1.5c-.9.9-2.1 1.5-3.5 1.5s-2.6-.6-3.5-1.5c-.4-.4-.8-1-1-1.5"/></svg>',
            'chevron-down': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
        };
        return icons[name] || '';
    }
}

// Enregistrer le composant
customElements.define('nav-bar', NavBar);
