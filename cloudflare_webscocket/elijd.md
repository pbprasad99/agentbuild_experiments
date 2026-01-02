Let me explain how the different serverless functions in your `index.ts` get deployed to Cloudflare, assuming you have no background knowledge of Cloudflare.

## What Happens During Deployment

When you run `npm run deploy` (which executes `wrangler deploy`), Cloudflare takes your entire codebase and deploys it across their global network of data centers. Here's what gets deployed:

## 1. **The Main Worker Script** (`src/index.ts`)

Your entire `index.ts` file gets uploaded and deployed as a single "Cloudflare Worker" - a serverless function that runs on Cloudflare's edge network (servers located all over the world).

```typescript
export default {
  async fetch(request, env) { /* HTTP request handler */ },
  async scheduled(event, env) { /* Cron job handler */ }
}
```

This single Worker handles:
- **HTTP requests** (like WebSocket upgrades, `/test-scheduled`, `/simulate`)
- **Scheduled tasks** (cron jobs that run periodically)

## 2. **Durable Objects** (WebSocket Handler)

The `WebSocketHandler` class gets deployed as a special type of Cloudflare service called a "Durable Object":

```typescript
export class WebSocketHandler {
  // This entire class becomes a Durable Object
}
```

**What are Durable Objects?**
- They're like persistent mini-servers that maintain state across requests
- Your WebSocket connections are managed by one Durable Object instance
- The same Durable Object handles all WebSocket connections for your app

## 3. **Storage Services** (KV Cache)

Your app gets connected to Cloudflare's key-value storage:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-id"
```

This creates a global database that your Worker can read/write from anywhere in the world.

## 4. **Environment Variables**

```toml
[vars]
GROQ_API_KEY = "your-groq-key"
```

These become available in your code as `env.GROQ_API_KEY`.

## Deployment Architecture

After deployment, your app runs like this:

```
🌍 Global Cloudflare Network
├── Worker (your index.ts code)
│   ├── HTTP Handler (fetch function)
│   └── Cron Handler (scheduled function)
├── Durable Object (WebSocketHandler class)
│   └── Manages WebSocket connections
└── KV Storage (CACHE)
    └── Stores AI summaries
```

## How Requests Are Routed

1. **WebSocket Connection**: `ws://your-app.workers.dev/` → Worker → Durable Object
2. **HTTP API Calls**: `https://your-app.workers.dev/test-scheduled` → Worker
3. **Cron Jobs**: Every 5 minutes → Worker's scheduled function
4. **Data Storage**: Worker reads/writes to KV storage globally

## The Magic of Serverless

- **No servers to manage**: Cloudflare handles all the infrastructure
- **Global distribution**: Your code runs in 200+ data centers worldwide
- **Auto-scaling**: Handles from 1 to millions of requests automatically
- **Pay per use**: You only pay for actual usage

## Configuration File (`wrangler.toml`)

This file tells Cloudflare:
- What your app is called (`name = "websocket-sec"`)
- Where your code is (`main = "src/index.ts"`)
- What services to connect to (Durable Objects, KV storage)
- When to run cron jobs (`crons = ["*/5 * * * *"]`)

## Summary

Your single `index.ts` file doesn't get split into separate functions - it gets deployed as one cohesive unit with access to various Cloudflare services. The different methods (`fetch`, `scheduled`) within your exported object become different entry points that Cloudflare can trigger based on the type of event (HTTP request vs. cron schedule).