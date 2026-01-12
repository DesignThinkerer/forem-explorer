/**
 * Query Builder Module
 * Constructs search queries for the FOREM job search API and syncs UI state with URL parameters.
 */
import { getUserLocation } from './state.js';

/** Map of logical filter names to their DOM element IDs */
const FILTER_IDS = {
    keywords: 'keywords',
    category: 'categoryFilter',
    limit: 'limitFilter',
    sort: 'sortFilter',
    distance: 'distanceFilter',
    regime: 'regimeFilter',
    education: 'educationFilter',
    date: 'dateFilter'
};

/** Map of checkbox input names to their corresponding API field names */
const CHECKBOX_GROUPS = {
    loc: 'lieuxtravailregion',
    contract: 'typecontrat',
    lang: 'langues'
};

/** Fields to search within for keyword queries */
const SEARCH_FIELDS = ['titreoffre', 'metier'];

/**
 * Gets the trimmed value of an element by ID.
 * @param {string} id - The element ID
 * @returns {string} The trimmed value or empty string if element not found
 */
const getElementValue = (id) => document.getElementById(id)?.value.trim() || '';

/**
 * Escapes double quotes in a string for API query syntax.
 * @param {string} str - The string to escape
 * @returns {string} String with escaped quotes
 */
const escapeQuotes = (str) => str.replace(/"/g, '\\"');

/**
 * Unescapes double quotes in a string from API query syntax.
 * @param {string} str - The string to unescape
 * @returns {string} String with unescaped quotes
 */
const unescapeQuotes = (str) => str.replace(/\\"/g, '"');

/**
 * Gets all checked values from a group of checkboxes.
 * @param {string} name - The name attribute of the checkbox group
 * @returns {string[]} Array of checked values
 */
const getCheckedValues = (name) => 
    Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);

/**
 * Creates a geographic point string for API queries.
 * @param {Object} location - Location object with lon and lat properties
 * @param {number} location.lon - Longitude
 * @param {number} location.lat - Latitude
 * @returns {string} Formatted geo point string
 */
const createGeoPoint = (location) => `geom'POINT(${location.lon} ${location.lat})'`;

/**
 * Parses keyword string into positive and negative search terms.
 * Handles quoted phrases and negation with '-' prefix.
 * @param {string} keywords - The raw keyword string from user input
 * @returns {{positive: string[], negative: string[]}} Object containing arrays of positive and negative terms
 * @example
 * parseKeywordTerms('developer -manager "full time"')
 * // Returns: { positive: ['developer', 'full time'], negative: ['manager'] }
 */
function parseKeywordTerms(keywords) {
    const regex = /-?"[^"]+"|[^\s]+/g;
    const terms = keywords.match(regex) || [];
    const positive = [], negative = [];
    
    terms.forEach(term => {
        const isNegative = term.startsWith('-');
        term = isNegative ? term.substring(1) : term;
        
        if (term.startsWith('"') && term.endsWith('"')) {
            term = term.slice(1, -1);
        }
        
        term = unescapeQuotes(term).trim();
        if (term) {
            (isNegative ? negative : positive).push(term);
        }
    });
    
    return { positive, negative };
}

/**
 * Builds a search condition for a single term across multiple fields.
 * @param {string} term - The search term
 * @param {string[]} fields - The fields to search in (defaults to SEARCH_FIELDS)
 * @returns {string} API query condition string
 * @example
 * buildSearchCondition('developer')
 * // Returns: '(search(titreoffre, "developer") OR search(metier, "developer"))'
 */
function buildSearchCondition(term, fields = SEARCH_FIELDS) {
    const quotedTerm = `"${escapeQuotes(term)}"`;
    return `(${fields.map(field => `search(${field}, ${quotedTerm})`).join(' OR ')})`;
}

/**
 * Builds an array of search conditions from keyword input.
 * Handles both positive terms (must match) and negative terms (must not match).
 * @param {string} keywords - The raw keyword string
 * @returns {string[]} Array of API query condition strings
 */
function buildKeywordConditions(keywords) {
    const { positive, negative } = parseKeywordTerms(keywords);
    const conditions = [];
    
    if (positive.length) {
        const posConditions = positive.map(term => buildSearchCondition(term)).join(' OR ');
        conditions.push(`(${posConditions})`);
    }
    
    negative.forEach(term => {
        conditions.push(`NOT ${buildSearchCondition(term)}`);
    });
    
    return conditions;
}

/**
 * Builds a condition for multiple values in a single field (OR logic).
 * @param {string[]} values - Array of values to match
 * @param {string} field - The API field name
 * @returns {string|null} API query condition string or null if no values
 */
