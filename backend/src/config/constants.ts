/**
 * Application Constants
 * Centralized configuration for server metadata, endpoints, and widget URIs
 */

import { z } from 'zod';

// ============================================================================
// Environment Schema (Zod validation)
// ============================================================================

export const EnvSchema = z.object({
  // Server configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3000'),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // External APIs
  TMDB_API_KEY: z.string().min(1, 'TMDB API key is required'),
  
  // LLM Provider API Keys (at least one required)
  // Models are fixed: GPT-5, Claude Sonnet 4.5, Gemini 2.5 Flash
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  
  // Widgets (optional for local dev)
  MOVIE_POSTER_WIDGET_URL: z.string().optional(),
  MOVIE_QUIZ_WIDGET_URL: z.string().optional(),
  
  // Authentication (optional for local dev, required in production)
  ADMIN_API_KEY: z.string().optional(),
});
// Note: LLM API keys are optional - if not provided, the recommendations tool will be disabled

export type Env = z.infer<typeof EnvSchema>;

/**
 * Validate and parse environment variables
 * Throws if validation fails
 */
export function validateEnv(): Env {
  try {
    return EnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error('Invalid environment configuration');
  }
}

// ============================================================================
// Server Metadata
// ============================================================================

export const SERVER_INFO = {
  name: 'movie-mcp-server',
  version: '1.0.0',
  description: 'MCP server for managing movie watchlists with AI-powered recommendations',
} as const;

export const PROTOCOL_VERSION = '2024-11-05' as const;

// ============================================================================
// API Endpoints
// ============================================================================

export const ENDPOINTS = {
  health: '/health',
  root: '/',
  mcp: '/mcp/messages',
} as const;

// ============================================================================
// Widget Configuration
// ============================================================================

export const WIDGET_CONFIG = {
  poster: {
    uri: 'ui://widget/movie-poster',
    name: 'Movie Poster Widget',
    description: 'Interactive movie poster widget for watchlist management',
    mimeType: 'text/html+skybridge',
    rootElementId: 'movie-poster-widget-root',
    componentFilename: 'poster-component.js',
    widgetDescription:
      'Displays an interactive movie poster card with title, rating, cast, poster image, and action buttons for watchlist and marking as watched.',
  },
  list: {
    uri: 'ui://widget/movie-list',
    name: 'Movie List Widget',
    description: 'Compact movie list widget for displaying multiple movies',
    mimeType: 'text/html+skybridge',
    rootElementId: 'movie-list-widget-root',
    componentFilename: 'list-component.js',
    widgetDescription:
      'Displays a scrollable list of movies with compact poster thumbnails, titles, years, and action buttons for each movie.',
  },
  preferences: {
    uri: 'ui://widget/preferences',
    name: 'Preferences Widget',
    description: 'User preferences widget with profile pictures for actors and directors',
    mimeType: 'text/html+skybridge',
    rootElementId: 'preferences-widget-root',
    componentFilename: 'preferences-component.js',
    widgetDescription:
      'Displays user preferences in an organized layout with badges for genres and avatar cards for actors/directors with profile pictures from TMDB.',
  },
  quiz: {
    uri: 'ui://widget/movie-quiz',
    name: 'Movie Quiz Widget',
    description: 'Interactive trivia quiz widget for movie questions',
    mimeType: 'text/html+skybridge',
    rootElementId: 'movie-quiz-widget-root',
    componentFilename: 'quiz-component.js',
    widgetDescription:
      'Presents a multiple-choice trivia quiz with score tracking and explanations based on movie data.',
  },
} as const;

// ============================================================================
// Transport Configuration
// ============================================================================

export const TRANSPORT_CONFIG = {
  sessionIdGenerator: undefined,
  enableJsonResponse: true,
} as const;

// ============================================================================
// Tool Names (for type safety in switch statements)
// ============================================================================

export const TOOL_NAMES = {
  SEARCH_MOVIES: 'search_movies',
  DISCOVER_MOVIES: 'discover_movies',
  ADD_TO_WATCHLIST: 'add_to_watchlist',
  REMOVE_FROM_WATCHLIST: 'remove_from_watchlist',
  GET_WATCHLIST: 'get_watchlist',
  MARK_AS_WATCHED: 'mark_as_watched',
  MARK_AS_WATCHED_BATCH: 'mark_as_watched_batch',
  GET_WATCHED_MOVIES: 'get_watched_movies',
  SET_PREFERENCE: 'set_preference',
  GET_PREFERENCES: 'get_preferences',
  GET_RECOMMENDATIONS: 'get_recommendations',
  GET_MOVIE_DETAILS: 'get_movie_details',
  MOVIE_QUIZ: 'movie_quiz',
} as const;

// Type-safe tool names
export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

// ============================================================================
// OpenAI Widget Metadata
// ============================================================================

export const OPENAI_WIDGET_META = {
  widgetAccessible: true,
  resultCanProduceWidget: true,
} as const;

// ============================================================================
// TMDB Genre ID Mapping
// ============================================================================

export const GENRE_MAP: Record<string, string> = {
  'action': '28',
  'adventure': '12',
  'animation': '16',
  'comedy': '35',
  'crime': '80',
  'documentary': '99',
  'drama': '18',
  'family': '10751',
  'fantasy': '14',
  'history': '36',
  'horror': '27',
  'music': '10402',
  'mystery': '9648',
  'romance': '10749',
  'science fiction': '878',
  'sci-fi': '878',
  'thriller': '53',
  'war': '10752',
  'western': '37',
} as const;
