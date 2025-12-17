# Tutorial: Adding a New Tool with Widget

This tutorial walks you through adding a complete new feature to the Movie Context Provider app—a tool with its own interactive widget.

**What you'll build:** A `compare_movies` tool that lets users compare two movies side-by-side, with a dedicated comparison widget.

**Time:** ~30 minutes

---

## Overview

Adding a new tool with widget requires updating these files:

| #   | File                                    | Purpose                              |
| --- | --------------------------------------- | ------------------------------------ |
| 1   | `backend/src/tools/compare.ts`          | Tool schema, handler, and definition |
| 2   | `backend/src/server/tool-registry.ts`   | Register and route the tool          |
| 3   | `backend/src/config/constants.ts`       | Tool name constant + widget config   |
| 4   | `frontend/src/widgets/compare.tsx`      | React widget component               |
| 5   | `frontend/scripts/build-all-widgets.js` | Add widget to build                  |
| 6   | `backend/src/server/mcp-handlers.ts`    | Widget URI resolution                |

Let's build it step by step.

---

## Step 1: Create the Tool File

Create `backend/src/tools/compare.ts`:

```typescript
/**
 * Compare Movies Tool
 * Compare two movies side-by-side
 */

import { z } from "zod";
import { getMovieDetails } from "../utils/tmdb.js";
import { withToolHandler } from "../utils/tool-helpers.js";
import { WIDGET_CONFIG, OPENAI_WIDGET_META } from "../config/constants.js";

// Environment check for widget
const COMPARE_WIDGET_URL = process.env.MOVIE_POSTER_WIDGET_URL;

// 1. INPUT SCHEMA
// Define what inputs the tool accepts using Zod
export const CompareMoviesSchema = z.object({
  movie1_id: z.number().int().positive().describe("TMDB ID of first movie"),
  movie2_id: z.number().int().positive().describe("TMDB ID of second movie"),
});

export type CompareMoviesInput = z.infer<typeof CompareMoviesSchema>;

// 2. RESULT TYPE
// Define the shape of data returned by the handler
interface CompareMoviesResult {
  message: string;
  comparison: {
    movie1: MovieSummary;
    movie2: MovieSummary;
  };
  widgetMeta?: any;
}

interface MovieSummary {
  tmdb_id: number;
  title: string;
  year: number | null;
  rating: number | null;
  runtime: number | null;
  budget: number | null;
  revenue: number | null;
  genres: string[];
  director: string | null;
  poster_url: string | null;
  overview: string;
}

// 3. HANDLER LOGIC
// The actual business logic that runs when the tool is called
async function handleCompareMovies(
  input: CompareMoviesInput,
  userId?: number
): Promise<CompareMoviesResult> {
  // Fetch both movies in parallel
  const [movie1Data, movie2Data] = await Promise.all([
    getMovieDetails(input.movie1_id),
    getMovieDetails(input.movie2_id),
  ]);

  // Transform to summary format
  const toSummary = (movie: any): MovieSummary => ({
    tmdb_id: movie.tmdb_id,
    title: movie.title,
    year: movie.year,
    rating: movie.rating,
    runtime: movie.runtime,
    budget: movie.budget,
    revenue: movie.revenue,
    genres: movie.genres?.map((g: any) => g.name) || [],
    director: movie.director,
    poster_url: movie.poster_url,
    overview: movie.overview,
  });

  const movie1 = toSummary(movie1Data);
  const movie2 = toSummary(movie2Data);

  // Build widget metadata if widget URL is configured
  const widgetMeta = COMPARE_WIDGET_URL
    ? {
        "openai/outputTemplate": "ui://widget/compare",
        ...OPENAI_WIDGET_META,
        "openai/toolInvocation/invoking": "Comparing movies...",
        "openai/toolInvocation/invoked": "Comparison ready",
      }
    : undefined;

  return {
    message: `Comparing "${movie1.title}" vs "${movie2.title}"`,
    comparison: { movie1, movie2 },
    widgetMeta,
  };
}

// 4. WRAPPED HANDLER
// Use withToolHandler for standardized error handling and response formatting
export const compareMovies = withToolHandler({
  schema: CompareMoviesSchema,
  toolName: "compare_movies",
  handler: handleCompareMovies,
  toTextContent: (result) => result.message,
  toStructuredContent: (result) => ({
    success: true,
    comparison: result.comparison,
  }),
  toMeta: (result) => result.widgetMeta,
  errorMessagePrefix: "Failed to compare movies",
});

// 5. TOOL DEFINITION
// JSON Schema sent to ChatGPT so it knows how to call this tool
export const compareMoviesToolDefinition = {
  name: "compare_movies",
  description:
    "Compare two movies side-by-side. Shows ratings, runtime, budget, revenue, and other details for easy comparison. Use this when the user wants to decide between two movies or see how they stack up.",
  inputSchema: {
    type: "object",
    properties: {
      movie1_id: {
        type: "number",
        description: "TMDB ID of the first movie to compare",
      },
      movie2_id: {
        type: "number",
        description: "TMDB ID of the second movie to compare",
      },
    },
    required: ["movie1_id", "movie2_id"],
  },
  // Suppress ChatGPT text when widget is shown
  suppressTextResponse: true,
  // Widget metadata
  ...(COMPARE_WIDGET_URL && {
    _meta: {
      "openai/outputTemplate": "ui://widget/compare",
      ...OPENAI_WIDGET_META,
      "openai/toolInvocation/invoking": "Comparing movies...",
      "openai/toolInvocation/invoked": "Comparison ready",
    },
  }),
};
```

