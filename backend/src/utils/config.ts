/**
 * Application configuration helpers
 * Widget URL normalization and validation
 */

import { WIDGET_CONFIG } from '../config/constants.js';

/**
 * Build a full URL from a host string or URL
 * Handles Render.com shortcuts (e.g., "my-app" -> "https://my-app.onrender.com")
 */
function buildRenderUrl(hostOrUrl: string | undefined | null): string | null {
  if (!hostOrUrl) return null;

  try {
    // If it's already a valid URL, return it
    const parsed = new URL(hostOrUrl);
    return parsed.toString();
  } catch (_error) {
    // Try to build a URL from a hostname/shortcut
    const host = hostOrUrl.trim();
    if (!host) return null;
    
    try {
      let normalized = host;
      // Add protocol if missing
      if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = `https://${normalized}`;
      }
      
      const url = new URL(normalized);
      
      // Add .onrender.com suffix if hostname has no dots (e.g., "my-app")
      if (!url.hostname.includes('.')) {
        url.hostname = `${url.hostname}.onrender.com`;
      }
      
      return url.toString();
    } catch (error) {
      console.error('[Config] Invalid MOVIE_POSTER_WIDGET_URL value:', error);
      return null;
    }
  }
}

/**
 * Ensure a base URL has the correct component filename
 * @param baseUrl - Base widget URL
 * @param filename - Component filename (e.g., 'poster-component.js')
 */
function ensureComponentPath(baseUrl: string | null, filename: string): string | null {
  if (!baseUrl) return null;

  if (baseUrl.endsWith('.js')) {
    if (baseUrl.endsWith(`/${filename}`)) {
      return baseUrl;
    }

    const trimmed = baseUrl.replace(/\/[^/]+$/, '');
    const normalized = trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
    return `${normalized}${filename}`;
  }

  const normalized = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalized}${filename}`;
}

// ============================================================================
// Widget URL Resolution (from environment)
// ============================================================================

const rawWidgetHost = process.env.MOVIE_POSTER_WIDGET_URL;

if (!rawWidgetHost) {
  console.warn('[Config] MOVIE_POSTER_WIDGET_URL is not set; widgets will be disabled.');
} else {
  console.log('[Config] MOVIE_POSTER_WIDGET_URL detected:', rawWidgetHost);
}

// Normalize and build full widget URLs
const normalizedBaseUrl = buildRenderUrl(rawWidgetHost);
const normalizedPosterUrl = ensureComponentPath(
  normalizedBaseUrl,
  WIDGET_CONFIG.poster.componentFilename
);
const normalizedListUrl = ensureComponentPath(
  normalizedBaseUrl,
  WIDGET_CONFIG.list.componentFilename
);
const normalizedQuizUrl = ensureComponentPath(
  normalizedBaseUrl,
  WIDGET_CONFIG.quiz.componentFilename
);

if (rawWidgetHost && !normalizedPosterUrl) {
  console.error(
    '[Config] MOVIE_POSTER_WIDGET_URL could not be normalized. Check the value:',
    rawWidgetHost
  );
}

// Export normalized URLs
export const MOVIE_POSTER_WIDGET_URL = normalizedPosterUrl;
export const MOVIE_LIST_WIDGET_URL = normalizedListUrl;
export const MOVIE_QUIZ_WIDGET_URL = normalizedQuizUrl;

/**
 * Utility function to resolve Render.com host URLs
 * Can be used for other services/URLs
 */
export function resolveRenderHostUrl(hostOrUrl: string | null | undefined): string | null {
  return buildRenderUrl(hostOrUrl);
}
