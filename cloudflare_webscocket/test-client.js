#!/usr/bin/env node

/**
 * Comprehensive WebSocket Test Client for Cloudflare WebSocket Server
 *
 * This script tests the WebSocket server functionality including:
 * - WebSocket connection establishment
 * - Message handling and parsing
 * - Scheduled polling via /test-scheduled endpoint
 * - Error handling and connection management
 * - AI summary display
 * - Integration with data simulation script
 */

const WebSocket = require('ws');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Configuration
const CONFIG = {
  // Local development server
  localServer: 'http://localhost:8787',
  // Production server (update with your actual URL)
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

class WebSocketTestClient {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectCount = 0;
    this.messageCount = 0;
    this.serverUrl = CONFIG.mode === 'local' ? CONFIG.localServer : CONFIG.productionServer;
    this.wsUrl = this.serverUrl.replace('http', 'ws');
    this.messageTimeout = null;
  }

  /**
   * Initialize and start the test client
   */
  async start() {
    console.log('🚀 Starting WebSocket Test Client');
    console.log(`📡 Mode: ${CONFIG.mode.toUpperCase()}`);
    console.log(`🌐 Server URL: ${this.serverUrl}`);
    console.log(`🔌 WebSocket URL: ${this.wsUrl}`);
    console.log('─'.repeat(50));

    await this.connect();
    
    if (CONFIG.testScheduledEndpoint) {
      setTimeout(() => {
        this.testScheduledEndpoint();
      }, CONFIG.scheduledTestDelay);
    }

    // Set up cleanup on exit
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  /**
   * Establish WebSocket connection with retry logic
   */
  async connect() {
    try {
      console.log('🔌 Attempting WebSocket connection...');
      
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.on('open', () => {
        this.isConnected = true;
        this.reconnectCount = 0;
        console.log('✅ WebSocket connection established');
        console.log(`📍 Connected to: ${this.wsUrl}`);
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('close', (code, reason) => {
        this.isConnected = false;
        console.log(`❌ WebSocket connection closed: ${code} - ${reason.toString()}`);
        
        if (this.reconnectCount < CONFIG.reconnectAttempts) {
          this.reconnectCount++;
          console.log(`🔄 Attempting to reconnect (${this.reconnectCount}/${CONFIG.reconnectAttempts})...`);
          setTimeout(() => this.connect(), CONFIG.reconnectDelay);
        } else {
          console.log('❌ Maximum reconnection attempts reached. Exiting.');
          process.exit(1);
        }
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
      });

    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      if (this.reconnectCount < CONFIG.reconnectAttempts) {
        this.reconnectCount++;
        setTimeout(() => this.connect(), CONFIG.reconnectDelay);
      }
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(data) {
    this.messageCount++;
    console.log(`📨 Message #${this.messageCount} received`);
    
    try {
      const message = JSON.parse(data.toString());
      console.log('📋 Raw message:', JSON.stringify(message, null, 2));
      
      // Parse and display AI summary
      this.displayAISummary(message);
      
    } catch (error) {
      console.log('📄 Raw text message:', data.toString());
      console.log('⚠️  Could not parse as JSON');
    }
  }

  /**
   * Display AI summary in a formatted way
   */
  displayAISummary(message) {
    console.log('\n' + '='.repeat(60));
    console.log('🤖 AI SUMMARY RECEIVED');
    console.log('='.repeat(60));
    
    if (message.filingId) {
      console.log(`📄 Filing ID: ${message.filingId}`);
    }
    
    if (message.company) {
      console.log(`🏢 Company: ${message.company}`);
    }
    
    if (message.date) {
      console.log(`📅 Date: ${message.date}`);
    }
    
    if (message.eventType) {
      console.log(`🏷️  Event Type: ${message.eventType}`);
      if (message.eventDescription) {
        console.log(`📋 Event Description: ${message.eventDescription}`);
      }
    }
    
    if (message.summary) {
      console.log('📝 Summary:');
      console.log('-'.repeat(40));
      console.log(message.summary);
    } else if (message.content) {
      console.log('📝 Content:');
      console.log('-'.repeat(40));
      console.log(message.content);
    } else {
      console.log('📝 Message content:');
      console.log('-'.repeat(40));
      console.log(JSON.stringify(message, null, 2));
    }
    
    if (message.url) {
      console.log(`🔗 SEC Filing URL: ${message.url}`);
    }
    
    if (message.timestamp) {
      console.log(`⏰ Timestamp: ${message.timestamp}`);
    }
    
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Test the scheduled endpoint to trigger AI processing
   */
  async testScheduledEndpoint() {
    console.log('🧪 Testing scheduled endpoint...');
    console.log(`📡 Making request to: ${this.serverUrl}/test-scheduled`);
    
    try {
      const response = await fetch(`${this.serverUrl}/test-scheduled`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ Scheduled endpoint test successful');
        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        
        // Wait for potential WebSocket messages
        console.log(`⏳ Waiting up to ${CONFIG.maxMessageWaitTime / 1000} seconds for messages...`);
        
        this.messageTimeout = setTimeout(() => {
          console.log('⏰ Message wait timeout reached');
          this.checkForMessages();
        }, CONFIG.maxMessageWaitTime);
        
      } else {
        console.error('❌ Scheduled endpoint test failed');
        console.error(`📊 Status: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error('❌ Response:', errorText);
      }
      
    } catch (error) {
      console.error('❌ Scheduled endpoint test error:', error.message);
    }
  }

  /**
   * Check if any messages were received and provide summary
   */
  checkForMessages() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`🔌 Connection Status: ${this.isConnected ? 'Connected' : 'Disconnected'}`);
    console.log(`📨 Total Messages Received: ${this.messageCount}`);
    console.log(`🔄 Reconnection Attempts: ${this.reconnectCount}`);
    console.log('='.repeat(50));
    
    if (this.messageCount > 0) {
      console.log('✅ Test completed successfully - Messages received');
      console.log('💡 To test with simulated data:');
      console.log('   - Run: node simulate-data.js --mode local');
      console.log('   - This will generate realistic mock 8-K filings');
      console.log('   - Watch for different event types and company names');
    } else {
      console.log('⚠️  No messages received during test period');
      console.log('💡 This could be normal if:');
      console.log('   - The server is using mock data');
      console.log('   - No actual SEC filings were processed');
      console.log('   - The AI API returned empty responses');
      console.log('   - No data simulation script is running');
    }
    
    console.log('\n💡 Tips for further testing:');
    console.log('   - Check server logs for processing details');
    console.log('   - Verify WebSocket connections are established');
    console.log('   - Test with different endpoints if available');
    console.log('   - Monitor the /test-scheduled endpoint response');
    console.log('   - Use the simulate-data.js script for comprehensive testing');
    console.log('   - Try both real-time and batch simulation modes');
  }

  /**
   * Clean up resources and exit gracefully
   */
  cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
      console.log('🔌 WebSocket connection closed');
    }
    
    this.checkForMessages();
    console.log('✅ Test client exited gracefully');
    process.exit(0);
  }
}

/**
 * Command-line interface
 */
function showHelp() {
  console.log(`
🧪 WebSocket Test Client for Cloudflare WebSocket Server

Usage: node test-client.js [options]

Options:
  --mode <mode>           Test mode: 'local' or 'production' (default: local)
  --server <url>          Custom server URL (overrides mode setting)
  --no-scheduled          Skip scheduled endpoint testing
  --help, -h              Show this help message

Examples:
  node test-client.js --mode local
  node test-client.js --mode production
  node test-client.js --server https://my-custom-domain.workers.dev
  node test-client.js --mode local --no-scheduled

Data Simulation Integration:
  To test with simulated 8-K filing data:
  - Run: node simulate-data.js --mode local
  - This generates realistic mock filings with different event types
  - Watch for earnings releases, mergers, executive changes, etc.
  - Use --rate to control generation speed, --max for batch size
  - Use --batch for faster testing without delays

Environment:
  The script will connect to the WebSocket server and test:
  - WebSocket connection establishment
  - Message handling and parsing
  - Scheduled polling via /test-scheduled endpoint
  - AI summary display and formatting
  - Error handling and connection management
  - Integration with data simulation script

Notes:
  - For local testing, ensure the server is running with 'npm run start'
  - For production testing, update CONFIG.productionServer with your actual URL
  - The script will automatically retry connections on failure
  - Use simulate-data.js for comprehensive testing of the AI pipeline
  - Press Ctrl+C to exit gracefully
`);
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
    
    if (arg === '--mode' && args[i + 1]) {
      CONFIG.mode = args[i + 1];
      i++;
    }
    
    if (arg === '--server' && args[i + 1]) {
      CONFIG.productionServer = args[i + 1];
      CONFIG.mode = 'production'; // Force production mode when custom server is specified
      i++;
    }
    
    if (arg === '--no-scheduled') {
      CONFIG.testScheduledEndpoint = false;
    }
  }
  
  // Validate mode
  if (CONFIG.mode !== 'local' && CONFIG.mode !== 'production') {
    console.error('❌ Invalid mode. Use --mode local or --mode production');
    process.exit(1);
  }
}

// Main execution
async function main() {
  parseArgs();
  
  console.log('🧪 Cloudflare WebSocket Server Test Client');
  console.log('📖 Testing WebSocket functionality for AI summaries of SEC 8-K filings');
  console.log('');
  
  const client = new WebSocketTestClient();
  await client.start();
}

// Run the test client
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test client error:', error);
    process.exit(1);
  });
}

module.exports = { WebSocketTestClient, CONFIG };