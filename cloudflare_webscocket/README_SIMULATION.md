# Data Simulation Script for Cloudflare WebSocket Server

This document provides comprehensive information about the data simulation script that generates mock 8-K filing data for testing the AI summarization pipeline.

## Overview

The [`simulate-data.js`](simulate-data.js) script generates realistic mock 8-K filing data and streams it to the WebSocket server for testing the AI summarization pipeline. It simulates the SEC EDGAR RSS feed format and provides various types of 8-K events.

## Features

### 🎯 Realistic Data Generation
- **Company Names**: 18 different company names from various industries
- **Event Types**: 8 different 8-K event types with realistic distribution
- **Content Templates**: Industry-specific content templates for each event type
- **Date Generation**: Random dates within the last 30 days
- **Unique IDs**: Realistic filing IDs with timestamps

### 📊 Event Types and Distribution

| Event Type | Weight | Description | Examples |
|------------|--------|-------------|----------|
| EARNINGS_RELEASE | 25% | Quarterly earnings results | Revenue reports, EPS, guidance |
| EXECUTIVE_CHANGES | 20% | Executive appointments and departures | CEO changes, CFO appointments |
| MERGER_ACQUISITION | 15% | Mergers and acquisitions | Company acquisitions, divestitures |
| FINANCIAL_STATEMENT | 10% | Financial statement restatements | Accounting corrections, restatements |
| LEGAL_PROCEEDINGS | 10% | Material legal proceedings | Lawsuits, regulatory investigations |
| SECURITIES_OFFERING | 8% | Securities offerings | Stock offerings, bond issuances |
| REGULATION_FD | 7% | Regulation FD disclosures | Investor presentations, guidance updates |
| RELATED_PARTY_TRANSACTIONS | 5% | Related party transactions | Transactions with executives, affiliates |

### 🚀 Configuration Options

#### Basic Usage
```bash
# Local testing with default settings
node simulate-data.js --mode local

# Production testing
node simulate-data.js --mode production

# Custom server URL
node simulate-data.js --server https://my-custom-domain.workers.dev
```

#### Advanced Configuration
```bash
# Control data generation rate (5 seconds between filings)
node simulate-data.js --rate 5000

# Generate 100 filings instead of default 50
node simulate-data.js --max 100

# Use batch mode for faster testing
node simulate-data.js --batch

# Combine options
node simulate-data.js --mode local --rate 2000 --max 25 --batch
```

### 📋 Command Line Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--mode <mode>` | Test mode: 'local' or 'production' | 'local' | `--mode production` |
| `--server <url>` | Custom server URL | Based on mode | `--server https://example.com` |
| `--rate <ms>` | Data generation rate in milliseconds | 5000ms | `--rate 10000` |
| `--max <count>` | Maximum number of filings to generate | 50 | `--max 100` |
| `--batch` | Use batch mode instead of real-time | false | `--batch` |
| `--help, -h` | Show help message | - | `--help` |

## Message Format

The simulation script sends JSON messages in the following format:

```json
{
  "id": "17356789012345678",
  "filingId": "17356789012345678",
  "company": "TechCorp Inc.",
  "date": "2024-12-15",
  "eventType": "EARNINGS_RELEASE",
  "eventDescription": "Quarterly earnings results",
  "content": "The company reported quarterly revenue of $2,500 million...",
  "summary": "Mock summary of filing 17356789012345678: This is a test summary...",
  "url": "https://www.sec.gov/Archives/edgar/data/1234567/17356789012345678/00017356789012345678.txt",
  "timestamp": "2024-12-31T08:15:25.393Z"
}
```

## Integration with Test Client

The [`test-client.js`](test-client.js) has been enhanced to handle the simulated data stream:

### Enhanced Display Features
- **Company Information**: Displays company name and event details
- **Event Type**: Shows the type and description of the 8-K event
- **Filing Details**: Includes filing ID, date, and SEC URL
- **Timestamp**: Shows when the message was generated

