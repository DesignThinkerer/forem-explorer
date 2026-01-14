/**
 * Custom Web Component for the footer bar
 * Usage: <footer-bar></footer-bar>
 */
class FooterBar extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    render() {
        const currentYear = new Date().getFullYear();
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                footer {
                    background: white;
                    border-top: 1px solid #e2e8f0;
                    padding: 1rem;
                    margin-top: 2rem;
                }
                .footer-content {
                    max-width: 80rem;
                    margin: 0 auto;
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    align-items: center;
                    gap: 1rem;
                }
                .footer-text {
                    font-size: 0.875rem;
                    color: #64748b;
                }
                .github-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.375rem 0.75rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #334155;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    border-radius: 0.5rem;
                    text-decoration: none;
                    transition: all 150ms;
                }
                .github-link:hover {
                    background: #e2e8f0;
                    color: #1e293b;
                }
                .github-link svg {
                    width: 1rem;
                    height: 1rem;
                }
                .separator {
                    color: #cbd5e1;
                }
            </style>
            
            <footer>
                <div class="footer-content">
                    <span class="footer-text">Forem Explorer © ${currentYear}</span>
                    <span class="separator">•</span>
                    <a href="https://github.com/DesignThinkerer/forem-explorer/tree/main" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       class="github-link">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        GitHub
                    </a>
                </div>
            </footer>
        `;
    }
}

// Enregistrer le composant
customElements.define('footer-bar', FooterBar);