---

## Step 2: Register the Tool

Edit `backend/src/server/tool-registry.ts`:

### Add imports at the top:

```typescript
import {
  compareMovies,
  compareMoviesToolDefinition,
} from "../tools/compare.js";
```

### Add to `getToolDefinitions()`:

```typescript
export function getToolDefinitions() {
  const tools = [
    searchMoviesToolDefinition,
    discoverMoviesToolDefinition,
    // ... other existing tools ...
    compareMoviesToolDefinition, // ← Add here
  ];

  // ... rest of function
  return tools;
}
```

### Add to `callTool()` switch statement:

```typescript
export async function callTool(name: string, args: any, userId?: number): Promise<any> {
  try {
    switch (name) {
      // ... existing cases ...

      case 'compare_movies':
        return await compareMovies(args, userId);

      // ... rest of switch ...
    }
  }
  // ... error handling ...
}
```

---

## Step 3: Add Constants

Edit `backend/src/config/constants.ts`:

### Add tool name:

```typescript
export const TOOL_NAMES = {
  // ... existing names ...
  COMPARE_MOVIES: "compare_movies",
};
```

### Add widget config:

```typescript
export const WIDGET_CONFIG = {
  // ... existing widgets ...

  compare: {
    uri: "ui://widget/compare",
    name: "Movie Comparison Widget",
    description: "Side-by-side movie comparison view",
    mimeType: "text/html",
    componentFilename: "compare.js",
    rootElementId: "compare-widget-root",
    widgetDescription:
      "Interactive comparison of two movies showing ratings, runtime, budget, and other details side by side.",
  },
};
```

---

## Step 4: Create the Widget

Create `frontend/src/widgets/compare.tsx`:

