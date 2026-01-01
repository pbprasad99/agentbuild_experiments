# Runbook for WebSocket Server on Cloudflare for AI Summaries of SEC 8-K Filings

This runbook provides step-by-step instructions for setting up, configuring, testing, and deploying the WebSocket server on Cloudflare. The server fetches SEC 8-K filings, summarizes them using Groq's API, caches summaries in Cloudflare KV, and broadcasts them to connected WebSocket clients via Durable Objects.

## Prerequisites

Before starting, ensure you have the following:

- **Node.js**: Version 16 or higher. Download from [nodejs.org](https://nodejs.org/).
- **npm**: Comes with Node.js. Ensure it's up to date (`npm install -g npm@latest`).
- **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com) and enable Cloudflare Workers.
- **Groq API Key**: Obtain from [Groq Console](https://console.groq.com/keys). You'll need credits for API usage.
- **Git**: For cloning the repository if not already available.
- **WebSocket Client**: For testing (e.g., browser console, Postman, or tools like `websocat`).
- **Basic Knowledge**: Familiarity with command-line interfaces, TypeScript, and Cloudflare Workers.

## Environment Setup

1. **Clone or Navigate to the Project**:
   - If cloning: `git clone <repository-url> cloudflare_webscocket` (replace with actual repo URL if applicable).
   - Navigate to the directory: `cd cloudflare_webscocket`.

2. **Install Dependencies**:
   - Run `npm install` to install all required packages as defined in `package.json`. This includes `@cloudflare/workers-types`, `typescript`, and `wrangler`.

3. **Verify Installation**:
   - Check Node.js version: `node --version`.
   - Check npm version: `npm --version`.
   - Ensure `wrangler` is available: `npx wrangler --version`.

## API Key Configuration

1. **Authenticate with Cloudflare**:
   - Run `npx wrangler auth login` and follow the prompts to log in to your Cloudflare account.

2. **Set Up Secrets**:
    - Set the Groq API key as a secret: `npx wrangler secret put GROQ_API_KEY`.
      - When prompted, enter your Groq API key.
    - This securely stores the key in Cloudflare's environment without exposing it in code.

3. **Configure Cloudflare KV Namespace**:
   - In the Cloudflare Dashboard, go to Workers > KV.
   - Create a new namespace (e.g., name it "websocket-cache").
   - Copy the Namespace ID.
   - Edit `wrangler.toml` and replace `"your-kv-id"` in the `kv_namespaces` section with your actual Namespace ID.
     - Example: `{ binding = "CACHE", id = "1234567890abcdef" }`.

4. **Verify Configuration**:
   - Run `npx wrangler whoami` to confirm authentication.
   - Check `wrangler.toml` for correct bindings and variables.

## Local Testing

1. **Start Local Development Server**:
   - Run `npm run start` (which executes `wrangler dev`).
   - This starts the server locally on `http://localhost:8787` (default port).

2. **Test WebSocket Connection**:
   - Use a WebSocket client to connect to `ws://localhost:8787`.
   - Example in browser console:
     ```javascript
     const ws = new WebSocket('ws://localhost:8787');
     ws.onopen = () => console.log('Connected');
     ws.onmessage = (event) => console.log('Received:', event.data);
     ```
   - You should see connection established. Note: In local mode, scheduled events (cron) may not trigger automatically.

3. **Test with Comprehensive Test Script**:
   - Use the provided test script for thorough testing:
     ```bash
     # Install test dependencies
     npm install
     
     # Run the test script (local mode)
     npm run test:local
     
     # Or run directly with Node.js
     node test-client.js --mode local
     ```
   - The test script will:
     - Connect to the WebSocket server
     - Handle connection events and errors
     - Listen for incoming messages
     - Trigger the `/test-scheduled` endpoint to test AI processing
     - Display received AI summaries in a formatted way
     - Provide connection statistics and test results

4. **Test Scheduled Function Manually** (if needed):
   - While `wrangler dev` is running, you can simulate a cron trigger by making a request to the local server with a specific header or using Wrangler's dev tools.
   - Alternatively, deploy first and test in production.

5. **Verify Functionality**:
   - Check console logs for any errors during startup.
   - Ensure no TypeScript compilation errors.
   - Review test script output for connection and message handling status.

## Deployment Steps

1. **Prepare for Deployment**:
   - Ensure all secrets and configurations are set as above.
   - Update `wrangler.toml` if needed (e.g., change name if deploying multiple versions).

2. **Deploy to Cloudflare**:
   - Run `npm run deploy` (which executes `wrangler deploy`).
   - Wrangler will build and deploy the Worker.
   - Note the deployed URL (e.g., `https://websocket-sec.your-subdomain.workers.dev`).

3. **Post-Deployment Verification**:
   - Visit the deployed URL in a browser; it should return "WebSocket endpoint".
   - Test WebSocket connection using the deployed URL (e.g., `wss://websocket-sec.your-subdomain.workers.dev`).
   - Monitor the Cloudflare Dashboard for any deployment errors.

4. **Enable Cron Triggers**:
   - Cron is configured in `wrangler.toml` to run every 5 minutes.
   - In production, this will trigger the `scheduled` function automatically to fetch and process filings.

## Monitoring and Maintenance

- **Logs**: Use `npx wrangler tail` to view real-time logs from the deployed Worker.
- **Dashboard**: Check Cloudflare Workers Dashboard for metrics, errors, and usage.
- **KV Management**: View cached summaries in the KV namespace via Dashboard.
- **Updates**: To redeploy changes, run `npm run deploy` again after code modifications.

## Troubleshooting Tips

### Common Issues

1. **Authentication Errors**:
   - Ensure `wrangler auth login` was successful.
   - Check if your Cloudflare account has Workers enabled.

2. **Secret Not Set**:
    - Run `npx wrangler secret list` to verify secrets.
    - Re-run `npx wrangler secret put GROQ_API_KEY` if missing.

3. **KV Namespace Errors**:
   - Confirm the Namespace ID in `wrangler.toml` matches the one in your Dashboard.
   - Ensure the binding name "CACHE" matches in code and config.

4. **WebSocket Connection Fails**:
   - Verify the URL (use `wss://` for secure WebSocket in production).
   - Check browser console for CORS or security errors.
   - Ensure the Worker is deployed and running.

5. **Groq API Errors**:
    - Check your Groq API key validity and credits.
    - Monitor rate limits (Groq has per-minute and per-day limits).
    - Review API responses in logs for error codes (e.g., 429 for rate limit).

6. **SEC API Issues**:
   - The code uses a mock for simplicity; in production, parse the actual RSS/XML from SEC.
   - SEC EDGAR may have rate limits; implement retries and backoff.

7. **Cron Not Triggering**:
   - Cron runs every 5 minutes as per `wrangler.toml`.
   - Check logs after the interval.
   - Manually trigger via Dashboard if needed.

8. **TypeScript/Compilation Errors**:
   - Run `npx tsc --noEmit` to check for type errors.
   - Ensure `@cloudflare/workers-types` is installed.

9. **Deployment Fails**:
   - Check for syntax errors in `src/index.ts`.
   - Ensure `compatibility_date` in `wrangler.toml` is valid (e.g., not in the future).

10. **Performance Issues**:
    - Durable Objects handle WebSocket state; monitor for high connection counts.
    - KV operations are fast, but avoid excessive reads/writes.

### Debugging Steps

- **Local Logs**: Use `console.log` in code and view in `wrangler dev` output.
- **Remote Logs**: `npx wrangler tail --format=pretty`.
- **Test Endpoints**: Use tools like curl for HTTP requests, websocat for WebSockets.
- **Environment Variables**: Double-check all bindings in `wrangler.toml` match the code.

### Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Groq API Docs](https://console.groq.com/docs)
- [SEC EDGAR API](https://www.sec.gov/edgar/searchedgar/accessing-edgar-data.htm)

## Test Script Usage

The `test-client.js` script provides comprehensive testing capabilities for the WebSocket server. It's designed to simulate real-world usage and validate all server functionality.

### Test Script Features

- **WebSocket Connection Management**: Establishes and maintains WebSocket connections with automatic reconnection
- **Message Handling**: Listens for and parses incoming messages, displaying AI summaries in a formatted manner
- **Scheduled Testing**: Automatically triggers the `/test-scheduled` endpoint to test AI processing
- **Error Handling**: Comprehensive error handling and connection management
- **Statistics and Reporting**: Provides detailed test results and connection statistics

### Running the Test Script

#### Local Testing
```bash
# Install dependencies (if not already done)
npm install

# Run test script for local server
npm run test:local
# or
node test-client.js --mode local
```

#### Production Testing
```bash
# Update CONFIG.productionServer in test-client.js with your actual URL
# Then run:
npm run test:prod
# or
node test-client.js --mode production
```

#### Custom Server Testing
```bash
# Test with a custom server URL
node test-client.js --server https://your-custom-domain.workers.dev
```

#### Advanced Options
```bash
# Skip scheduled endpoint testing
node test-client.js --mode local --no-scheduled

# Show help
node test-client.js --help
```

### Test Script Output

The test script provides detailed output including:

```
🚀 Starting WebSocket Test Client
📡 Mode: LOCAL
🌐 Server URL: http://localhost:8787
🔌 WebSocket URL: ws://localhost:8787
───────────────────────────────────────────────────
🔌 Attempting WebSocket connection...
✅ WebSocket connection established
📍 Connected to: ws://localhost:8787
🧪 Testing scheduled endpoint...
📡 Making request to: http://localhost:8787/test-scheduled
✅ Scheduled endpoint test successful
📊 Status: 200 OK
⏳ Waiting up to 30 seconds for messages...

============================================================
🤖 AI SUMMARY RECEIVED
============================================================
📄 Filing ID: 123
📝 Summary:
----------------------------------------
Mock summary of filing 123: This is a test summary for local development...
============================================================

📊 TEST SUMMARY
============================================================
🔌 Connection Status: Connected
📨 Total Messages Received: 1
🔄 Reconnection Attempts: 0
============================================================
✅ Test completed successfully - Messages received
```

### Test Script Configuration

Edit the `CONFIG` object in `test-client.js` to customize:

- **Server URLs**: Set local and production server addresses
- **Connection Settings**: Adjust reconnection attempts and delays
- **Test Behavior**: Configure message wait times and test options
- **Timeouts**: Set connection and message timeouts

### Troubleshooting Test Script Issues

1. **Connection Failed**:
   - Ensure the server is running (`npm run start`)
   - Check the server URL in the script
   - Verify WebSocket support in your environment

2. **No Messages Received**:
   - The server may be using mock data
   - Check server logs for processing details
   - Verify the `/test-scheduled` endpoint is working

3. **Reconnection Issues**:
   - Check network connectivity
   - Verify server is still running
   - Adjust reconnection settings in CONFIG

4. **JSON Parsing Errors**:
   - Check server message format
   - Verify message structure matches expectations

### Integration with CI/CD

The test script can be integrated into automated testing pipelines:

```bash
# Exit with error code if tests fail
node test-client.js --mode production || exit 1

# Run tests and capture output
node test-client.js --mode local > test-output.log 2>&1
```

If issues persist, check the Cloudflare Community or GitHub issues for similar problems.