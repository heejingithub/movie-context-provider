/**
 * MCP Protocol Request Handlers
 * Handles initialization, tool listing, tool calling, and resource management
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  InitializeRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  SERVER_INFO,
  PROTOCOL_VERSION,
  WIDGET_CONFIG,
  OPENAI_WIDGET_META,
  TOOL_NAMES,
} from '../config/constants.js';
import {
  MOVIE_POSTER_WIDGET_URL,
  MOVIE_LIST_WIDGET_URL,
  MOVIE_QUIZ_WIDGET_URL,
} from '../utils/config.js';
import { getToolDefinitions, callTool } from './tool-registry.js';

/**
 * Register all MCP request handlers on the server
 */
export function registerMCPHandlers(mcpServer: Server): void {
  // Initialize handler
  mcpServer.setRequestHandler(InitializeRequestSchema, handleInitialize);
  
  // Tool handlers
  mcpServer.setRequestHandler(ListToolsRequestSchema, handleListTools);
  mcpServer.setRequestHandler(CallToolRequestSchema, handleCallTool);
  
  // Resource handlers (widgets)
  mcpServer.setRequestHandler(ListResourcesRequestSchema, handleListResources);
  mcpServer.setRequestHandler(ReadResourceRequestSchema, handleReadResource);
}

/**
 * Handle MCP initialization request
 */
async function handleInitialize(request: any) {
  console.error('[MCP] Initialize request received'); // stderr for Claude logs
  console.log('🚀 Initialize request:', request.params.clientInfo);
  
  return {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {
      tools: {},
      resources: {},
    },
    serverInfo: {
      name: SERVER_INFO.name,
      version: SERVER_INFO.version,
    },
  };
}

/**
 * Handle list tools request
 */
async function handleListTools() {
  console.log('📋 tools/list request received');
  
  const tools = getToolDefinitions();
  console.log(`📋 Returning ${tools.length} tools`);
  
  // Log the get_movie_details tool specifically to verify _meta is included
  const movieDetailsTool = tools.find((t) => t.name === TOOL_NAMES.GET_MOVIE_DETAILS);
  if (movieDetailsTool) {
    console.log('📋 get_movie_details tool definition:', JSON.stringify(movieDetailsTool, null, 2));
  }
  
  return { tools };
}

/**
 * Handle call tool request
 */
async function handleCallTool(request: any, extra: any) {
  const { name, arguments: args } = request.params;
  
  // Extract userId from transport metadata
  const userId = (extra as any)?.authInfo?.userId ?? (extra as any)?.userId;
  
  console.log(`🔧 Tool call: ${name}`, { userId, args });
  
  return await callTool(name, args, userId);
}

/**
 * Handle list resources request (widget templates)
 */
async function handleListResources() {
  console.log('📦 resources/list request received');
  const resources = [];
  
  if (MOVIE_POSTER_WIDGET_URL) {
    resources.push({
      uri: WIDGET_CONFIG.poster.uri,
      name: WIDGET_CONFIG.poster.name,
      description: WIDGET_CONFIG.poster.description,
      mimeType: WIDGET_CONFIG.poster.mimeType,
      _meta: {
        'openai/widgetAccessible': OPENAI_WIDGET_META.widgetAccessible,
        'openai/resultCanProduceWidget': OPENAI_WIDGET_META.resultCanProduceWidget,
      },
    });
  }
  
  if (MOVIE_LIST_WIDGET_URL) {
    resources.push({
      uri: WIDGET_CONFIG.list.uri,
      name: WIDGET_CONFIG.list.name,
      description: WIDGET_CONFIG.list.description,
      mimeType: WIDGET_CONFIG.list.mimeType,
      _meta: {
        'openai/widgetAccessible': OPENAI_WIDGET_META.widgetAccessible,
        'openai/resultCanProduceWidget': OPENAI_WIDGET_META.resultCanProduceWidget,
      },
    });
    
    resources.push({
      uri: WIDGET_CONFIG.preferences.uri,
      name: WIDGET_CONFIG.preferences.name,
      description: WIDGET_CONFIG.preferences.description,
      mimeType: WIDGET_CONFIG.preferences.mimeType,
      _meta: {
        'openai/widgetAccessible': OPENAI_WIDGET_META.widgetAccessible,
        'openai/resultCanProduceWidget': OPENAI_WIDGET_META.resultCanProduceWidget,
      },
    });
  }

  if (MOVIE_QUIZ_WIDGET_URL) {
    resources.push({
      uri: WIDGET_CONFIG.quiz.uri,
      name: WIDGET_CONFIG.quiz.name,
      description: WIDGET_CONFIG.quiz.description,
      mimeType: WIDGET_CONFIG.quiz.mimeType,
      _meta: {
        'openai/widgetAccessible': OPENAI_WIDGET_META.widgetAccessible,
        'openai/resultCanProduceWidget': OPENAI_WIDGET_META.resultCanProduceWidget,
      },
    });
  }
  
  return { resources };
}

