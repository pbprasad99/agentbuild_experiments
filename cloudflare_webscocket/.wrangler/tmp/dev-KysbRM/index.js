var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-U7xOVz/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/index.ts
var WebSocketHandler = class {
  static {
    __name(this, "WebSocketHandler");
  }
  state;
  // State of the Durable Object, used for persistence
  connections = [];
  // Array of active WebSocket connections
  constructor(state) {
    this.state = state;
  }
  // Handles a new WebSocket session by adding it to connections and setting up event listeners
  async handleSession(websocket) {
    this.connections.push(websocket);
    websocket.accept();
    websocket.addEventListener("message", async (msg) => {
    });
    websocket.addEventListener("close", () => {
      this.connections = this.connections.filter((ws) => ws !== websocket);
    });
  }
  // Main fetch handler for the Durable Object, handles broadcast requests and WebSocket upgrades
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/broadcast") {
      const body = await request.json();
      await this.broadcast(JSON.stringify(body));
      return new Response("Broadcast sent", { status: 200 });
    }
    return this.webSocketHandler(request);
  }
  // Handles WebSocket upgrade requests
  async webSocketHandler(request) {
    const upgradeHeader = request.headers.get("Upgrade");
    console.log("DO webSocketHandler called, upgrade:", upgradeHeader);
    if (upgradeHeader !== "websocket") {
      return new Response("Expected websocket", { status: 400 });
    }
    const [client, server] = Object.values(new WebSocketPair());
    await this.handleSession(server);
    return new Response(null, {
      status: 101,
      // Switching Protocols status for WebSocket upgrade
      webSocket: client
      // Return the client-side WebSocket
    });
  }
  // Broadcasts a message to all active WebSocket connections
  async broadcast(message) {
    console.log("Broadcasting message to", this.connections.length, "connections");
    this.connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
};
async function fetchSEC8KFilings(env) {
  const response = await fetch("https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&CIK=&type=8-K&company=&dateb=&owner=include&start=0&count=10&output=atom");
  const text = await response.text();
  return [
    { id: "123", url: "https://www.sec.gov/example", content: "Sample 8-K content" }
  ];
}
__name(fetchSEC8KFilings, "fetchSEC8KFilings");
async function summarizeWithAI(filing, env) {
  console.log("GROQ_API_KEY present:", !!env.GROQ_API_KEY);
  if (!env.GROQ_API_KEY || env.GROQ_API_KEY === "your-groq-key") {
    console.log("Using mock AI response for local testing");
    return `Mock summary of filing ${filing.id}: This is a test summary for local development. The actual AI API would be called in production with a valid API key.`;
  }
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.GROQ_API_KEY}`,
      // Use Bearer token for authentication
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      // Specify the AI model to use
      messages: [{ role: "user", content: `Summarize this 8-K filing: ${filing.content}` }]
      // Prompt for summarization
    })
  });
  console.log("API response status:", response.status);
  console.log("API response ok:", response.ok);
  if (!response.ok) {
    const errorText = await response.text();
    console.error("API error response:", errorText);
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }
  try {
    const data = await response.json();
    console.log("Parsed data:", data);
    const typedData = data;
    if (!typedData.choices || !typedData.choices[0] || !typedData.choices[0].message) {
      throw new Error("Invalid response format from AI API");
    }
    return typedData.choices[0].message.content;
  } catch (error) {
    console.error("JSON parsing error:", error);
    throw error;
  }
}
__name(summarizeWithAI, "summarizeWithAI");
var src_default = {
  // Handle incoming HTTP requests to the worker
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/test-scheduled") {
      console.log("Triggering scheduled logic for testing");
      const filings = await fetchSEC8KFilings(env);
      for (const filing of filings) {
        const summary = await summarizeWithAI(filing, env);
        await env.CACHE.put(filing.id, summary);
        console.log("Summary stored:", summary);
      }
      return new Response("Scheduled logic executed", { status: 200 });
    }
    if (url.pathname === "/simulate" && request.method === "POST") {
      console.log("Processing simulated filing data");
      try {
        const filing = await request.json();
        const summary = await summarizeWithAI(filing, env);
        await env.CACHE.put(filing.id, summary);
        console.log("Simulated filing processed and stored:", summary);
        const id = env.WEBSOCKET_HANDLER.idFromName("singleton");
        const stub = env.WEBSOCKET_HANDLER.get(id);
        await stub.fetch(new Request("http://localhost/broadcast", {
          method: "POST",
          body: JSON.stringify({ filingId: filing.id, summary, company: filing.company, date: filing.date, eventType: filing.eventType }),
          headers: { "Content-Type": "application/json" }
        }));
        return new Response("Simulated filing processed and broadcast", { status: 200 });
      } catch (error) {
        console.error("Error processing simulated filing:", error);
        return new Response("Error processing simulated filing", { status: 500 });
      }
    }
    const upgradeHeader = request.headers.get("Upgrade");
    console.log("Request upgrade header:", upgradeHeader);
    if (upgradeHeader === "websocket") {
      console.log("Handling WebSocket upgrade");
      const id = env.WEBSOCKET_HANDLER.idFromName("singleton");
      const stub = env.WEBSOCKET_HANDLER.get(id);
      console.log("DO stub obtained");
      try {
        return await stub.fetch(request);
      } catch (error) {
        console.error("Error calling DO fetch:", error);
        throw error;
      }
    }
    return new Response("WebSocket endpoint", { status: 200 });
  },
  // Handle scheduled events (runs periodically based on cron configuration in wrangler.toml)
  // This is where the main business logic runs: fetch filings, summarize, cache, and broadcast
  async scheduled(event, env, ctx) {
    const filings = await fetchSEC8KFilings(env);
    for (const filing of filings) {
      const summary = await summarizeWithAI(filing, env);
      await env.CACHE.put(filing.id, summary);
      console.log("Summary stored for filing:", filing.id);
      const id = env.WEBSOCKET_HANDLER.idFromName("singleton");
      const stub = env.WEBSOCKET_HANDLER.get(id);
      await stub.fetch(new Request("http://localhost/broadcast", {
        method: "POST",
        body: JSON.stringify({ filingId: filing.id, summary }),
        // Send filing data
        headers: { "Content-Type": "application/json" }
      }));
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-U7xOVz/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-U7xOVz/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  WebSocketHandler,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