```tsx
import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import cssContent from "../styles.css?inline";
import { useOpenAiGlobal } from "./shared/index.js";

// Types
type Movie = {
  tmdb_id: number;
  title: string;
  year: number | null;
  rating: number | null;
  runtime: number | null;
  budget: number | null;
  revenue: number | null;
  genres: string[];
  director: string | null;
  poster_url: string | null;
  overview: string;
};

type ToolOutput = {
  success: boolean;
  comparison?: {
    movie1: Movie;
    movie2: Movie;
  };
} | null;

// Helpers
function formatCurrency(amount: number | null): string {
  if (!amount) return "N/A";
  if (amount >= 1_000_000_000)
    return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
  return `$${amount.toLocaleString()}`;
}

function formatRuntime(minutes: number | null): string {
  if (!minutes) return "N/A";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

// Components
function ComparisonRow({
  label,
  value1,
  value2,
  highlight = "none",
  theme,
}: {
  label: string;
  value1: string | number | null;
  value2: string | number | null;
  highlight?: "movie1" | "movie2" | "none";
  theme: "light" | "dark";
}) {
  const baseClass = theme === "dark" ? "text-gray-300" : "text-gray-700";
  const winClass = "font-bold text-green-500";

  return (
    <div
      className={`grid grid-cols-3 gap-4 py-2 border-b ${
        theme === "dark" ? "border-gray-700" : "border-gray-200"
      }`}
    >
      <div
        className={`text-center ${
          highlight === "movie1" ? winClass : baseClass
        }`}
      >
        {value1 ?? "N/A"}
      </div>
      <div
        className={`text-center font-medium ${
          theme === "dark" ? "text-gray-400" : "text-gray-500"
        }`}
      >
        {label}
      </div>
      <div
        className={`text-center ${
          highlight === "movie2" ? winClass : baseClass
        }`}
      >
        {value2 ?? "N/A"}
      </div>
    </div>
  );
}

function CompareWidget() {
  const toolOutput = useOpenAiGlobal("toolOutput") as ToolOutput;
  const theme = useOpenAiGlobal("theme");

  const comparison = useMemo(() => {
    if (!toolOutput?.comparison) return null;

    // Handle nested structures
    const data =
      (toolOutput as any)?.structuredContent?.comparison ||
      (toolOutput as any)?.comparison;

    return data;
  }, [toolOutput]);

  if (!comparison) {
    return (
      <div
        className={`p-4 ${theme === "dark" ? "text-gray-50" : "text-gray-900"}`}
      >
        Loading comparison...
      </div>
    );
  }

  const { movie1, movie2 } = comparison;

  // Determine winners for highlighting
  const ratingWinner =
    (movie1.rating || 0) > (movie2.rating || 0)
      ? "movie1"
      : (movie2.rating || 0) > (movie1.rating || 0)
      ? "movie2"
      : "none";
  const revenueWinner =
    (movie1.revenue || 0) > (movie2.revenue || 0)
      ? "movie1"
      : (movie2.revenue || 0) > (movie1.revenue || 0)
      ? "movie2"
      : "none";

  return (
    <div
      className={`font-sans p-4 ${
        theme === "dark" ? "text-gray-50" : "text-gray-900"
      }`}
    >
      {/* Movie Posters & Titles */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {[movie1, movie2].map((movie) => (
          <div key={movie.tmdb_id} className="text-center">
            {movie.poster_url ? (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-32 h-48 object-cover rounded-lg mx-auto mb-2 shadow-lg"
              />
            ) : (
              <div
                className={`w-32 h-48 rounded-lg mx-auto mb-2 flex items-center justify-center ${
                  theme === "dark" ? "bg-gray-800" : "bg-gray-200"
                }`}
              >
                No Poster
              </div>
            )}
            <h3 className="font-semibold text-lg">{movie.title}</h3>
            <p
              className={`text-sm ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {movie.year || "Unknown year"}
            </p>
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      <div
        className={`rounded-lg p-4 ${
          theme === "dark" ? "bg-gray-800/50" : "bg-gray-100"
        }`}
      >
        <ComparisonRow
          label="Rating"
          value1={movie1.rating ? `${movie1.rating}/10` : null}
          value2={movie2.rating ? `${movie2.rating}/10` : null}
          highlight={ratingWinner}
          theme={theme}
        />
        <ComparisonRow
          label="Runtime"
          value1={formatRuntime(movie1.runtime)}
          value2={formatRuntime(movie2.runtime)}
          theme={theme}
        />
        <ComparisonRow
          label="Budget"
          value1={formatCurrency(movie1.budget)}
          value2={formatCurrency(movie2.budget)}
          theme={theme}
        />
        <ComparisonRow
          label="Revenue"
          value1={formatCurrency(movie1.revenue)}
          value2={formatCurrency(movie2.revenue)}
          highlight={revenueWinner}
          theme={theme}
        />
        <ComparisonRow
          label="Director"
          value1={movie1.director}
          value2={movie2.director}
          theme={theme}
        />
        <ComparisonRow
          label="Genres"
          value1={movie1.genres.slice(0, 2).join(", ") || "N/A"}
          value2={movie2.genres.slice(0, 2).join(", ") || "N/A"}
          theme={theme}
        />
      </div>

      {/* TMDB Attribution */}
      <div className="mt-4 text-center">
        <a
          href="https://www.themoviedb.org"
          target="_blank"
          rel="noopener noreferrer"
          className={`text-xs ${
            theme === "dark" ? "text-gray-500" : "text-gray-400"
          } no-underline`}
        >
          Data from TMDB
        </a>
      </div>
    </div>
  );
}