### Usage with Test Client
```bash
# Terminal 1: Start the WebSocket server
cd cloudflare_webscocket
npm run start

# Terminal 2: Start the test client
node test-client.js --mode local

# Terminal 3: Start data simulation
node simulate-data.js --mode local
```

## Testing Scenarios

### 🧪 Basic Testing
1. Start the WebSocket server
2. Connect the test client
3. Run the simulation script
4. Observe the generated filings and summaries

### ⚡ Performance Testing
```bash
# Fast data generation for performance testing
node simulate-data.js --mode local --rate 1000 --max 200 --batch
```

### 📊 Event Type Testing
The script automatically generates different event types. To focus on specific types:
- Monitor the `eventType` field in received messages
- Each event type has unique content templates
- Different event types test different AI summarization scenarios

### 🔗 Integration Testing
```bash
# Test with production server
node simulate-data.js --mode production --server https://your-domain.workers.dev
```

## Content Templates

The script uses realistic content templates for each event type:

### Earnings Release Examples
- Revenue and earnings reports
- Guidance updates
- Segment performance details
- Share repurchase information

### Merger & Acquisition Examples
- Acquisition announcements
- Deal terms and conditions
- Expected synergies
- Closing timelines

### Executive Changes Examples
- New executive appointments
- Executive departures
- Succession planning
- Interim assignments

### Legal Proceedings Examples
- Regulatory investigations
- Litigation updates
- Settlement announcements
- Compliance matters

## Development and Customization

### Adding New Event Types
1. Add to the `eventTypes` array in [`CONFIG`](simulate-data.js:40)
2. Create content templates in [`contentTemplates`](simulate-data.js:100)
3. Update the weight distribution as needed

### Customizing Company Names
Modify the [`companyNames`](simulate-data.js:70) array to include your preferred company names.

### Adjusting Content Templates
Edit the templates in [`contentTemplates`](simulate-data.js:100) to match your specific testing requirements.

## Troubleshooting

### Common Issues

**WebSocket Connection Failed**
- Ensure the server is running: `npm run start`
- Check the server URL in the simulation script
- Verify firewall settings allow WebSocket connections

**No Messages Received**
- Confirm the test client is connected
- Check the simulation script is running
- Verify the data generation rate is appropriate

**Invalid Message Format**
- Ensure both scripts are using compatible message formats
- Check JSON parsing in the test client
- Verify required fields are present

### Debug Mode
Add console logging to the simulation script for debugging:
```javascript
console.log('Generated filing:', JSON.stringify(filing, null, 2));
```

## Best Practices

### 🎯 Testing Strategy
1. **Start Simple**: Begin with basic local testing
2. **Scale Up**: Increase data generation rate and volume
3. **Test Events**: Verify all event types are processed correctly
4. **Performance**: Test with high-volume batch generation
5. **Integration**: Test with production-like configurations

### 📈 Performance Considerations
- Use batch mode for high-volume testing
- Adjust data generation rate based on server capacity
- Monitor memory usage with large datasets
- Consider using production server for realistic load testing

### 🔧 Maintenance
- Regularly update company names and content templates
- Add new event types as needed
- Monitor for changes in WebSocket protocol
- Update dependencies as needed

## Dependencies

The simulation script requires:
- Node.js (version 14 or higher)
- [`ws`](https://www.npmjs.com/package/ws) package for WebSocket client
- [`node-fetch`](https://www.npmjs.com/package/node-fetch) for HTTP requests

Install dependencies:
```bash
cd cloudflare_webscocket
npm install ws node-fetch
```

## Contributing

When contributing to this project:
1. Follow the existing code style and patterns
2. Add comprehensive documentation for new features
3. Test thoroughly with different configurations
4. Update this README with any new functionality

## License

This simulation script is part of the Cloudflare WebSocket Server project. Please refer to the main project license for usage terms.