/// <reference types="@cloudflare/workers-types" />

// Environment interface defining the bindings available in the Cloudflare Worker
// These are configured in wrangler.toml and provide access to Durable Objects, KV storage, and API keys
interface Env {
  WEBSOCKET_HANDLER: DurableObjectNamespace; // Namespace for WebSocket handling Durable Objects
  CACHE: KVNamespace; // Key-Value store for caching summaries
  GROQ_API_KEY: string; // API key for Groq AI service
}

// Durable Object class for managing WebSocket connections
// Durable Objects provide persistent state and coordination across requests
export class WebSocketHandler {
  state: DurableObjectState; // State of the Durable Object, used for persistence
  connections: WebSocket[] = []; // Array of active WebSocket connections

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  // Handles a new WebSocket session by adding it to connections and setting up event listeners
  async handleSession(websocket: WebSocket) {
    this.connections.push(websocket); // Add the WebSocket to the list of active connections
    websocket.accept(); // Accept the WebSocket connection
    websocket.addEventListener('message', async (msg) => {
      // Handle incoming messages if needed (currently no-op)
    });
    websocket.addEventListener('close', () => {
      // Remove the WebSocket from connections when it closes
      this.connections = this.connections.filter(ws => ws !== websocket);
    });
  }

  // Main fetch handler for the Durable Object, handles broadcast requests and WebSocket upgrades
  async fetch(request: Request) {
    const url = new URL(request.url);
    if (url.pathname === '/broadcast') {
      // Handle broadcast requests by sending the message to all connected clients
      const body = await request.json();
      await this.broadcast(JSON.stringify(body));
      return new Response('Broadcast sent', { status: 200 });
    }
    // Otherwise, handle WebSocket upgrade
    return this.webSocketHandler(request);
  }

  // Handles WebSocket upgrade requests
  async webSocketHandler(request: Request) {
    const upgradeHeader = request.headers.get('Upgrade');
    console.log('DO webSocketHandler called, upgrade:', upgradeHeader);
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected websocket', { status: 400 });
    }
    // Create a WebSocket pair: client side for the response, server side for handling
    const [client, server] = Object.values(new WebSocketPair());
    await this.handleSession(server); // Handle the server-side WebSocket
    return new Response(null, {
      status: 101, // Switching Protocols status for WebSocket upgrade
      webSocket: client, // Return the client-side WebSocket
    });
  }

  // Broadcasts a message to all active WebSocket connections
  async broadcast(message: string) {
    console.log('Broadcasting message to', this.connections.length, 'connections');
    this.connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message); // Send message only if connection is open
      }
    });
  }
}

// Fetches recent 8-K filings from the SEC EDGAR database
// 8-K filings are important company announcements required by the SEC
// This function uses the SEC's RSS feed to get recent filings
async function fetchSEC8KFilings(env: Env): Promise<any[]> {
  // Fetch recent 8-K filings from SEC EDGAR RSS feed
  // The URL queries for current 8-K filings, limited to 10 most recent
  const response = await fetch('https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&CIK=&type=8-K&company=&dateb=&owner=include&start=0&count=10&output=atom');
  const text = await response.text();
  // Note: In a real implementation, you would parse the XML/RSS response to extract filing details
  // For simplicity in this demo, we're returning mock data instead of parsing XML
  return [
    { id: '123', url: 'https://www.sec.gov/example', content: 'Sample 8-K content' }
  ];
}