function buildMultiValueCondition(values, field) {
    if (!values.length) return null;
    
    const conditions = values.map(v => `${field}:"${escapeQuotes(v)}"`).join(' OR ');
    return `(${conditions})`;
}

/**
 * Builds a date filter condition for jobs published within the last N days.
 * @param {string|number} daysAgo - Number of days to look back
 * @returns {string|null} API query condition string or null if no value
 */
function buildDateCondition(daysAgo) {
    if (!daysAgo) return null;
    
    const date = new Date();
    date.setDate(date.getDate() - parseInt(daysAgo));
    return `datedebutdiffusion >= date'${date.toISOString().split('T')[0]}'`;
}

/**
 * Builds a geographic distance filter condition.
 * @param {string|number} distance - Maximum distance in kilometers
 * @param {Object} location - User location with lon/lat properties
 * @returns {string|null} API query condition string or null if missing parameters
 */
function buildDistanceCondition(distance, location) {
    if (!distance || !location) return null;
    return `distance(lieuxtravailgeo, ${createGeoPoint(location)}, ${distance}km)`;
}

/**
 * Builds a complete query parameter object from the current UI filter state.
 * Reads all filter values from the DOM and constructs an API-compatible URLSearchParams object.
 * @returns {URLSearchParams} Query parameters ready for API request
 */
export function buildQuery() {
    const filters = {
        keywords: getElementValue(FILTER_IDS.keywords),
        category: getElementValue(FILTER_IDS.category),
        limit: getElementValue(FILTER_IDS.limit),
        sort: getElementValue(FILTER_IDS.sort),
        distance: getElementValue(FILTER_IDS.distance),
        regime: getElementValue(FILTER_IDS.regime),
        education: getElementValue(FILTER_IDS.education),
        date: getElementValue(FILTER_IDS.date)
    };

    const checkboxValues = {
        locations: getCheckedValues('loc'),
        contracts: getCheckedValues('contract'),
        languages: getCheckedValues('lang')
    };

    const userLocation = getUserLocation();
    const conditions = [];

    // Category condition
    if (filters.category) {
        conditions.push(`startswith(metiercodedimeco, "${filters.category}")`);
    }

    // Keyword conditions
    if (filters.keywords) {
        conditions.push(...buildKeywordConditions(filters.keywords));
    }

    // Date condition
    const dateCondition = buildDateCondition(filters.date);
    if (dateCondition) conditions.push(dateCondition);

    // Simple field conditions
    if (filters.regime) conditions.push(`regimetravail:"${escapeQuotes(filters.regime)}"`);
    if (filters.education) conditions.push(`niveauxetudes:"${escapeQuotes(filters.education)}"`);
    
    // Multi-value checkbox conditions
    Object.entries(CHECKBOX_GROUPS).forEach(([checkboxName, fieldName]) => {
        const values = checkboxName === 'loc' ? checkboxValues.locations :
                       checkboxName === 'contract' ? checkboxValues.contracts :
                       checkboxValues.languages;
        const condition = buildMultiValueCondition(values, fieldName);
        if (condition) conditions.push(condition);
    });

    // Distance condition
    const distanceCondition = buildDistanceCondition(filters.distance, userLocation);
    if (distanceCondition) conditions.push(distanceCondition);

    // Build final query
    const where = conditions.length ? conditions.map(c => `(${c})`).join(' AND ') : '';
    const params = new URLSearchParams({ 
        limit: filters.limit, 
        timezone: 'Europe/Brussels' 
    });
    
    // Set order_by
    if (filters.sort === 'geo_distance' && userLocation) {
        params.append('order_by', `distance(lieuxtravailgeo, ${createGeoPoint(userLocation)})`);
    } else {
        params.append('order_by', filters.sort === 'geo_distance' ? 'datedebutdiffusion desc' : filters.sort);
    }

    if (where) params.append('where', where);
    return params;
}

/**
 * Configuration for extracting simple filter values from API query strings.
 * Maps filter IDs to their corresponding regex patterns.
 */
const SIMPLE_FILTERS = [
    { id: FILTER_IDS.category, pattern: /startswith\(metiercodedimeco, "([^"]+)"\)/ },
    { id: FILTER_IDS.regime, pattern: /regimetravail:"([^"]+)"/ },
    { id: FILTER_IDS.education, pattern: /niveauxetudes:"([^"]+)"/ },
    { id: FILTER_IDS.distance, pattern: /distance\(lieuxtravailgeo, geom'POINT\([^)]+\)', ([0-9]+)km\)/ }
];

