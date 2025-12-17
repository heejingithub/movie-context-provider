# MCP: Movie Context Provider

A **demo OpenAI App** built with the **[OpenAI Apps SDK](https://developers.openai.com/apps-sdk)**, that's ready to deploy on **[Render](https://render.com)**.

Manage your personal movie watchlist, get AI-powered recommendations, and interact with beautiful widgets directly in ChatGPT. Movie data powered by **[TMDB](https://www.themoviedb.org)**. Features multi-provider LLM support and PostgreSQL for data persistence.

[![OpenAI Apps SDK](https://img.shields.io/badge/OpenAI-Apps%20SDK-412991?logo=openai)](https://developers.openai.com/apps-sdk)
[![Render](https://img.shields.io/badge/Deploy-Render-9333ea?logo=render)](https://render.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/docs/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql)](https://www.postgresql.org/docs/17/)

---

## What is this?

This demo implements a movie discovery app with watchlists, ratings, and AI recommendations—fully integrated into ChatGPT.

https://github.com/user-attachments/assets/82e33bd5-8a5e-4f03-b8df-44c352dc1ded

**What you'll learn:**

- Creating **interactive widgets**
- Implementing **MCP tools**
- Deploying with **zero configuration**
- Integrating **multiple LLM providers** (OpenAI, Anthropic, Google)

**Fork this repository** to build your own MCP-powered OpenAI App. Customize it, learn from it, and deploy your own version to Render.

---

## Table of contents

- [Features](#features)
- [Getting started](#getting-started)
- [Create an OpenAI app](#create-an-openai-app)
- [Usage examples](#app-usage-examples)
- [How widgets work](#how-widgets-work)
- [Extending the app](#extending-the-app)
- [Troubleshooting](#troubleshooting)
- [Technical notes](#technical-notes)
- [Resources](#resources)

---

## Features

### MCP tools

**Search & Discovery**

- `search_movies` - Search for one or multiple movies by title
- `discover_movies` - Advanced filtering (director, actor, genre, year, rating)
- `get_movie_details` - Full details with cast, ratings, and poster widget

**Watchlist Management**

- `add_to_watchlist`, `remove_from_watchlist`, `get_watchlist`

**Watch History**

- `mark_as_watched`, `mark_as_watched_batch`, `get_watched_movies`

**Preferences**

- `set_preferences`, `get_preferences`, `remove_preference_item`

**AI Features** (requires LLM API key)

- `get_recommendations` - Personalized movie suggestions based on your watch history and preferences

> All tools are implemented in [`backend/src/tools/`](backend/src/tools/)
>
> **Note:** Only the `get_recommendations` tool requires an LLM API key. All other features work with just the TMDB API key.

### Widgets

Interactive UI components rendered in ChatGPT:

- **Movie Poster** - Full details view with cast, backdrop, and quick actions (add to watchlist, mark watched)
- **Movie List** - Sortable grid for search results and watchlists with inline actions
- **Preferences** - Visual editor for favorite genres, actors, directors (helps AI recommendations)

### Multi-provider AI

Recommendations support OpenAI (GPT-5), Anthropic (Claude Sonnet 4.5), or Gemini (2.5 Flash). Auto-detects based on available API key.

### Performance & Caching

Built-in Valkey caching for optimal performance:

- **TMDB API calls** - Person searches (7 days) and movie details (30 days)
- **User preferences** - Cached for 5 minutes with automatic invalidation on updates
- **Result**: Sub-millisecond response times for cached data vs. 200-300ms API calls

Valkey is automatically provisioned on Render thanks to our blueprint setup. No additional configuration needed.

---

## Getting started

### Quick start: Deploy to Render

This app is designed to be deployed to [Render](https://render.com) with zero configuration. The included `render.yaml` blueprint automatically provisions everything you need.

#### Prerequisites

Get your API keys ready (you'll add them during deployment):

- **TMDB API Key** (required, free):

  1. Create account at [themoviedb.org](https://www.themoviedb.org/signup)
  2. Go to [Settings → API](https://www.themoviedb.org/settings/api)
  3. Request an API key (choose "Developer" for personal use)
  4. Copy your "API Key (v3 auth)" - this is what you'll use

- **LLM API Key** (optional, only for the recommendation tool):
  - [OpenAI API Key](https://platform.openai.com/api-keys) (paid) - for GPT-5
  - [Anthropic API Key](https://console.anthropic.com/) (paid) - for Claude Sonnet 4.5
  - [Google Gemini API Key](https://ai.google.dev/) (free tier available) - for Gemini 2.5 Flash
  - If you skip this, all features work except `get_recommendations`

#### Deploy in 3 steps

**1. Fork this repository**

Click the "Fork" button at the top right of this page to create your own copy.

**2. Create a new Blueprint on Render**

- Go to [Render Dashboard](https://dashboard.render.com)
- Click **New** → **Blueprint**
- Connect your GitHub account and select your forked repository
- Render will detect the `render.yaml` file automatically

**3. Add your API keys as environment variables**

When prompted, add these **secret** environment variables:

| Variable            | Required?      | Description                                               |
| ------------------- | -------------- | --------------------------------------------------------- |
| `TMDB_API_KEY`      | ✅ Required    | Your TMDB API key (for all movie data)                    |
| `OPENAI_API_KEY`    | 🤖 Optional\*  | OpenAI API key (GPT-5 for recommendations)                |
| `ANTHROPIC_API_KEY` | 🤖 Optional\*  | Anthropic API key (Claude Sonnet 4.5 for recommendations) |
| `GEMINI_API_KEY`    | 🤖 Optional\*  | Google Gemini API key (2.5 Flash for recommendations)     |
| `ADMIN_API_KEY`     | ✨ Recommended | Your personal MCP access key (auto-generated if not set)  |
| `ADMIN_EMAIL`       | Optional       | Admin user email (defaults to `admin@localhost`)          |

> **\*At least one LLM API key is required** if you want to use the `get_recommendations` tool. All other features (search, watchlist, preferences, etc.) work without any LLM.

> **Free tier note:** The provided Render blueprint is preconfigured so every service runs on free plans (the managed Postgres instance is free for the first 30 days). Free services spin down when idle, so the first request after a long pause may be slow or occasionally time out. Once instance is active, everything behaves normally. If you want production-like responsiveness, bump the services to Starter or Standard plans.

Click **Apply** and Render will:

- ✅ Provision a PostgreSQL database
- ✅ Provision a Valkey cache (for performance)
- ✅ Deploy the backend Node.js service
- ✅ Deploy the frontend widget static site
- ✅ Run database migrations automatically
- ✅ Link everything together
- ✅ Assign HTTPS domains

**That's it!** In ~5 minutes your app will be live at:

- **Backend MCP Server**: `https://your-app-name.onrender.com`
- **Widget UI**: `https://your-app-name-widgets.onrender.com`

## Create an OpenAI app

https://github.com/user-attachments/assets/bacc934b-670b-48ac-89bd-4acaf2d6889d

Create an OpenAI app to use your MCP server in ChatGPT:

### Step 1: Find your API key

You'll need your API key to connect. Find it by:

- Checking your Render deployment logs (shown after first deployment) - look for a line like:
  ```
  Connection URL: https://your-app-name.onrender.com/mcp/messages
  API Key (Bearer token): moviemcp_xxxxx...
  OpenAI App MCP URL: https://your-app-name.onrender.com/mcp/messages?api_key=moviemcp_xxxxx...
  ```
- Copy the `OpenAI App MCP URL`, you'll need it at Step 3 below

### Step 2: Enable developer mode (first time only)

1. Open ChatGPT and go to **Settings** (gear icon in bottom left)
2. Navigate to **Apps and connectors**
3. Scroll down and click **Advanced settings**
4. Enable **Developer mode**

### Step 3: Create your OpenAI app

1. Go back to **Apps and connectors**
2. Click **Create** (or **New connector**)
3. Fill in the connector details:
   - **Name**: `Movie Context Provider` (or any name you prefer)
   - **Description** (optional): Brief description of what it does
   - **MCP Server URL**: Paste the `OpenAI App MCP URL` value you copied from the server logs at step 1. It should look something like`https://your-app-name.onrender.com/mcp/messages?api_key=your_API_key_here`
   - **Authentication**: select No Auth
   - Check **"I trust this application"** (required for custom connectors)
4. Click **Create**

ChatGPT will test the connection and add the MCP server.

### Step 4: Enable the app in a chat

> **Important**: The app won't work until you enable it in a ChatGPT conversation.

1. Open ChatGPT at [chatgpt.com](https://chatgpt.com)
2. Click the **+** button (bottom left, next to the message input)
3. Select your **Movie Context Provider** app from the list
4. Start chatting: _"Search for Inception"_ or _"Show my watchlist"_

### Alternative: Other MCP clients (without widgets)

You can also use this MCP server with other MCP-compatible clients like Claude Desktop, or Cursor. Add this configuration:

**Other MCP clients**  
Add to your MCP configuration:

```json
{
  "mcpServers": {
    "movies": {
      "url": "https://your-app-name.onrender.com/mcp/messages",
      "headers": {
        "Authorization": "Bearer YOUR_ADMIN_API_KEY"
      },
      "transport": "streamableHttp"
    }
  }
}
```

> **Note**: Only ChatGPT supports OpenAI widgets, other MCP clients respond with text-based responses instead of interactive UI components.

---

## How widgets work

Widgets provide interactive UI components within ChatGPT:

1. **Backend** returns structured data + widget metadata in `_meta` field
2. **ChatGPT** renders the widget (e.g., `ui://widget/movie-poster`)
3. **Widget** calls tools via `window.openai.callTool()` for interactions
4. **State updates** automatically without page refresh

**Available widgets:**

- `movie-poster` - Detailed movie view with actions
- `movie-list` - Sortable/filterable movie grid
- `preferences` - Manage favorite genres, actors, directors

See [`frontend/src/widgets/`](frontend/src/widgets/) for implementation details.

---

## Multi-provider LLM (optional)

AI recommendations support three providers (priority: OpenAI → Anthropic → Gemini):

| Provider  | Model             | Notes                             |
| --------- | ----------------- | --------------------------------- |
| OpenAI    | GPT-5             | Latest reasoning model            |
| Anthropic | Claude Sonnet 4.5 | Best speed/intelligence balance   |
| Gemini    | Gemini 2.5 Flash  | Best price/performance, free tier |

Set any one API key to enable the `get_recommendations` tool. Models are fixed and auto-detected based on available keys.

### Authentication & user management

> **Demo Authentication Note**  
> This project uses simple API key authentication as a **shortcut for demo purposes**. Each API key serves as both authentication and user identification, making it easy to support multiple users without complex OAuth flows.
>
> **For production apps**, consider implementing OAuth 2.0, which provides:
>
> - Secure user consent flows
> - Token expiration and refresh
> - Revocable access without password changes
> - Industry-standard security practices
>
> The API key approach here is intentionally simplified to focus on showing **MCP and OpenAI app SDK concepts** rather than authentication best practices.

### Automatic admin user setup

**Good news!** If you set `ADMIN_API_KEY` during deployment, an admin user is **automatically created** during database migration. You can immediately connect using your admin key:

```bash
# Your ADMIN_API_KEY works as both:
# 1. Protection for /admin endpoints
# 2. Your personal MCP API key

# Connect immediately after deployment
https://movie-mcp-server.onrender.com/mcp/messages?api_key=YOUR_ADMIN_API_KEY
```

### Creating additional users

Use the admin endpoint to create users for others:

```bash
curl -X POST https://movie-mcp-server.onrender.com/admin/create-user \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": 2,
    "email": "user@example.com",
    "apiKey": "moviemcp_abc123_def456..."
  },
  "message": "User created successfully. Save this API key securely!"
}
```

**💡 Each user gets a unique API key** for isolated watchlists and preferences

### Using your API key

Connect to the MCP server using your API key:

```bash
# Via query parameter
https://movie-mcp-server.onrender.com/mcp/messages?api_key=YOUR_API_KEY

# Via Authorization header
curl https://movie-mcp-server.onrender.com/mcp/messages \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

### Admin endpoints

Protected by `ADMIN_API_KEY` environment variable:

- **POST /admin/create-user** - Create a new user with auto-generated API key
- **GET /admin/users** - List all users (no API keys shown)
- **GET /admin/health** - Check admin endpoint status

### Alternative: manual SQL

You can also create users directly via SQL:

```sql
INSERT INTO users (email, api_key)
VALUES ('user@example.com', 'moviemcp_' || floor(random() * 1000000000)::text || '_' || md5(random()::text));
```

**Production Recommendations:**

- Migrate to OAuth 2.0

---

## App usage examples

#### In ChatGPT

```
User: Search for sci-fi movies from 2010
→ Displays movie list widget with Inception, Tron Legacy, etc.

User: Tell me about Inception
→ Displays movie poster widget with full details

User: Add it to my watchlist
→ Confirms added, updates widget state

User: Mark Inception as watched, 5 stars
→ Saves rating, removes from watchlist

User: Show my watchlist
→ Displays watchlist in list widget (sortable, filterable)

User: Recommend me some movies for a cozy evening
→ AI analyzes your taste, displays personalized recommendations
```

#### Advanced queries

```
"Find highly-rated Christopher Nolan movies"
"Show me popular action movies from the 90s"
"Give me Tom Hanks movies I haven't watched"
"Recommend thought-provoking sci-fi like Arrival"
"What's in my watchlist?"
"Show my highest-rated movies"
```

---

### Local development (optional)

Want to develop or test locally before deploying? Here's how:

#### Prerequisites

- **Node.js 20+**
- **PostgreSQL 15+** (local instance or Docker)
- Your API keys from above

#### Setup steps

**1. Clone your forked repository**

```bash
git clone https://github.com/YOUR_USERNAME/movie-context-provider
cd movie-context-provider
```

**2. Install dependencies**

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

**3. Configure environment**

```bash
cd backend
cp env.example .env
```

Edit `.env` with your local database and API keys:

```env
# Local database
DATABASE_URL=postgresql://user:password@localhost:5432/movies_db

# API Keys (same as Render)
TMDB_API_KEY=your_tmdb_api_key
OPENAI_API_KEY=your_openai_api_key

# Local URLs
MOVIE_POSTER_WIDGET_URL=http://localhost:5173
PORT=3000
NODE_ENV=development
```

**4. Set up database**

```bash
cd backend
npm run migrate
```

Creates tables and a demo user: `demo@example.com` / API key: `demo_api_key_change_in_production`

**5. Run development servers**

```bash
# Terminal 1 - Backend (with hot reload)
cd backend
npm run dev

# Terminal 2 - Frontend widgets (with hot reload)
cd frontend
npm run dev
```

**6. Connect to ChatGPT**

```json
{
  "mcpServers": {
    "movies": {
      "url": "http://localhost:3000/mcp/messages",
      "headers": {
        "Authorization": "Bearer demo_api_key_change_in_production"
      },
      "transport": "streamableHttp"
    }
  }
}
```

#### Development scripts

**Backend:**

```bash
npm run dev          # Hot reload (tsx watch)
npm run build        # Compile TypeScript
npm start            # Run compiled code
npm run migrate      # Run database migration
npm run type-check   # TypeScript check
```

**Frontend:**

```bash
npm run dev          # Dev server with hot reload
npm run build        # Build both widgets
npm run build:poster # Build poster widget only
npm run build:list   # Build list widget only
```

#### Adding a new tool

Quick example of adding a simple tool:

```typescript
// backend/src/tools/myTool.ts
export const myToolDefinition = {
  name: "my_tool",
  description: "Does something cool",
  inputSchema: {
    type: "object",
    properties: {
      param: { type: "string", description: "Parameter description" },
    },
    required: ["param"],
  },
};
```

Then register it in `backend/src/server/tool-registry.ts`.

📖 **For a complete walkthrough** (including widgets), see **[TUTORIAL.md](TUTORIAL.md)**.

---

## Extending the app

Want to add your own features? Here's what to update:

| To Add                   | Files                                                                   |
| ------------------------ | ----------------------------------------------------------------------- |
| **New tool (no widget)** | `tools/yourTool.ts` → `tool-registry.ts`                                |
| **New tool + widget**    | + `widgets/yourWidget.tsx` → `build-all-widgets.js` → `mcp-handlers.ts` |

**Ideas to try:**

- `rate_movie` - Quick rating with star selector widget
- `similar_movies` - TMDB's similar movies endpoint
- `movie_quiz` - Generate trivia questions
- `cast_filmography` - Show all movies for an actor

📖 **Full step-by-step guide:** **[TUTORIAL.md](TUTORIAL.md)** walks through building a complete `compare_movies` tool with widget.

---

### Troubleshooting

### Widget not displaying

**Check backend response includes widget metadata:**

```typescript
_meta: {
  'openai/outputTemplate': 'ui://widget/movie-poster',
  'openai/widgetAccessible': true,
  'openai/resultCanProduceWidget': true
}
```

**Verify MOVIE_POSTER_WIDGET_URL is set correctly:**

```bash
echo $MOVIE_POSTER_WIDGET_URL
# Should be: https://your-frontend.onrender.com
```

### Database connection issues

```bash
# Test connection
psql $DATABASE_URL

# Render requires SSL:
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

### LLM provider issues

**Check which provider is being used:**

```bash
# Backend logs will show:
🤖 Using OPENAI for recommendations
```

**Verify API key is set:**

```bash
echo $OPENAI_API_KEY
# Should output your key
```

---

### Gotchas & known issues

### 1. The 424 Error: `structuredContent` Must Be Objects

**Problem:** Intermittent `424 Failed Dependency` errors in ChatGPT when calling tools like `set_preference` and `add_to_watchlist`.

**What We Learned:**

This was one of our toughest debugging challenges. Here's what made it tricky:

1. **The error appeared inconsistently** across different tools, making it seem like unrelated issues
2. **Backend logs showed success** - our server returned 200 OK with valid JSON
3. **No client-side error details** - ChatGPT UI displayed "Tool failed with status 424" without specifics
4. **The bug was subtle** - responses looked correct and followed MCP protocol structure

After careful debugging and comparing working vs. failing tool responses, we discovered the root cause:

**The Solution:**

The [OpenAI Apps SDK](https://developers.openai.com/apps-sdk/build/custom-ux) expects `toolOutput` to be an object (hinted by the TypeScript type `ToolOutput extends UnknownObject`). Primitive values are rejected:

```typescript
// ❌ BAD - Causes 424 error
return {
  content: [{ type: "text", text: "Preference set" }],
  structuredContent: true, // Primitive rejected!
};

// ✅ GOOD - Always use objects
return {
  content: [{ type: "text", text: "Preference set" }],
  structuredContent: { success: true }, // Object works!
};
```

**Debugging Tips:**

- Compare working tool responses with failing ones byte-by-byte
- Check if any `structuredContent` returns primitives (boolean, string, number)
- Always wrap simple values in objects: `{ success: true }` not `true`
- Use TypeScript for better type hints (though runtime validation would still help)

**For OpenAI SDK Team:** Adding runtime validation with descriptive errors (e.g., "structuredContent must be an object, received: boolean") would significantly improve the developer experience and reduce debugging time for this common mistake.

**Key Takeaway:** When your tool response includes `structuredContent`, it must be an object (not a primitive like `true`, `"success"`, or `42`). If you don't need to pass structured data to a widget, you can omit `structuredContent` entirely and just use `content`.

---

### 2. Widget Data Passing Issues

**Problem:** Initially struggled with passing movie data from backend to widgets.

**Evolution:**

1. **First attempt:** Used `_meta` to hide data from model → Data didn't reach widget
2. **Second attempt:** Used `widgetDescription` in `_meta` → Model still showed duplicate content
3. **Final solution:** Put data in `structuredContent` and keep `content` concise

**Lesson:** `structuredContent` is the reliable way to pass data to widgets. Keep `content` brief (summary for the model), and widgets read from `toolOutput.structuredContent`.

---

### 3. ChatGPT Shows Text Content Below Widgets

**What happens:** Even when your tool returns a widget, ChatGPT often displays additional plain text content below it, duplicating information already shown in the widget.

**Why this happens:** This appears to be intentional behavior by OpenAI. The model uses the `content` field from your tool response to generate a textual summary, which it displays alongside the widget.

**Not configurable from code:** There's no metadata flag or option to disable this text output from the backend.

**Workaround:** You can instruct ChatGPT at the conversation level:

```
"For this movie app, please show only the widget without additional text explanations when displaying movie details or lists."
```

This user-level prompt can guide ChatGPT to be less verbose, though the behavior may still vary depending on the conversation context.

---

### 4. Widget Build Size Considerations

Each widget is ~260 KB because:

- Fully self-contained (includes React, all dependencies)
- No code splitting (required for widget independence)
- Bundles its own copy of shared utilities

This is **intentional** - OpenAI Apps SDK requires self-contained widget bundles. The tradeoff is larger file sizes for simpler deployment and reliability.

---

### Next steps & ideas

### Feature Extensions

**TV Shows Support**

- Add similar tools for TV series using TMDB's TV endpoints
- Track episodes watched, season progress
- Recommendations for "if you liked X, watch Y"

**Analytics & Insights**

- "Your most-watched genres this year"
- "Average rating by director"
- "Movies watched over time" graphs
- Genre preference trends

**🎬 Streaming Integration**

- Show which services have each movie (JustWatch API)
- Filter searches by "available on Netflix"
- Track which services you subscribe to

---

### Technical Improvements

- **Authentication**: OAuth 2.0, JWT tokens with refresh
- **Testing**: Unit tests for tools, integration tests, E2E for MCP
- **Monitoring**: Structured logging, error tracking, usage analytics

---

### Technical notes

### MCP Transport

This project uses the **Streamable HTTP transport**, which is the recommended modern approach for MCP servers (as of specification version 2025-03-26). The older SSE-only transport has been deprecated.

**Why Streamable HTTP?**

- Supports both SSE streaming and direct HTTP responses
- Better session management (stateful or stateless)
- Uses standard HTTP methods (GET/POST)
- More flexible and scalable than SSE-only transport

**References:**

- [MCP Transports Documentation](https://modelcontextprotocol.io/docs/concepts/transports)

---

### Security considerations

⚠️ **This is a demo project. For production use, consider:**

- **Environment variables**: Never commit `.env` or API keys to version control
- **Rate limiting**: Protect your endpoints from abuse (use packages like `express-rate-limit`)
- **API key rotation**: Implement a way to regenerate user API keys
- **HTTPS only**: Render provides this automatically
- **Input validation**: Already using Zod, but consider additional sanitization for SQL injection prevention
- **Audit logging**: Track who accessed what and when

---

## Resources

- [Render Documentation](https://render.com/docs)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [OpenAI Apps SDK Documentation](https://platform.openai.com/docs/apps)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [Google Gemini API Docs](https://ai.google.dev/docs)
- [TMDB API Docs](https://developers.themoviedb.org/3)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## Contributing

This is an educational project demonstrating how to develop and host an OpenAI App on Render. Feel free to use it as a starting point for your own apps!

**Key Learning Points:**

- OpenAI Apps SDK widget development
- MCP protocol implementation
- Database transactions & data modeling
- External API integration (TMDB)
- Multi-provider LLM integration
- Production deployment patterns

---

## License

MIT License - Applies to this demo code only.

**Third-party services:** This app uses [TMDB](https://www.themoviedb.org/documentation/api/terms-of-use), [OpenAI](https://openai.com/policies/terms-of-use), [Anthropic](https://www.anthropic.com/legal/terms), and [Google Gemini](https://ai.google.dev/gemini-api/terms) APIs, each with their own terms. You're responsible for compliance. Movie data provided by TMDB.

---

Questions? Issues? Open a GitHub issue!
