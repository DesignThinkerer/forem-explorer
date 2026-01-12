// Search Module
import { BASE_URL } from './config.js';
import { setRawData, setFullUrl, getRawData, getFullUrl } from './state.js';
import { showToast, copyToClipboard } from './utils.js';
import { buildQuery, parseAndSyncUI } from './query-builder.js';
import { renderResults } from './renderer.js';
import { updateUrlParams } from './url-state.js';

export async function handleSearch(e, isRestore) {
    if (e) e.preventDefault();
    
    const loader = document.getElementById('loadingSpinner');
    loader.classList.remove('hidden');
    document.getElementById('resultsCount').textContent = "...";
    document.getElementById('resultsGrid').innerHTML = "";
    document.getElementById('btnExport').classList.add('hidden');

    if (!isRestore) updateUrlParams();

    const params = buildQuery();
    const fullUrl = `${BASE_URL}?${params.toString()}`;
    setFullUrl(fullUrl);
    document.getElementById('queryInput').value = decodeURIComponent(params.toString().replace(/&/g, '\n&'));

    try {
        const res = await fetch(fullUrl);
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        setRawData(data);
        
        document.getElementById('resultsCount').textContent = `${data.total_count} résultats`;
        document.getElementById('statusBar').classList.remove('hidden');
        
        if (data.total_count > 0) {
            renderResults(data);
            document.getElementById('btnExport').classList.remove('hidden');
            if (!isRestore) showToast(`${data.total_count} offres`, false);
        } else {
            document.getElementById('resultsGrid').innerHTML = `<div class="text-center py-12 text-slate-400">Aucun résultat</div>`;
            if (!isRestore) showToast("Aucun résultat");
        }
    } catch (err) {
        document.getElementById('resultsGrid').innerHTML = `<div class="p-4 text-red-500 text-center">Erreur ${err.message}</div>`;
        showToast("Erreur", true);
    } finally {
        loader.classList.add('hidden');
    }
}

export async function handleCustomSearch() {
    const val = document.getElementById('queryInput').value.trim().replace(/\n/g, '');
    if (!val) return;
    let url = val.startsWith('http') ? val : `${BASE_URL}?${val}`;
    setFullUrl(url);
    parseAndSyncUI(url);
    
    const loader = document.getElementById('loadingSpinner');
    loader.classList.remove('hidden');
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        setRawData(data);
        document.getElementById('resultsCount').textContent = `${data.total_count} résultats`;
        renderResults(data);
        document.getElementById('btnExport').classList.remove('hidden');
    } catch (e) {
        showToast("Erreur syntaxe", true);
    } finally {
        loader.classList.add('hidden');
    }
}

export function copyUrl() {
    copyToClipboard(getFullUrl());
    showToast("Copié !");
}

export function exportDebugJson() {
    const rawData = getRawData();
    if (!rawData) return;
    const a = document.createElement('a');
    a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rawData));
    a.download = "export.json";
    a.click();
}
