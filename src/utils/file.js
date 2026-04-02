import { API_BASE_URL as rawBaseUrl } from '../config/api';

// Use relative path in development to go through Vite proxy
const API_BASE_URL = import.meta.env.DEV ? '/api' : rawBaseUrl;

// The base URL for serving uploaded files.
// If your backend serves files at /api/uploads/ set:  VITE_FILE_BASE_URL=http://13.203.18.82:8090/api/uploads
// If it serves at /uploads/ set:                      VITE_FILE_BASE_URL=http://13.203.18.82:8090/uploads
// Defaults to the same host as the API + /files/
const FILE_HOST = (() => {
    const env = import.meta.env.VITE_FILE_BASE_URL;
    if (env) return env.replace(/\/$/, '');
    // Default to /api/uploads — matches the Spring Boot static resource mapping
    // and the Vite proxy rule: /uploads/** → backend /api/uploads/**
    return '/api/uploads';
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

/**
 * Compresses an image File using the Canvas API.
 * - Images wider/taller than `maxDim` are scaled down proportionally.
 * - Quality is reduced until the blob is under `maxBytes`.
 * - Non-image files (e.g. PDFs) are returned unchanged.
 *
 * @param {File} file        - The source File object.
 * @param {number} maxDim    - Max width or height in pixels (default 1280).
 * @param {number} maxBytes  - Target max size in bytes (default 800 KB).
 * @returns {Promise<File>}  - Compressed File (or original if not an image).
 */
export const compressFile = (file, maxDim = 1280, maxBytes = 800 * 1024) => {
    return new Promise((resolve) => {
        if (!file || !file.type.startsWith('image/')) {
            // Not an image — pass through as-is (e.g. PDF documents)
            resolve(file);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;

                // Scale down if necessary
                if (width > maxDim || height > maxDim) {
                    const ratio = Math.min(maxDim / width, maxDim / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Try progressively lower quality until under maxBytes
                const tryQuality = (quality) => {
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) { resolve(file); return; }
                            if (blob.size <= maxBytes || quality <= 0.3) {
                                const compressed = new File([blob], file.name, {
                                    type: blob.type || 'image/jpeg',
                                    lastModified: Date.now()
                                });
                                console.log(`🗜️ Compressed "${file.name}": ${(file.size / 1024).toFixed(1)}KB → ${(blob.size / 1024).toFixed(1)}KB`);
                                resolve(compressed);
                            } else {
                                tryQuality(Math.round((quality - 0.1) * 10) / 10);
                            }
                        },
                        'image/jpeg',
                        quality
                    );
                };
                tryQuality(0.85);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};
