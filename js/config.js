/**
 * API Configuration Module
 * Central configuration for FOREM OpenDataSoft API endpoints.
 */

/** 
 * Base API host URL for the FOREM OpenDataSoft platform
 * @type {string}
 */
export const API_HOST = "https://leforem-digitalwallonia.opendatasoft.com/api/explore/v2.1";

/** 
 * Dataset identifier for FOREM job offers
 * @type {string}
 */
export const DATASET_ID = "offres-d-emploi-forem";

/** 
 * Complete URL for fetching job records from the API
 * @type {string}
 */
export const BASE_URL = `${API_HOST}/catalog/datasets/${DATASET_ID}/records`;

/** 
 * Complete URL for fetching facet data (filter options) from the API
 * @type {string}
 */
export const FACETS_URL = `${API_HOST}/catalog/datasets/${DATASET_ID}/facets`;
