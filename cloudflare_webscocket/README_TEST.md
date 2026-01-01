# WebSocket Test Client

This directory contains a comprehensive test script (`test-client.js`) for testing the Cloudflare WebSocket server that handles AI summaries of SEC 8-K filings.

## Overview

The test client simulates real-world usage of the WebSocket server by:

- Establishing WebSocket connections
- Handling connection events and errors
- Listening for incoming AI summary messages
- Testing the scheduled polling functionality
- Providing detailed test results and statistics

## Prerequisites

- Node.js (version 16 or higher)
- The WebSocket server must be running (local or deployed)

## Installation

Install the required dependencies:

```bash
npm install
```

This will install:
- `ws`: WebSocket client library for Node.js
- `node-fetch`: HTTP client for making requests to the server

## Usage

### Basic Usage

```bash
# Test against local development server
node test-client.js --mode local

# Test against production server (update CONFIG.productionServer first)
node test-client.js --mode production
```

### Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--mode <mode>` | Test mode: 'local' or 'production' | 'local' |
| `--server <url>` | Custom server URL (overrides mode) | - |
| `--no-scheduled` | Skip scheduled endpoint testing | false |
| `--help`, `-h` | Show help message | - |

### Examples

```bash
# Test local server with default settings
npm run test:local

# Test production server
npm run test:prod

# Test with custom server URL
node test-client.js --server https://my-custom-domain.workers.dev

# Test local server without scheduled endpoint testing
node test-client.js --mode local --no-scheduled

# Show help
node test-client.js --help
```

## Configuration

Edit the `CONFIG` object in `test-client.js` to customize behavior:

```javascript
const CONFIG = {
  // Server URLs
  localServer: 'http://localhost:8787',
  productionServer: 'https://your-subdomain.workers.dev',
  
  // Test mode: 'local' or 'production'
  mode: 'local',
  
  // Connection settings
  reconnectAttempts: 5,
  reconnectDelay: 3000, // 3 seconds
  
  // Test settings
  testScheduledEndpoint: true,
  scheduledTestDelay: 2000, // 2 seconds after connection
  maxMessageWaitTime: 30000, // 30 seconds to wait for messages
};
```

## Test Process

1. **Connection Phase**: The script attempts to connect to the WebSocket server
2. **Scheduled Testing**: After connection, it triggers the `/test-scheduled` endpoint
3. **Message Monitoring**: Waits for and processes incoming messages
4. **Results Display**: Shows formatted AI summaries and test statistics
5. **Cleanup**: Gracefully closes connections on exit

## Expected Output

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

## Message Format

The test client expects messages in JSON format:

```json
{
  "filingId": "123",
  "summary": "AI-generated summary of the SEC filing..."
}
```

If the message is not valid JSON, it will be displayed as raw text.

## Error Handling

The test client includes comprehensive error handling for:

- Connection failures
- WebSocket errors
- HTTP request failures
- Message parsing errors
- Reconnection attempts

## Troubleshooting

### Connection Issues

- **Error**: "WebSocket connection failed"
  - **Solution**: Ensure the server is running and accessible
  - **Check**: Verify the server URL in CONFIG

- **Error**: "Maximum reconnection attempts reached"
  - **Solution**: Check server status and network connectivity
  - **Check**: Verify firewall settings allow WebSocket connections

### No Messages Received

- **Issue**: Test completes but no messages are received
  - **Possible Causes**:
    - Server is using mock data that doesn't trigger messages
    - AI API is not configured or has no credits
    - Scheduled endpoint is not properly configured
  - **Solution**: Check server logs for processing details

### JSON Parsing Errors

- **Error**: "Could not parse as JSON"
  - **Solution**: Check server message format
  - **Check**: Verify the server is sending valid JSON

## Integration with CI/CD

The test script can be integrated into automated testing pipelines:

```bash
# Exit with error code if tests fail
node test-client.js --mode production || exit 1

# Run tests and capture output
node test-client.js --mode local > test-output.log 2>&1

# Use in GitHub Actions
- name: Test WebSocket Server
  run: |
    npm install
    node test-client.js --mode production
```

## Development

The test client is built using:

- **Node.js**: Runtime environment
- **ws**: WebSocket client library
- **node-fetch**: HTTP client library
- **ES6+**: Modern JavaScript features

## Contributing

When modifying the test client:

1. Test changes against both local and production environments
2. Ensure backward compatibility with existing server implementations
3. Update this README if new features or options are added
4. Follow the existing code style and patterns

## License

This test client is part of the Cloudflare WebSocket SEC project.