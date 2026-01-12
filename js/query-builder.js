// Query Builder Module
import { getUserLocation } from './state.js';

export function buildQuery() {
    const k = document.getElementById('keywords').value.trim();
    const cat = document.getElementById('categoryFilter').value;
    const limit = document.getElementById('limitFilter').value;
    const sort = document.getElementById('sortFilter').value;
    const dist = document.getElementById('distanceFilter').value;
    const regime = document.getElementById('regimeFilter').value;
    const edu = document.getElementById('educationFilter').value;
    const dateVal = document.getElementById('dateFilter').value;

    const getChecked = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);
    const locs = getChecked('loc');
    const contracts = getChecked('contract');
    const langs = getChecked('lang');

    const userLocation = getUserLocation();
    let conditions = [];

    if (cat) conditions.push(`startswith(metiercodedimeco, "${cat}")`);

    if (k) {
        const regex = /-?"[^"]+"|[^\s]+/g;
        const terms = k.match(regex) || [];
        const pos = [], neg = [];
        
        terms.forEach(t => {
            let term = t;
            let isNeg = false;
            if (term.startsWith('-')) { isNeg = true; term = term.substring(1); }
            if (term.startsWith('"') && term.endsWith('"')) { term = term.slice(1, -1); }
            term = term.replace(/\\"/g, '"');
            if (term.trim()) isNeg ? neg.push(term) : pos.push(term);
        });
        
        const fmt = t => `"${t.replace(/"/g, '\\"')}"`;
        if (pos.length) conditions.push(`(${pos.map(t => { const qt = fmt(t); return `(search(titreoffre, ${qt}) OR search(metier, ${qt}))`; }).join(' OR ')})`);
        if (neg.length) neg.forEach(t => conditions.push(`NOT (search(titreoffre, ${fmt(t)}) OR search(metier, ${fmt(t)}))`));
    }

    if (dateVal) {
        const d = new Date(); d.setDate(d.getDate() - parseInt(dateVal));
        conditions.push(`datedebutdiffusion >= date'${d.toISOString().split('T')[0]}'`);
    }

    if (regime) conditions.push(`regimetravail:"${regime.replace(/"/g, '\\"')}"`);
    if (edu) conditions.push(`niveauxetudes:"${edu.replace(/"/g, '\\"')}"`);
    
    const addMultiCondition = (values, field) => {
        if (values.length > 0) {
            const conds = values.map(v => `${field}:"${v.replace(/"/g, '\\"')}"`);
            conditions.push(`(${conds.join(' OR ')})`);
        }
    };

    addMultiCondition(locs, 'lieuxtravailregion');
    addMultiCondition(contracts, 'typecontrat');
    addMultiCondition(langs, 'langues');

    if (dist && userLocation) {
        conditions.push(`distance(lieuxtravailgeo, geom'POINT(${userLocation.lon} ${userLocation.lat})', ${dist}km)`);
    }

    const where = conditions.length ? conditions.map(c => `(${c})`).join(' AND ') : '';
    const params = new URLSearchParams({ limit: limit, timezone: 'Europe/Brussels' });
    
    if (sort === 'geo_distance' && userLocation) {
        params.append('order_by', `distance(lieuxtravailgeo, geom'POINT(${userLocation.lon} ${userLocation.lat})')`);
    } else {
        params.append('order_by', sort === 'geo_distance' ? 'datedebutdiffusion desc' : sort);
    }

    if (where) params.append('where', where);
    return params;
}

export function parseAndSyncUI(urlString) {
    try {
        const dummyBase = "http://d";
        const u = new URL(urlString.startsWith("http") ? urlString : dummyBase + "/" + urlString.replace(/^\/?/, ''));
        const p = u.searchParams;

        if (p.has('limit')) document.getElementById('limitFilter').value = p.get('limit');
        
        const w = p.get('where') || "";
        
        const simpleMap = [
            { id: 'categoryFilter', re: /startswith\(metiercodedimeco, "([^"]+)"\)/ },
            { id: 'regimeFilter', re: /regimetravail:"([^"]+)"/ },
            { id: 'educationFilter', re: /niveauxetudes:"([^"]+)"/ },
            { id: 'distanceFilter', re: /distance\(lieuxtravailgeo, geom'POINT\([^)]+\)', ([0-9]+)km\)/ }
        ];

        simpleMap.forEach(m => {
            const match = w.match(m.re);
            const el = document.getElementById(m.id);
            if (match && el) el.value = match[1].replace(/\\"/g, '"');
            else if (el) el.value = "";
        });

        const dateMatch = w.match(/datedebutdiffusion >= date'([^']+)'/);
        const dateEl = document.getElementById('dateFilter');
        if (dateMatch && dateEl) {
            const queryDate = new Date(dateMatch[1]);
            const diffDays = Math.ceil(Math.abs(new Date() - queryDate) / (1000 * 60 * 60 * 24));
            if (diffDays <= 8) dateEl.value = "7";
            else if (diffDays <= 15) dateEl.value = "14";
            else if (diffDays <= 32) dateEl.value = "30";
            else dateEl.value = "";
        } else if (dateEl) dateEl.value = "";

        const checkboxMap = [
            { field: 'langues', inputName: 'lang' },
            { field: 'lieuxtravailregion', inputName: 'loc' },
            { field: 'typecontrat', inputName: 'contract' }
        ];

        checkboxMap.forEach(map => {
            document.querySelectorAll(`input[name="${map.inputName}"]`).forEach(cb => cb.checked = false);
            const re = new RegExp(`${map.field}:"([^"]+)"`, 'g');
            const matches = w.matchAll(re);
            for (const m of matches) {
                const val = m[1].replace(/\\"/g, '"');
                const cb = document.querySelector(`input[name="${map.inputName}"][value="${CSS.escape(val)}"]`);
                if (cb) cb.checked = true;
            }
        });

        let kw = [];
        const negs = w.match(/NOT \(search\(titreoffre, "([^"]+)"\)/g);
        if (negs) negs.forEach(n => {
            let term = n.match(/"([^"]+)"/)[1].replace(/\\"/g, '"');
            if (term.includes(' ')) term = `"${term}"`;
            kw.push("-" + term);
        });
        
        const poss = w.matchAll(/search\(titreoffre, "([^"]+)"\)/g);
        for (const m of poss) {
            let t = m[1].replace(/\\"/g, '"');
            if (!w.includes(`NOT (search(titreoffre, "${t.replace(/"/g, '\\"')}")`)) {
                if (t.includes(' ')) t = `"${t}"`;
                kw.push(t);
            }
        }
        
        if (kw.length) document.getElementById('keywords').value = [...new Set(kw)].join(' ');

    } catch (e) {
        console.warn("Sync UI Error", e);
    }
}
