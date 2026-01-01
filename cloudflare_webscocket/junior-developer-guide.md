# Junior Developer Guide: Cloudflare Primitives in SEC Filing Summarizer

This guide explains how our SEC 8-K filing summarization service works using Cloudflare's serverless primitives, with direct references to the implementation in `src/index.ts`.

## Core Cloudflare Primitives Used

### 1. Cloudflare Workers
**What it is**: Serverless functions that run at the edge, close to users.

**In our code**:
```typescript
export default {
  async fetch(request: Request, env: Env) {
    // Main request handler - routes WebSocket upgrades and test requests
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Runs on a schedule to fetch and process SEC filings
  }
}
```

**How it works**: The worker handles both HTTP requests (for WebSocket upgrades) and scheduled events (for periodic data processing).

### 2. Durable Objects
**What it is**: Stateful objects that maintain data across requests, perfect for WebSocket connections.

**In our code**:
```typescript
export class WebSocketHandler {
  state: DurableObjectState;
  connections: WebSocket[] = [];

  async handleSession(websocket: WebSocket) {
    // Manages individual WebSocket connections
  }

  async broadcast(message: string) {
    // Sends messages to all connected clients
  }
}
```

**How it works**: We use a singleton Durable Object (identified by `'singleton'`) to maintain a list of active WebSocket connections and broadcast messages to them.

### 3. Cloudflare KV (Key-Value Storage)
**What it is**: Global, low-latency key-value store for caching.

**In our code**:
```typescript
interface Env {
  CACHE: KVNamespace; // Defined in wrangler.toml
}

// Usage:
await env.CACHE.put(filing.id, summary);
```

**How it works**: Stores AI-generated summaries by filing ID for quick retrieval and to avoid reprocessing.

### 4. Environment Bindings
**What it is**: Way to inject external resources (APIs, storage) into your worker.

**In our code**:
```typescript
interface Env {
  WEBSOCKET_HANDLER: DurableObjectNamespace;
  CACHE: KVNamespace;
  GROQ_API_KEY: string;
}
```

**How it works**: These bindings are configured in `wrangler.toml` and provide access to Durable Objects, KV storage, and API keys.

## Application Flow

### WebSocket Connection Flow
1. Client sends WebSocket upgrade request
2. Worker routes to Durable Object: `env.WEBSOCKET_HANDLER.get(id)`
3. Durable Object accepts connection and adds to `connections` array
4. Client receives WebSocket for real-time updates

### Scheduled Processing Flow
1. Cron trigger fires (configured in `wrangler.toml`)
2. `scheduled()` method runs
3. Fetches SEC filings via RSS feed
4. For each filing:
   - Calls Groq API for AI summarization
   - Stores summary in KV cache
   - Broadcasts to WebSocket clients via Durable Object

### Manual Testing Flow
- Hit `/test-scheduled` endpoint to trigger processing without waiting for cron
- Useful for development and debugging

## Deployment Process

### Local Development
```bash
# Install dependencies
npm install

# Start local development server
npm run start
# This uses wrangler dev to simulate Cloudflare environment locally
```

### Production Deployment
```bash
# Deploy to Cloudflare
npm run deploy
# This runs: wrangler deploy
```

### Configuration Files

**wrangler.toml**: Defines the worker configuration
```toml
name = "websocket-handler"
main = "src/index.ts"

# Environment variables
[vars]
GROQ_API_KEY = "your-groq-key"

# Durable Objects
[[durable_objects.bindings]]
name = "WEBSOCKET_HANDLER"
class_name = "WebSocketHandler"

# KV namespaces
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"

# Scheduled triggers
[triggers]
crons = ["*/10 * * * *"]  # Every 10 minutes
```

**package.json**: Defines scripts and dependencies
- `wrangler` for Cloudflare CLI
- TypeScript for type safety
- `@cloudflare/workers-types` for type definitions

## Key Concepts for Junior Developers

### Singleton Pattern with Durable Objects
We use `idFromName('singleton')` to ensure all requests go to the same Durable Object instance, maintaining shared state across all clients.

### WebSocket Pair
```typescript
const [client, server] = Object.values(new WebSocketPair());
```
- `client`: Returned to the HTTP response
- `server`: Handled by the Durable Object

### Mock vs Production
The code includes mock responses for local development:
```typescript
if (!env.GROQ_API_KEY || env.GROQ_API_KEY === 'your-groq-key') {
  return `Mock summary...`;
}
```

### Error Handling
- API calls include try/catch blocks
- WebSocket connections are cleaned up on close
- Logging helps with debugging

## Testing the Service

### WebSocket Client
Use `test-client.js` to connect and receive broadcasts:
```bash
node test-client.js
```

### Simulate Data
Use `simulate-data.js` to test with mock filings:
```bash
node simulate-data.js
```

### Manual Trigger
```bash
curl https://your-worker-url/test-scheduled
```

This architecture leverages Cloudflare's primitives to create a scalable, real-time SEC filing summarization service that can handle multiple concurrent WebSocket connections while processing data periodically.