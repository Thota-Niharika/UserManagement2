/**
 * apiUtils.js
 *
 * Hardened utilities for handling raw API responses.
 * Designed to survive massive (2MB+) truncated JSON payloads from
 * backends with circular reference / deep serialization issues.
 */

const MAX_SAFE_SCAN_BYTES = 8_000_000; // 8MB hard cap to prevent browser hangs

/**
 * A depth-tracking tokenizer that extracts every COMPLETE top-level
 * JSON object from a truncated array string.
 *
 * Strategy: Track brace depth char-by-char. When depth drops from 1→0
 * at a '}' while we started tracking at a '{' at depth 1, we have a
 * complete element. Try to JSON.parse it individually.
 *
 * This handles:
 *  - Truncation mid-array (last element is broken, rest are intact)
 *  - Very large individual records (each record is parsed independently)
 *  - Deeply nested backend responses
 */
const extractIntactObjects = (str) => {
    const cap = Math.min(str.length, MAX_SAFE_SCAN_BYTES);
    const results = [];

    let depth = 0;
    let inString = false;
    let escape = false;
    let objectStart = -1;

    for (let i = 0; i < cap; i++) {
        const char = str[i];

        if (inString) {
            if (escape) {
                escape = false;
            } else if (char === '\\') {
                escape = true;
            } else if (char === '"') {
                inString = false;
            }
            continue;
        }

        if (char === '"') {
            inString = true;
        } else if (char === '{') {
            depth++;
            if (depth === 1) {
                // Mark the start of a top-level object
                objectStart = i;
            }
        } else if (char === '}') {
            depth--;
            if (depth === 0 && objectStart !== -1) {
                // We've closed a top-level object — try to parse it
                const candidate = str.substring(objectStart, i + 1);
                try {
                    const parsed = JSON.parse(candidate);
                    results.push(parsed);
                } catch (e) {
                    // This individual record was malformed — skip it
                }
                objectStart = -1;
            }
        }
        // Ignore '[' and ']' — we're hunting for objects inside the array
    }

    return results.length > 0 ? results : null;
};

/**
 * Handles raw response data that might be delivered as a string
 * due to incorrect backend Content-Type headers or truncated payloads.
 *
 * @param {any} data - Raw data from API
 * @returns {any} - Parsed JSON or empty array if totally unparseable
 */
export const parseIfString = (data) => {
    if (typeof data !== 'string') return data;

    // Fast path: valid JSON
    try {
        return JSON.parse(data);
    } catch (primaryErr) {
        // Slow path: attempt surgical recovery
        console.warn(`⚠️ [API] JSON parse failed (length: ${data.length}). Attempting surgical recovery...`);
    }

    try {
        const strData = data.trim();
        let arrayStr = null;

        if (strData.startsWith('[')) {
            // Direct array response
            arrayStr = strData;
        } else if (strData.startsWith('{')) {
            // Wrapped pagination: { "content": [...] } or { "data": [...] }
            const match = strData.match(/"(?:content|data|employees|items|records)"\s*:\s*\[/);
            if (match) {
                const startIdx = match.index + match[0].length - 1;
                arrayStr = strData.substring(startIdx);
            } else {
                // No array wrapper found — try to recover as a single object
                // by scanning for '}: ... {' boundaries
                arrayStr = '[' + strData + ']';
            }
        }

        if (arrayStr) {
            const recovered = extractIntactObjects(arrayStr);
            if (recovered && recovered.length > 0) {
                console.warn(`✅ [API] Surgically recovered ${recovered.length} intact records from ${data.length}-byte truncated response.`);
                return recovered;
            }
            console.error(`❌ [API] Surgical recovery failed — no intact records found in ${data.length}-byte payload.`);
        }
    } catch (recoveryErr) {
        console.error('❌ [API] Recovery attempt threw:', recoveryErr.message);
    }

    console.error(`❌ [API] Response could not be recovered. Returning empty array to prevent crash.`);
    return [];
};