// Summarizes a SEC filing using AI (Groq API)
// This function handles both production API calls and mock responses for local development
async function summarizeWithAI(filing: any, env: Env): Promise<string> {
  console.log('GROQ_API_KEY present:', !!env.GROQ_API_KEY);
  // Check if API key is configured; if not or it's the default placeholder, use mock response
  // This allows the app to run locally without requiring a real API key
  if (!env.GROQ_API_KEY || env.GROQ_API_KEY === 'your-groq-key') {
    console.log('Using mock AI response for local testing');
    return `Mock summary of filing ${filing.id}: This is a test summary for local development. The actual AI API would be called in production with a valid API key.`;
  }

  // Make API call to Groq for AI-powered summarization
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GROQ_API_KEY}`, // Use Bearer token for authentication
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192', // Specify the AI model to use
      messages: [{ role: 'user', content: `Summarize this 8-K filing: ${filing.content}` }] // Prompt for summarization
    })
  });
  console.log('API response status:', response.status);
  console.log('API response ok:', response.ok);
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API error response:', errorText);
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }
  try {
    const data = await response.json();
    console.log('Parsed data:', data);
    const typedData = data as any;
    // Validate the response structure to ensure we have the expected data
    if (!typedData.choices || !typedData.choices[0] || !typedData.choices[0].message) {
      throw new Error('Invalid response format from AI API');
    }
    return typedData.choices[0].message.content; // Extract the summary from the response
  } catch (error) {
    console.error('JSON parsing error:', error);
    throw error;
  }
}

// Default export for the Cloudflare Worker
// This object contains the handlers for fetch requests and scheduled events
export default {
  // Handle incoming HTTP requests to the worker
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname === '/test-scheduled') {
      // Endpoint for testing the scheduled logic manually
      console.log('Triggering scheduled logic for testing');
      const filings = await fetchSEC8KFilings(env); // Fetch recent SEC filings
      for (const filing of filings) {
        const summary = await summarizeWithAI(filing, env); // Generate AI summary
        await env.CACHE.put(filing.id, summary); // Store summary in KV cache
        console.log('Summary stored:', summary);
        // Broadcast is commented out for now to avoid issues during testing
        // const id = env.WEBSOCKET_HANDLER.idFromName('singleton');
        // const stub = env.WEBSOCKET_HANDLER.get(id);
        // await stub.broadcast(JSON.stringify({ filingId: filing.id, summary }));
      }
      return new Response('Scheduled logic executed', { status: 200 });
    }
    if (url.pathname === '/simulate' && request.method === 'POST') {
      // Endpoint for simulating filing data (used by simulate-data.js)
      console.log('Processing simulated filing data');
      try {
        const filing = await request.json() as any; // Get the simulated filing data
        const summary = await summarizeWithAI(filing, env); // Generate AI summary
        await env.CACHE.put(filing.id, summary); // Store summary in KV cache
        console.log('Simulated filing processed and stored:', summary);

        // Broadcast the summary to all connected WebSocket clients
        const id = env.WEBSOCKET_HANDLER.idFromName('singleton');
        const stub = env.WEBSOCKET_HANDLER.get(id);
        await stub.fetch(new Request('http://localhost/broadcast', {
          method: 'POST',
          body: JSON.stringify({ filingId: filing.id, summary, company: filing.company, date: filing.date, eventType: filing.eventType }),
          headers: { 'Content-Type': 'application/json' }
        }));

        return new Response('Simulated filing processed and broadcast', { status: 200 });
      } catch (error) {
        console.error('Error processing simulated filing:', error);
        return new Response('Error processing simulated filing', { status: 500 });
      }
    }
    const upgradeHeader = request.headers.get('Upgrade');
    console.log('Request upgrade header:', upgradeHeader);
    if (upgradeHeader === 'websocket') {
      // Handle WebSocket upgrade requests by routing to the Durable Object
      console.log('Handling WebSocket upgrade');
      const id = env.WEBSOCKET_HANDLER.idFromName('singleton'); // Get or create singleton DO instance
      const stub = env.WEBSOCKET_HANDLER.get(id); // Get the DO stub for interaction
      console.log('DO stub obtained');
      try {
        return await stub.fetch(request); // Delegate to DO's fetch handler
      } catch (error) {
        console.error('Error calling DO fetch:', error);
        throw error;
      }
    }
    // Default response for non-WebSocket, non-test requests
    return new Response('WebSocket endpoint', { status: 200 });
  },

  // Handle scheduled events (runs periodically based on cron configuration in wrangler.toml)
  // This is where the main business logic runs: fetch filings, summarize, cache, and broadcast
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const filings = await fetchSEC8KFilings(env); // Get recent SEC filings
    for (const filing of filings) {
      const summary = await summarizeWithAI(filing, env); // Generate AI summary
      await env.CACHE.put(filing.id, summary); // Cache the summary for future retrieval
      console.log('Summary stored for filing:', filing.id);
      // Broadcast the new filing summary to all connected WebSocket clients
      const id = env.WEBSOCKET_HANDLER.idFromName('singleton'); // Get the singleton DO instance
      const stub = env.WEBSOCKET_HANDLER.get(id); // Get DO stub
      // Use the DO's broadcast method by making a POST request to its /broadcast endpoint
      await stub.fetch(new Request('http://localhost/broadcast', {
        method: 'POST',
        body: JSON.stringify({ filingId: filing.id, summary }), // Send filing data
        headers: { 'Content-Type': 'application/json' }
      }));
    }
  }
};