/**
 * apiUtils.js
 * 
 * Utilities for handling raw API responses.
 */

/**
 * A fast, single-pass forward scanner to safely extract fully intact top-level 
 * JSON objects from a truncated JSON array string.
 */
const extractIntactArray = (str) => {
    let depth = 0;
    let inString = false;
    let escape = false;
    let lastValidIndex = -1;
    
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (inString) {
            if (escape) escape = false;
            else if (char === '\\') escape = true;
            else if (char === '"') inString = false;
        } else {
            if (char === '"') inString = true;
            else if (char === '{' || char === '[') depth++;
            else if (char === '}' || char === ']') {
                depth--;
                // If depth hits 1 at a closing brace '}', it means a top-level array element just closed perfectly.
                if (depth === 1 && char === '}') {
                    lastValidIndex = i;
                }
            }
        }
    }
    
    if (lastValidIndex !== -1) {
        const fixed = str.substring(0, lastValidIndex + 1) + ']';
        try {
            return JSON.parse(fixed);
        } catch (e) {
            return null; // fallback if regex-like bracket matcher failed
        }
    }
    return null;
};

/**
 * Handles raw response data that might be delivered as a string 
 * due to incorrect backend Content-Type headers.
 * 
 * @param {any} data - Raw data from API
 * @returns {any} - Parsed JSON or empty array if unparseable
 */
export const parseIfString = (data) => {
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch (err) {
      // Let's try to fix common JSON truncation issues gracefully before logging massive errors
      try {
          const strData = data.trim();
          let arrayStr = null;
          
          if (strData.startsWith('[')) {
              arrayStr = strData;
          } else if (strData.startsWith('{')) {
              // Handle Spring Boot / wrapped pagination where array is nested in {"content": [
              const match = strData.match(/"(?:content|data)"\s*:\s*\[/);
              if (match) {
                  const startIdx = match.index + match[0].length - 1; // Index of the opening '['
                  arrayStr = strData.substring(startIdx);
              }
          }

          if (arrayStr) {
              const parsed = extractIntactArray(arrayStr);
              if (parsed) {
                  console.warn(`✅ [API] Successfully recovered ${parsed.length} items using robust forward-scanning bracket matcher.`);
                  return parsed;
              }
              console.warn(`⚠️ [API] Could not safely extract array; no top-level objects were fully intact.`);
          }
      } catch (e3) {
          console.error("❌ [API] JSON recovery attempt failed.", e3.message);
      }

      console.error("❌ [API] JSON.parse fatally failed. Response could not be recovered.");
      console.error("❌ [API] Error:", err.message);
      console.error("❌ [API] Data length:", data?.length || 0);
      
      return [];
    }
  }
  return data;
};
