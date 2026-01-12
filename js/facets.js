// Facets Loading Module
import { FACETS_URL } from './config.js';

export async function loadFacets() {
    const facets = ['lieuxtravailregion', 'typecontrat', 'regimetravail', 'niveauxetudes', 'langues'];
    const config = {
        'lieuxtravailregion': { type: 'checkbox', id: 'locContainer' },
        'typecontrat': { type: 'checkbox', id: 'contractContainer' },
        'langues': { type: 'checkbox', id: 'langContainer' },
        'regimetravail': { type: 'select', id: 'regimeFilter' },
        'niveauxetudes': { type: 'select', id: 'educationFilter' }
    };

    try {
        const query = facets.map(f => `facet=${f}`).join('&');
        const response = await fetch(`${FACETS_URL}?${query}&timezone=Europe/Brussels`);
        if (!response.ok) throw new Error("Erreur listes");
        const data = await response.json();

        facets.forEach(facetName => {
            const cfg = config[facetName];
            const container = document.getElementById(cfg.id);
            if (!container) return;

            const facetData = data.facets.find(f => f.name === facetName);
            
            if (cfg.type === 'select') {
                container.innerHTML = `<option value="">Indifférent</option>`;
                if (facetData && facetData.facets) {
                    facetData.facets.forEach(item => {
                        const option = document.createElement('option');
                        option.value = item.name;
                        option.textContent = `${item.name} (${item.count})`;
                        container.appendChild(option);
                    });
                }
            } else if (cfg.type === 'checkbox') {
                container.innerHTML = "";
                if (facetData && facetData.facets) {
                    facetData.facets.forEach(item => {
                        const div = document.createElement('div');
                        div.className = "flex items-center gap-2 mb-1";
                        const inputName = facetName === 'lieuxtravailregion' ? 'loc' : 
                                         (facetName === 'typecontrat' ? 'contract' : 'lang');
                        div.innerHTML = `
                            <input type="checkbox" id="${inputName}_${item.name}" name="${inputName}" value="${item.name}" 
                                   class="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer">
                            <label for="${inputName}_${item.name}" class="text-slate-700 cursor-pointer text-xs select-none hover:text-blue-600">${item.name} <span class="text-slate-400">(${item.count})</span></label>
                        `;
                        container.appendChild(div);
                    });
                } else {
                    container.innerHTML = `<div class="text-slate-400 text-xs text-center">Aucune donnée</div>`;
                }
            }
        });
    } catch (e) {
        console.error("Facet Error:", e);
    }
}
