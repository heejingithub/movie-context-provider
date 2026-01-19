/**
 * Tool Registry
 * Centralized tool definitions and tool calling logic
 */

import { TOOL_NAMES } from '../config/constants.js';
import {
  searchMovies,
  searchMoviesToolDefinition,
  discoverMoviesWithFilters,
  discoverMoviesToolDefinition,
} from '../tools/search.js';
import {
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  addToWatchlistToolDefinition,
  removeFromWatchlistToolDefinition,
  getWatchlistToolDefinition,
} from '../tools/watchlist.js';
import {
  markAsWatched,
  markAsWatchedBatch,
  getWatchedMovies,
  markAsWatchedToolDefinition,
  markAsWatchedBatchToolDefinition,
  getWatchedMoviesToolDefinition,
} from '../tools/watched.js';
import {
  setPreferences,
  getPreferences,
  removePreferenceItem,
  setPreferencesToolDefinition,
  getPreferencesToolDefinition,
  removePreferenceItemToolDefinition,
} from '../tools/preferences.js';
import {
  getRecommendations,
  getRecommendationsToolDefinition,
} from '../tools/recommendations.js';
import {
  getMovieDetails as getMovieDetailsTool,
  getMovieDetailsToolDefinition,
} from '../tools/movieDetails.js';
import { movieQuiz, movieQuizToolDefinition } from '../tools/movieQuiz.js';

/**
 * Check if any LLM API key is available
 */
function isLLMAvailable(): boolean {
  return !!(
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GEMINI_API_KEY
  );
}

/**
 * Serialize unknown errors (including AggregateError/TaskGroup-style) for safe logging + UI
 */
function serializeError(err: unknown) {
  const e: any = err;
  return {
    name: e?.name || 'Error',
    message: e?.message || String(err),
    stack: e?.stack,
    cause: e?.cause
      ? {
          name: e.cause?.name,
          message: e.cause?.message,
          stack: e.cause?.stack,
        }
      : undefined,
    // Some runtimes attach nested errors on `errors` (e.g., AggregateError or TaskGroup)
    innerErrors: Array.isArray(e?.errors)
      ? e.errors.map((ie: any) => ({
          name: ie?.name,
          message: ie?.message,
          stack: ie?.stack,
        }))
      : undefined,
  };
}

/**
 * Get all tool definitions
 * Conditionally includes recommendations tool only if LLM API key is available
 */
export function getToolDefinitions() {
  const tools = [
    searchMoviesToolDefinition,
    discoverMoviesToolDefinition,
    addToWatchlistToolDefinition,
    removeFromWatchlistToolDefinition,
    getWatchlistToolDefinition,
    markAsWatchedToolDefinition,
    markAsWatchedBatchToolDefinition,
    getWatchedMoviesToolDefinition,
    setPreferencesToolDefinition,
    getPreferencesToolDefinition,
    removePreferenceItemToolDefinition,
    getMovieDetailsToolDefinition,
    movieQuizToolDefinition,
  ];

  // Only include recommendations tool if LLM is configured
  if (isLLMAvailable()) {
    tools.push(getRecommendationsToolDefinition);
    console.log('✅ LLM configured - recommendations tool enabled');
  } else {
    console.log('⚠️  No LLM API key found - recommendations tool disabled');
  }

  return tools;
}

/**
 * Call a tool by name with arguments
 */
export async function callTool(name: string, args: any, userId?: number): Promise<any> {
  try {
    switch (name) {
      case TOOL_NAMES.SEARCH_MOVIES:
        return await searchMovies(args as any, userId);

      case TOOL_NAMES.DISCOVER_MOVIES:
        return await discoverMoviesWithFilters(args as any, userId);

      case TOOL_NAMES.ADD_TO_WATCHLIST:
        if (!userId) throw new Error('Authentication required');
        return await addToWatchlist(args as any, userId);

      case TOOL_NAMES.REMOVE_FROM_WATCHLIST:
        if (!userId) throw new Error('Authentication required');
        return await removeFromWatchlist(args as any, userId);

      case TOOL_NAMES.GET_WATCHLIST:
        if (!userId) throw new Error('Authentication required');
        return await getWatchlist(userId);

      case TOOL_NAMES.MARK_AS_WATCHED:
        if (!userId) throw new Error('Authentication required');
        return await markAsWatched(args as any, userId);

      case TOOL_NAMES.MARK_AS_WATCHED_BATCH:
        if (!userId) throw new Error('Authentication required');
        return await markAsWatchedBatch(args as any, userId);

      case TOOL_NAMES.GET_WATCHED_MOVIES:
        if (!userId) throw new Error('Authentication required');
        return await getWatchedMovies(args as any, userId);

      case 'set_preferences':
        if (!userId) throw new Error('Authentication required');
        return await setPreferences(args as any, userId);

      case TOOL_NAMES.GET_PREFERENCES:
        if (!userId) throw new Error('Authentication required');
        return await getPreferences(userId);

      case 'remove_preference_item':
        if (!userId) throw new Error('Authentication required');
        return await removePreferenceItem(args as any, userId);

      case TOOL_NAMES.GET_RECOMMENDATIONS:
        if (!userId) throw new Error('Authentication required');
        if (!isLLMAvailable()) {
          throw new Error(
            'Recommendations feature is not available. ' +
            'Please configure at least one LLM API key (OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY).'
          );
        }
        return await getRecommendations(args as any, userId);

      case TOOL_NAMES.GET_MOVIE_DETAILS:
        try {
          const response = await getMovieDetailsTool(args as any, userId);
          console.log('get_movie_details response preview', {
            keys: Object.keys(response ?? {}),
            _meta: '_meta' in response ? response._meta : undefined,
          });
          return response;
        } catch (movieDetailsError) {
          const debug = serializeError(movieDetailsError);
          console.error('get_movie_details failed, returning soft error', {
            args,
            error: debug,
          });
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Unable to load movie details right now.',
              },
            ],
            structuredContent: {
              success: false,
              error: debug.message || 'Failed to load movie details',
              errorDetails: debug,
              // Helpful for client debugging/telemetry
              tmdb_id: (args as any)?.tmdb_id,
              httpStatusHint: 424,
              hint:
                'Likely one of the parallel subrequests (credits/images/metadata) failed. This is a soft error so the transport should not hard-fail.',
            },
            // Stay soft-fail to avoid 424 bubbling up to the connector/UI
            isError: false,
          };
        }

      case TOOL_NAMES.MOVIE_QUIZ:
        return await movieQuiz(args as any, userId);

      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `Unknown tool: ${name}`,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    console.error(`❌ Error calling tool ${name}:`, error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