/**
 * Maps the calculated day differences to standard date filter values.
 * Used when syncing date filter from URL back to UI.
 */
const DATE_RANGES = [
    { maxDays: 8, value: "7" },
    { maxDays: 15, value: "14" },
    { maxDays: 32, value: "30" }
];

/**
 * Sets the value of a DOM element by ID.
 * @param {string} id - The element ID
 * @param {string} value - The value to set (or empty string if falsy)
 */
function setElementValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value || "";
}

/**
 * Extracts and sets simple filter values from a where clause.
 * @param {string} whereClause - The API where clause string
 */
function extractSimpleFilters(whereClause) {
    SIMPLE_FILTERS.forEach(({ id, pattern }) => {
        const match = whereClause.match(pattern);
        setElementValue(id, match ? unescapeQuotes(match[1]) : "");
    });
}

/**
 * Extracts and sets the date filter value from a where clause.
 * Converts the date condition back to the closest matching preset (7, 14, or 30 days).
 * @param {string} whereClause - The API where clause string
 */
function extractDateFilter(whereClause) {
    const match = whereClause.match(/datedebutdiffusion >= date'([^']+)'/);
    if (!match) {
        setElementValue(FILTER_IDS.date, "");
        return;
    }
    
    const queryDate = new Date(match[1]);
    const diffDays = Math.ceil(Math.abs(new Date() - queryDate) / (1000 * 60 * 60 * 24));
    
    const range = DATE_RANGES.find(r => diffDays <= r.maxDays);
    setElementValue(FILTER_IDS.date, range ? range.value : "");
}

/**
 * Extracts and sets checkbox filter states from a where clause.
 * Handles location, contract type, and language checkboxes.
 * @param {string} whereClause - The API where clause string
 */
function extractCheckboxFilters(whereClause) {
    Object.entries(CHECKBOX_GROUPS).forEach(([inputName, fieldName]) => {
        // Uncheck all first
        document.querySelectorAll(`input[name="${inputName}"]`).forEach(cb => cb.checked = false);
        
        // Find and check matching values
        const pattern = new RegExp(`${fieldName}:"([^"]+)"`, 'g');
        for (const match of whereClause.matchAll(pattern)) {
            const value = unescapeQuotes(match[1]);
            const checkbox = document.querySelector(`input[name="${inputName}"][value="${CSS.escape(value)}"]`);
            if (checkbox) checkbox.checked = true;
        }
    });
}

/**
 * Extracts and sets keyword filter values from a where clause.
 * Reconstructs both positive and negative search terms with proper quoting.
 * @param {string} whereClause - The API where clause string
 */
function extractKeywords(whereClause) {
    const keywords = [];
    
    // Extract negative keywords
    const negativeMatches = whereClause.matchAll(/NOT \(search\(titreoffre, "([^"]+)"\)/g);
    for (const match of negativeMatches) {
        let term = unescapeQuotes(match[1]);
        if (term.includes(' ')) term = `"${term}"`;
        keywords.push(`-${term}`);
    }
    
    // Extract positive keywords
    const positiveMatches = whereClause.matchAll(/search\(titreoffre, "([^"]+)"\)/g);
    for (const match of positiveMatches) {
        const term = unescapeQuotes(match[1]);
        // Skip if it's actually a negative keyword
        if (!whereClause.includes(`NOT (search(titreoffre, "${escapeQuotes(term)}"`)) {
            keywords.push(term.includes(' ') ? `"${term}"` : term);
        }
    }
    
    if (keywords.length) {
        setElementValue(FILTER_IDS.keywords, [...new Set(keywords)].join(' '));
    }
}

/**
 * Parses a URL query string and syncs all UI filter elements to match.
 * This enables deep linking and browser back/forward navigation.
 * @param {string} urlString - The URL or query string to parse
 * @example
 * parseAndSyncUI('?limit=10&where=regimetravail:"full-time"')
 */
export function parseAndSyncUI(urlString) {
    try {
        const dummyBase = "http://d";
        const fullUrl = urlString.startsWith("http") ? urlString : dummyBase + "/" + urlString.replace(/^\/?/, '');
        const url = new URL(fullUrl);
        const params = url.searchParams;

        // Set limit filter
        if (params.has('limit')) {
            setElementValue(FILTER_IDS.limit, params.get('limit'));
        }
        
        const whereClause = params.get('where') || "";
        
        // Extract all filter types
        extractSimpleFilters(whereClause);
        extractDateFilter(whereClause);
        extractCheckboxFilters(whereClause);
        extractKeywords(whereClause);

    } catch (e) {
        console.warn("Sync UI Error", e);
    }
}