/**
 * Handle read resource request (return widget HTML)
 */
async function handleReadResource(request: any) {
  console.log('📖 resources/read request:', request.params.uri);
  
  let widgetHtml: string;
  let widgetUrl: string | null;
  let widgetDescription: string;
  
  if (request.params.uri.startsWith(WIDGET_CONFIG.poster.uri)) {
    if (!MOVIE_POSTER_WIDGET_URL) {
      throw new Error('Movie poster widget URL not configured');
    }
    widgetUrl = MOVIE_POSTER_WIDGET_URL;
    widgetDescription = WIDGET_CONFIG.poster.widgetDescription;
    widgetHtml = `
<div id="${WIDGET_CONFIG.poster.rootElementId}"></div>
<script type="module" src="${MOVIE_POSTER_WIDGET_URL}"></script>
    `.trim();
  } else if (request.params.uri.startsWith(WIDGET_CONFIG.list.uri)) {
    if (!MOVIE_LIST_WIDGET_URL) {
      throw new Error('Movie list widget URL not configured');
    }
    widgetUrl = MOVIE_LIST_WIDGET_URL;
    widgetDescription = WIDGET_CONFIG.list.widgetDescription;
    widgetHtml = `
<div id="${WIDGET_CONFIG.list.rootElementId}"></div>
<script type="module" src="${MOVIE_LIST_WIDGET_URL}"></script>
    `.trim();
  } else if (request.params.uri.startsWith(WIDGET_CONFIG.preferences.uri)) {
    if (!MOVIE_LIST_WIDGET_URL) {
      throw new Error('Preferences widget URL not configured');
    }
    widgetUrl = `${MOVIE_LIST_WIDGET_URL.replace(/\/[^/]+$/, '')}/${WIDGET_CONFIG.preferences.componentFilename}`;
    widgetDescription = WIDGET_CONFIG.preferences.widgetDescription;
    widgetHtml = `
<div id="${WIDGET_CONFIG.preferences.rootElementId}"></div>
<script type="module" src="${widgetUrl}"></script>
    `.trim();
  } else if (request.params.uri.startsWith(WIDGET_CONFIG.quiz.uri)) {
    if (!MOVIE_QUIZ_WIDGET_URL) {
      throw new Error('Movie quiz widget URL not configured');
    }
    widgetUrl = MOVIE_QUIZ_WIDGET_URL;
    widgetDescription = WIDGET_CONFIG.quiz.widgetDescription;
    widgetHtml = `
<div id="${WIDGET_CONFIG.quiz.rootElementId}"></div>
<script type="module" src="${MOVIE_QUIZ_WIDGET_URL}"></script>
    `.trim();
  } else {
    throw new Error(`Unknown resource: ${request.params.uri}`);
  }

  console.log('📖 Returning widget HTML:', {
    uri: request.params.uri,
    widgetUrl,
    htmlLength: widgetHtml.length,
  });

  return {
    contents: [
      {
        uri: request.params.uri,
        mimeType: 'text/html+skybridge',
        text: widgetHtml,
        _meta: {
          'openai/widgetAccessible': OPENAI_WIDGET_META.widgetAccessible,
          'openai/resultCanProduceWidget': OPENAI_WIDGET_META.resultCanProduceWidget,
          'openai/widgetDescription': widgetDescription,
        },
      },
    ],
  };
}
