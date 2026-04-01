import { API_BASE_URL as rawBaseUrl } from '../config/api';

// Use relative path in development to go through Vite proxy
const API_BASE_URL = import.meta.env.DEV ? '/api' : rawBaseUrl;

// The base URL for serving uploaded files.
// If your backend serves files at /api/uploads/ set:  VITE_FILE_BASE_URL=http://13.203.18.82:8090/api/uploads
// If it serves at /uploads/ set:                      VITE_FILE_BASE_URL=http://13.203.18.82:8090/uploads
// Defaults to the same host as the API + /files/
const FILE_HOST = (() => {
    // Strip /api suffix to get bare host
    const env = import.meta.env.VITE_FILE_BASE_URL;
    if (env) return env.replace(/\/$/, '');
    // Fallback: derive from API_BASE_URL
    const base = (import.meta.env.VITE_API_BASE_URL || API_BASE_URL || '').replace(/\/api$/, '');
    return `${base}/api/files`;
})();

/**
 * Extract the raw relative filename/path from any form of input:
 * - plain filename: "img1.png"
 * - Windows path: "D:/uploads/img1.png"
 * - any URL with /api/: "http://host/api/files/img1.png"
 */
const extractFilename = (pathOrObj) => {
    if (!pathOrObj) return null;
    let raw = typeof pathOrObj === 'string'
        ? pathOrObj
        : (pathOrObj.filePath || pathOrObj.path || pathOrObj.url || '');
    if (!raw || typeof raw !== 'string') return null;

    raw = raw.trim();
    if (raw === 'NOT_UPLOADED' || raw === 'null' || raw === 'undefined') return null;
    if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw; // passthrough

    // Normalize separators and strip Windows drive letter
    raw = raw.replace(/\\/g, '/').replace(/^[A-Za-z]:\//, '');

    // Strip full URL prefix (everything up to /api/ or /uploads/)
    raw = raw.replace(/^https?:\/\/[^/]+/, '');

    // Remove common path prefixes
    const prefixes = ['api/onboarding/files/', 'api/files/', 'api/uploads/', 'uploads/', 'api/'];
    raw = raw.replace(/^\/+/, '');
    for (const prefix of prefixes) {
        if (raw.startsWith(prefix)) { raw = raw.slice(prefix.length); break; }
    }

    return raw.replace(/^\/+/, '') || null;
};

/**
 * Universal Image Builder Function.
 * Builds a URL using the configured FILE_HOST endpoint.
 */
export const buildFileUrl = (pathOrObj) => {
    const filename = extractFilename(pathOrObj);
    if (!filename) return '/no-image.png';
    if (filename.startsWith('data:') || filename.startsWith('blob:')) return filename;

    const encoded = filename.split('/').map(seg => encodeURIComponent(seg)).join('/');
    return `${FILE_HOST}/${encoded}`;
};

/**
 * Builds an ABSOLUTE URL for opening files in a new tab.
 * Relative URLs break in new tabs because the SPA router intercepts them.
 * This always returns the full backend URL (e.g. http://13.203.18.82:8090/api/files/filename.jpg)
 */
export const buildAbsoluteFileUrl = (pathOrObj) => {
    const filename = extractFilename(pathOrObj);
    if (!filename) return null;
    if (filename.startsWith('data:') || filename.startsWith('blob:') || filename.startsWith('http')) return filename;

    const encoded = filename.split('/').map(seg => encodeURIComponent(seg)).join('/');

    // If FILE_HOST is already absolute, use it directly
    if (FILE_HOST.startsWith('http')) {
        return `${FILE_HOST}/${encoded}`;
    }

    // Otherwise, derive absolute URL from current page origin
    // The proxy will forward /api/files/... to the backend
    return `${window.location.origin}${FILE_HOST}/${encoded}`;
};

/**
 * Returns a list of all alternative URLs to try for a given filename.
 * Use this in onError handlers to cycle through fallback endpoints.
 */
export const getAltFileUrl = (currentUrl, apiBaseUrl) => {
    const base = (apiBaseUrl || API_BASE_URL || '').replace(/\/api$/, '');
    const filename = extractFilename(currentUrl) || currentUrl.split('/').pop();
    const encoded = encodeURIComponent(filename);

    return [
        `${base}/api/files/${encoded}`,
        `${base}/api/onboarding/files/${encoded}`,
        `${base}/api/uploads/${encoded}`,
        `${base}/uploads/${encoded}`,
    ].filter(url => url !== currentUrl);
};