// Bootstrap
function injectStyles() {
  if (document.getElementById("compare-widget-styles")) return;
  const style = document.createElement("style");
  style.id = "compare-widget-styles";
  style.textContent = cssContent;
  document.head.appendChild(style);
}

function bootstrap() {
  injectStyles();
  const container = document.getElementById("compare-widget-root");
  if (!container) {
    console.error("CompareWidget: root element not found");
    return;
  }
  createRoot(container).render(
    <StrictMode>
      <CompareWidget />
    </StrictMode>
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
```

---

## Step 5: Add Widget to Build

Edit `frontend/scripts/build-all-widgets.js`:

```javascript
const widgets = [
  { name: "poster", entry: "src/widgets/poster.tsx", outFile: "poster.js" },
  { name: "list", entry: "src/widgets/list.tsx", outFile: "list.js" },
  {
    name: "preferences",
    entry: "src/widgets/preferences.tsx",
    outFile: "preferences.js",
  },
  { name: "compare", entry: "src/widgets/compare.tsx", outFile: "compare.js" }, // ← Add
];
```

---

## Step 6: Add Widget URI Resolution

Edit `backend/src/server/mcp-handlers.ts`:

In the `handleReadResource()` function, add a case for the compare widget:

```typescript
async function handleReadResource(request: any) {
  // ... existing code ...

  let widgetHtml: string;
  let widgetUrl: string | null;
  let widgetDescription: string;

  if (request.params.uri.startsWith(WIDGET_CONFIG.poster.uri)) {
    // ... existing poster handling ...
  } else if (request.params.uri.startsWith(WIDGET_CONFIG.list.uri)) {
    // ... existing list handling ...
  } else if (request.params.uri.startsWith(WIDGET_CONFIG.preferences.uri)) {
    // ... existing preferences handling ...
  } else if (request.params.uri.startsWith(WIDGET_CONFIG.compare.uri)) {
    // ← Add this block
    if (!MOVIE_POSTER_WIDGET_URL) {
      throw new Error("Compare widget URL not configured");
    }
    widgetUrl = `${MOVIE_POSTER_WIDGET_URL.replace(/\/[^/]+$/, "")}/${
      WIDGET_CONFIG.compare.componentFilename
    }`;
    widgetDescription = WIDGET_CONFIG.compare.widgetDescription;
    widgetHtml = `
<div id="${WIDGET_CONFIG.compare.rootElementId}"></div>
<script type="module" src="${widgetUrl}"></script>
    `.trim();
  } else {
    throw new Error(`Unknown resource: ${request.params.uri}`);
  }

  // ... rest of function ...
}
```

---

## Step 7: Build and Test

### Build the backend:

```bash
cd backend
npm run build
```

### Build the frontend widgets:

```bash
cd frontend
npm run build
```

### Test locally:

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Test the tool with curl:

```bash
curl http://localhost:3000/mcp/messages \
  -H "Authorization: Bearer demo_api_key_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "compare_movies",
      "arguments": {
        "movie1_id": 27205,
        "movie2_id": 157336
      }
    },
    "id": 1
  }'
```

This compares Inception (27205) with Interstellar (157336).

### Test in ChatGPT:

```
"Compare Inception and Interstellar"
```

---

## Summary

You've now added a complete new feature with:

- ✅ **Input validation** with Zod schema
- ✅ **Business logic** in the handler function
- ✅ **MCP registration** for ChatGPT discovery
- ✅ **Interactive widget** rendered in ChatGPT
- ✅ **Widget URI resolution** to load the component

### File changes recap:

| File                                    | Changes                                |
| --------------------------------------- | -------------------------------------- |
| `backend/src/tools/compare.ts`          | New file (schema, handler, definition) |
| `backend/src/server/tool-registry.ts`   | Import + register + dispatch           |
| `backend/src/config/constants.ts`       | TOOL_NAMES + WIDGET_CONFIG             |
| `frontend/src/widgets/compare.tsx`      | New file (React component)             |
| `frontend/scripts/build-all-widgets.js` | Add to widgets array                   |
| `backend/src/server/mcp-handlers.ts`    | URI resolution case                    |

---

## Next Ideas

Try building these on your own:

- **`rate_movie`** - Quick rating tool with a star-rating widget
- **`similar_movies`** - Use TMDB's similar movies endpoint
- **`movie_quiz`** - Generate trivia questions about movies
- **`cast_filmography`** - Show all movies for a given actor

Happy building! 🎬
