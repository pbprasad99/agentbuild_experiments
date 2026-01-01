#!/usr/bin/env node

/**
 * Data Simulation Script for Cloudflare WebSocket Server
 * 
 * This script generates realistic mock 8-K filing data and streams it to the WebSocket server
 * for testing the AI summarization pipeline. It simulates the SEC EDGAR RSS feed format
 * and provides various types of 8-K events.
 */

const WebSocket = require('ws');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Configuration
const CONFIG = {
  // Server settings
  localServer: 'http://localhost:8787',
  productionServer: 'https://your-subdomain.workers.dev',
  mode: 'local',
  
  // Simulation settings
  dataGenerationRate: 5000, // 5 seconds between filings
  maxFilings: 50, // Maximum number of filings to generate
  enableRealTimeMode: true, // Generate data in real-time vs batch
  
  // Event types and their weights for realistic distribution
  eventTypes: [
    { type: 'EARNINGS_RELEASE', weight: 25, description: 'Quarterly earnings results' },
    { type: 'MERGER_ACQUISITION', weight: 15, description: 'Mergers and acquisitions' },
    { type: 'EXECUTIVE_CHANGES', weight: 20, description: 'Executive appointments and departures' },
    { type: 'FINANCIAL_STATEMENT', weight: 10, description: 'Financial statement restatements' },
    { type: 'LEGAL_PROCEEDINGS', weight: 10, description: 'Material legal proceedings' },
    { type: 'SECURITIES_OFFERING', weight: 8, description: 'Securities offerings' },
    { type: 'RELATED_PARTY_TRANSACTIONS', weight: 5, description: 'Related party transactions' },
    { type: 'REGULATION_FD', weight: 7, description: 'Regulation FD disclosures' }
  ],
  
  // Company names for realistic data
  companyNames: [
    'TechCorp Inc.', 'Global Industries Ltd.', 'Innovation Systems', 'Data Solutions Group',
    'Future Technologies', 'Alpha Manufacturing', 'Beta Services', 'Gamma Healthcare',
    'Delta Energy', 'Epsilon Finance', 'Zeta Retail', 'Eta Logistics', 'Theta Communications',
    'Iota Pharmaceuticals', 'Kappa Biotech', 'Lambda Software', 'Mu Automotive', 'Nu Aerospace'
  ],
  
  // Sample content templates for different event types
  contentTemplates: {
    EARNINGS_RELEASE: [
      'The company reported quarterly revenue of ${revenue} million, representing a ${growth}% increase from the same period last year. Net income was ${netIncome} million, or ${eps} per diluted share. The company also provided guidance for the next quarter.',
      'For the quarter ended ${date}, the company achieved record revenue of ${revenue} million, driven by strong performance in ${businessUnit} segment. Operating margin improved to ${margin}%. Cash flow from operations was ${cashFlow} million.',
      'The company announced financial results for the fiscal quarter, with revenue of ${revenue} million and adjusted EBITDA of ${ebitda} million. The company repurchased ${shares} million shares during the quarter and maintained its quarterly dividend.'
    ],
    MERGER_ACQUISITION: [
      'The company has entered into a definitive agreement to acquire ${targetCompany} for approximately ${dealValue} million in cash and stock. The transaction is expected to close in ${closingQuarter} and will be accretive to earnings within ${timeframe}.',
      'The company announced the completion of its acquisition of ${targetCompany}, a leading provider of ${industry} solutions. The acquisition strengthens the company\'s position in ${market} and is expected to generate ${synergies} million in annual cost synergies.',
      'The company has agreed to sell its ${businessUnit} division to ${buyer} for ${salePrice} million. The divestiture allows the company to focus on its core ${coreBusiness} operations and reduces debt by ${debtReduction} million.'
    ],
    EXECUTIVE_CHANGES: [
      'The company announced that ${executiveName} has been appointed as Chief Executive Officer, effective ${effectiveDate}. ${executiveName} succeeds ${previousExecutive} who is retiring after ${years} years of service.',
      'The company\'s Board of Directors has appointed ${executiveName} as Chief Financial Officer. ${executiveName} brings ${years} years of experience in ${industry} finance and previously served as ${previousRole} at ${previousCompany}.',
      'The company announced the departure of ${executiveName}, ${executiveTitle}, effective ${effectiveDate}. The company has initiated a search for a successor and ${interimExecutive} will serve as interim ${executiveTitle}.'
    ],
    FINANCIAL_STATEMENT: [
      'The company has determined that its previously issued financial statements for ${period} should no longer be relied upon due to ${reason}. The company is in the process of restating its financial results to correct the error.',
      'The company has identified material weaknesses in its internal control over financial reporting related to ${controlIssue}. Management is implementing remediation plans to address these weaknesses.',
      'The company has revised its financial results for ${period} to reflect the correction of an error in the application of accounting principles. The restatement affects ${affectedLineItems} and results in a ${adjustmentType} of ${adjustmentAmount} million.'
    ],
    LEGAL_PROCEEDINGS: [
      'The company has received a subpoena from ${regulatoryAgency} regarding its ${businessPractice}. The company is cooperating fully with the investigation and cannot predict the outcome at this time.',
      'The company is a defendant in a lawsuit filed by ${plaintiff} alleging ${allegation}. The company believes the claims are without merit and intends to defend itself vigorously.',
      'The company has reached a settlement in the matter of ${caseName} for ${settlementAmount} million. The settlement resolves all claims without any admission of wrongdoing.'
    ],
    SECURITIES_OFFERING: [
      'The company has completed an underwritten public offering of ${shares} million shares of common stock at a price of ${price} per share. The net proceeds of approximately ${netProceeds} million will be used for ${purpose}.',
      'The company has filed a shelf registration statement with the SEC to register the offering of up to ${amount} million of debt and equity securities. The company may offer and sell the securities from time to time.',
      'The company has granted the underwriters an option to purchase up to an additional ${additionalShares} million shares of common stock. The option is exercisable for ${optionPeriod} days.'
    ],
    RELATED_PARTY_TRANSACTIONS: [
      'The company has entered into a ${transactionType} with ${relatedParty}, a company controlled by ${executiveName}, the company\'s ${executiveTitle}. The transaction was approved by the independent members of the Board of Directors.',
      'The company has amended its agreement with ${relatedParty} regarding ${agreementDetails}. The amended terms are consistent with arm\'s length negotiations and reflect current market conditions.',
      'The company has received a loan of ${loanAmount} million from ${relatedParty} at an interest rate of ${interestRate}%. The loan matures on ${maturityDate} and is guaranteed by the company\'s assets.'
    ],
    REGULATION_FD: [
      'The company has made an oral presentation at the ${event} conference. A copy of the presentation materials has been posted to the company\'s investor relations website.',
      'The company has provided updated guidance during its quarterly earnings conference call. The company expects ${metric} to be in the range of ${range} for the fiscal year.',
      'The company has participated in meetings with investors and analysts. The company discussed its strategic initiatives and provided updates on ${topic}.'
    ]
  }
};

class DataSimulator {
  constructor() {
    this.filingCount = 0;
    this.isRunning = false;
    this.serverUrl = CONFIG.mode === 'local' ? CONFIG.localServer : CONFIG.productionServer;
  }

  /**
    * Start the data simulation
    */
   async start() {
     console.log('🚀 Starting Data Simulation Script');
     console.log(`📡 Mode: ${CONFIG.mode.toUpperCase()}`);
     console.log(`🌐 Server URL: ${this.serverUrl}`);
     console.log(`📊 Data Generation Rate: ${CONFIG.dataGenerationRate / 1000} seconds per filing`);
     console.log(`🎯 Maximum Filings: ${CONFIG.maxFilings}`);
     console.log('─'.repeat(60));

     await this.startSimulation();
   }

  /**
   * Start the data generation simulation
   */
  async startSimulation() {
    this.isRunning = true;
    console.log('🎬 Starting data generation simulation...');

    if (CONFIG.enableRealTimeMode) {
      await this.generateDataRealTime();
    } else {
      await this.generateDataBatch();
    }
  }

  /**
   * Generate data in real-time with delays
   */
  async generateDataRealTime() {
    for (let i = 0; i < CONFIG.maxFilings; i++) {
      if (!this.isRunning) break;

      const filing = this.generateMockFiling();
      await this.sendFiling(filing);
      
      if (i < CONFIG.maxFilings - 1) {
        console.log(`⏳ Waiting ${CONFIG.dataGenerationRate / 1000} seconds before next filing...`);
        await this.sleep(CONFIG.dataGenerationRate);
      }
    }

    console.log('✅ Data simulation completed');
    this.cleanup();
  }

  /**
   * Generate data in batch mode
   */
  async generateDataBatch() {
    const filings = [];
    for (let i = 0; i < CONFIG.maxFilings; i++) {
      filings.push(this.generateMockFiling());
    }

    console.log(`🎬 Sending ${CONFIG.maxFilings} filings in batch mode...`);
    for (const filing of filings) {
      await this.sendFiling(filing);
      await this.sleep(100); // Small delay between batch filings
    }

    console.log('✅ Batch data simulation completed');
    this.cleanup();
  }

  /**
   * Generate a mock 8-K filing
   */
  generateMockFiling() {
    const eventType = this.selectEventType();
    const company = this.selectCompany();
    const date = this.generateRandomDate();
    const filingId = this.generateFilingId();
    
    const content = this.generateContent(eventType, company, date);
    const summary = this.generateMockSummary(eventType, company, date);

    return {
      id: filingId,
      filingId: filingId,
      company: company,
      date: date,
      eventType: eventType.type,
      eventDescription: eventType.description,
      content: content,
      summary: summary,
      url: `https://www.sec.gov/Archives/edgar/data/${Math.floor(Math.random() * 1000000)}/${filingId}/000${filingId}.txt`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Select an event type based on weighted probabilities
   */
  selectEventType() {
    const totalWeight = CONFIG.eventTypes.reduce((sum, type) => sum + type.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const eventType of CONFIG.eventTypes) {
      random -= eventType.weight;
      if (random <= 0) {
        return eventType;
      }
    }
    
    return CONFIG.eventTypes[0]; // Fallback
  }

  /**
   * Select a random company
   */
  selectCompany() {
    return CONFIG.companyNames[Math.floor(Math.random() * CONFIG.companyNames.length)];
  }

  /**
   * Generate a random date within the last 30 days
   */
  generateRandomDate() {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    return date.toISOString().split('T')[0];
  }

  /**
   * Generate a unique filing ID
   */
  generateFilingId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${timestamp}${random}`;
  }

  /**
   * Generate realistic content based on event type
   */
  generateContent(eventType, company, date) {
    const templates = CONFIG.contentTemplates[eventType.type] || ['General filing content'];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    // Replace placeholders with realistic values
    return template
      .replace(/\$\{revenue\}/g, this.formatCurrency(Math.floor(Math.random() * 5000) + 1000))
      .replace(/\$\{growth\}/g, (Math.random() * 50 - 10).toFixed(1))
      .replace(/\$\{netIncome\}/g, this.formatCurrency(Math.floor(Math.random() * 1000) + 100))
      .replace(/\$\{eps\}/g, (Math.random() * 5).toFixed(2))
      .replace(/\$\{date\}/g, date)
      .replace(/\$\{margin\}/g, (Math.random() * 40 + 10).toFixed(1))
      .replace(/\$\{cashFlow\}/g, this.formatCurrency(Math.floor(Math.random() * 2000) + 500))
      .replace(/\$\{businessUnit\}/g, this.getRandomBusinessUnit())
      .replace(/\$\{dealValue\}/g, this.formatCurrency(Math.floor(Math.random() * 10000) + 500))
      .replace(/\$\{targetCompany\}/g, this.selectCompany())
      .replace(/\$\{closingQuarter\}/g, this.getRandomQuarter())
      .replace(/\$\{timeframe\}/g, this.getRandomTimeframe())
      .replace(/\$\{synergies\}/g, this.formatCurrency(Math.floor(Math.random() * 500) + 50))
      .replace(/\$\{executiveName\}/g, this.getRandomExecutiveName())
      .replace(/\$\{effectiveDate\}/g, this.generateRandomDate())
      .replace(/\$\{previousExecutive\}/g, this.getRandomExecutiveName())
      .replace(/\$\{years\}/g, Math.floor(Math.random() * 30 + 5).toString())
      .replace(/\$\{executiveTitle\}/g, this.getRandomExecutiveTitle())
      .replace(/\$\{previousRole\}/g, this.getRandomExecutiveTitle())
      .replace(/\$\{previousCompany\}/g, this.selectCompany())
      .replace(/\$\{interimExecutive\}/g, this.getRandomExecutiveName())
      .replace(/\$\{period\}/g, this.getRandomPeriod())
      .replace(/\$\{reason\}/g, this.getRandomReason())
      .replace(/\$\{controlIssue\}/g, this.getRandomControlIssue())
      .replace(/\$\{affectedLineItems\}/g, this.getRandomLineItems())
      .replace(/\$\{adjustmentType\}/g, Math.random() > 0.5 ? 'increase' : 'decrease')
      .replace(/\$\{adjustmentAmount\}/g, this.formatCurrency(Math.floor(Math.random() * 500) + 10))
      .replace(/\$\{regulatoryAgency\}/g, this.getRandomAgency())
      .replace(/\$\{businessPractice\}/g, this.getRandomBusinessPractice())
      .replace(/\$\{plaintiff\}/g, this.getRandomPlaintiff())
      .replace(/\$\{allegation\}/g, this.getRandomAllegation())
      .replace(/\$\{caseName\}/g, this.getRandomCaseName())
      .replace(/\$\{settlementAmount\}/g, this.formatCurrency(Math.floor(Math.random() * 1000) + 100))
      .replace(/\$\{shares\}/g, (Math.floor(Math.random() * 50) + 5).toString())
      .replace(/\$\{price\}/g, (Math.random() * 100 + 10).toFixed(2))
      .replace(/\$\{netProceeds\}/g, this.formatCurrency(Math.floor(Math.random() * 5000) + 1000))
      .replace(/\$\{purpose\}/g, this.getRandomPurpose())
      .replace(/\$\{amount\}/g, this.formatCurrency(Math.floor(Math.random() * 50000) + 1000))
      .replace(/\$\{optionPeriod\}/g, Math.floor(Math.random() * 60 + 30).toString())
      .replace(/\$\{additionalShares\}/g, (Math.floor(Math.random() * 10) + 1).toString())
      .replace(/\$\{transactionType\}/g, this.getRandomTransactionType())
      .replace(/\$\{relatedParty\}/g, this.selectCompany())
      .replace(/\$\{agreementDetails\}/g, this.getRandomAgreementDetails())
      .replace(/\$\{loanAmount\}/g, this.formatCurrency(Math.floor(Math.random() * 5000) + 500))
      .replace(/\$\{interestRate\}/g, (Math.random() * 10 + 3).toFixed(2))
      .replace(/\$\{maturityDate\}/g, this.generateRandomDate())
      .replace(/\$\{event\}/g, this.getRandomEvent())
      .replace(/\$\{metric\}/g, this.getRandomMetric())
      .replace(/\$\{range\}/g, this.getRandomRange())
      .replace(/\$\{topic\}/g, this.getRandomTopic());
  }

  /**
   * Generate a mock AI summary for testing
   */
  generateMockSummary(eventType, company, date) {
    const summaries = {
      EARNINGS_RELEASE: `The company reported strong quarterly results with revenue of $${Math.floor(Math.random() * 5000) + 1000} million, representing ${Math.floor(Math.random() * 30 + 5)}% growth year-over-year. Net income was $${Math.floor(Math.random() * 1000) + 100} million. The company maintained its guidance for the fiscal year.`,
      MERGER_ACQUISITION: `The company announced plans to acquire ${this.selectCompany()} in a deal valued at approximately $${Math.floor(Math.random() * 10000) + 500} million. The acquisition is expected to close in ${this.getRandomQuarter()} and will expand the company's presence in the ${this.getRandomIndustry()} market.`,
      EXECUTIVE_CHANGES: `The company appointed ${this.getRandomExecutiveName()} as ${this.getRandomExecutiveTitle()}. This leadership change is part of the company's succession planning and is not expected to impact the company's strategic direction.`,
      FINANCIAL_STATEMENT: `The company identified the need to restate its financial statements for ${this.getRandomPeriod()} due to ${this.getRandomReason()}. The restatement will result in a ${Math.random() > 0.5 ? 'material' : 'minor'} adjustment to previously reported earnings.`,
      LEGAL_PROCEEDINGS: `The company is involved in legal proceedings related to ${this.getRandomBusinessPractice()}. While the outcome is uncertain, management believes the matter will not have a material adverse effect on the company's financial position.`,
      SECURITIES_OFFERING: `The company completed a public offering of ${Math.floor(Math.random() * 50) + 5} million shares at $${(Math.random() * 100 + 10).toFixed(2)} per share, raising approximately $${Math.floor(Math.random() * 5000) + 1000} million in net proceeds.`,
      RELATED_PARTY_TRANSACTIONS: `The company engaged in transactions with related parties, including ${this.getRandomTransactionType()} with ${this.selectCompany()}. These transactions were approved by the independent members of the Board of Directors.`,
      REGULATION_FD: `During the ${this.getRandomEvent()}, the company provided updates on its ${this.getRandomTopic()}. Management discussed the company's strategic initiatives and reaffirmed its guidance for the fiscal year.`
    };

    return summaries[eventType.type] || `Mock summary for ${eventType.type} event at ${company} on ${date}.`;
  }

  /**
    * Send a filing to the server via HTTP POST to /simulate endpoint
    */
   async sendFiling(filing) {
     this.filingCount++;
     console.log(`📨 Sending filing #${this.filingCount}: ${filing.eventType} - ${filing.company}`);

     try {
       const response = await fetch(`${this.serverUrl}/simulate`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json'
         },
         body: JSON.stringify(filing)
       });

       if (response.ok) {
         console.log(`✅ Filing sent successfully`);
         const result = await response.text();
         console.log(`📊 Server response: ${result}`);

         // Display filing details
         console.log('📋 Filing Details:');
         console.log(`   ID: ${filing.filingId}`);
         console.log(`   Company: ${filing.company}`);
         console.log(`   Date: ${filing.date}`);
         console.log(`   Event: ${filing.eventType} - ${filing.eventDescription}`);
         console.log(`   Content: ${filing.content.substring(0, 100)}...`);
         console.log('─'.repeat(60));

       } else {
         console.error(`❌ Error sending filing: ${response.status} ${response.statusText}`);
         const errorText = await response.text();
         console.error(`❌ Response: ${errorText}`);
       }
     } catch (error) {
       console.error('❌ Error sending filing:', error.message);
     }
   }

  /**
   * Utility functions for generating realistic data
   */
  formatCurrency(amount) {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  }

  getRandomBusinessUnit() {
    const units = ['North America', 'EMEA', 'Asia Pacific', 'Consumer Division', 'Enterprise Division', 'Services Division'];
    return units[Math.floor(Math.random() * units.length)];
  }

  getRandomQuarter() {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    return quarters[Math.floor(Math.random() * quarters.length)];
  }

  getRandomTimeframe() {
    const timeframes = ['12-18 months', '18-24 months', '24-36 months', 'immediately'];
    return timeframes[Math.floor(Math.random() * timeframes.length)];
  }

  getRandomExecutiveName() {
    const names = ['John Smith', 'Jane Doe', 'Robert Johnson', 'Sarah Wilson', 'Michael Brown', 'Emily Davis'];
    return names[Math.floor(Math.random() * names.length)];
  }

  getRandomExecutiveTitle() {
    const titles = ['Chief Executive Officer', 'Chief Financial Officer', 'Chief Operating Officer', 'Chief Technology Officer', 'Chief Marketing Officer'];
    return titles[Math.floor(Math.random() * titles.length)];
  }

  getRandomPeriod() {
    const periods = ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'FY 2024', 'FY 2023'];
    return periods[Math.floor(Math.random() * periods.length)];
  }

  getRandomReason() {
    const reasons = ['an error in revenue recognition', 'incorrect application of accounting principles', 'misclassification of expenses', 'timing differences in revenue recognition'];
    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  getRandomControlIssue() {
    const issues = ['inadequate segregation of duties', 'insufficient documentation', 'lack of proper authorization controls', 'inadequate monitoring of financial reporting'];
    return issues[Math.floor(Math.random() * issues.length)];
  }

  getRandomLineItems() {
    const items = ['revenue, cost of goods sold, and operating expenses', 'accounts receivable and inventory', 'property, plant and equipment', 'intangible assets and goodwill'];
    return items[Math.floor(Math.random() * items.length)];
  }

  getRandomAgency() {
    const agencies = ['SEC', 'DOJ', 'FTC', 'CFTC', 'FINRA'];
    return agencies[Math.floor(Math.random() * agencies.length)];
  }

  getRandomBusinessPractice() {
    const practices = ['sales practices', 'accounting procedures', 'compliance protocols', 'risk management practices'];
    return practices[Math.floor(Math.random() * practices.length)];
  }

  getRandomPlaintiff() {
    const plaintiffs = ['a former employee', 'a competitor', 'a shareholder', 'a regulatory body', 'a customer'];
    return plaintiffs[Math.floor(Math.random() * plaintiffs.length)];
  }

  getRandomAllegation() {
    const allegations = ['breach of contract', 'securities fraud', 'antitrust violations', 'employment discrimination', 'intellectual property infringement'];
    return allegations[Math.floor(Math.random() * allegations.length)];
  }

  getRandomCaseName() {
    const cases = ['Smith v. Company', 'SEC v. Company', 'Doe v. Company', 'In re Company Securities Litigation'];
    return cases[Math.floor(Math.random() * cases.length)];
  }

  getRandomPurpose() {
    const purposes = ['general corporate purposes', 'debt repayment', 'acquisitions', 'working capital', 'capital expenditures'];
    return purposes[Math.floor(Math.random() * purposes.length)];
  }

  getRandomTransactionType() {
    const types = ['service agreement', 'supply contract', 'licensing agreement', 'joint venture agreement'];
    return types[Math.floor(Math.random() * types.length)];
  }

  getRandomAgreementDetails() {
    const details = ['terms of service for IT infrastructure', 'supply of raw materials', 'technology licensing', 'research and development collaboration'];
    return details[Math.floor(Math.random() * details.length)];
  }

  getRandomEvent() {
    const events = ['Annual Investor Conference', 'Quarterly Earnings Call', 'Industry Symposium', 'Analyst Day'];
    return events[Math.floor(Math.random() * events.length)];
  }

  getRandomMetric() {
    const metrics = ['revenue growth', 'operating margin', 'earnings per share', 'free cash flow'];
    return metrics[Math.floor(Math.random() * metrics.length)];
  }

  getRandomRange() {
    const ranges = ['$1.5B - $1.7B', '12% - 15%', '$2.50 - $2.75', '$500M - $600M'];
    return ranges[Math.floor(Math.random() * ranges.length)];
  }

  getRandomTopic() {
    const topics = ['digital transformation initiatives', 'expansion into new markets', 'product development roadmap', 'operational efficiency improvements'];
    return topics[Math.floor(Math.random() * topics.length)];
  }

  getRandomIndustry() {
    const industries = ['technology', 'healthcare', 'financial services', 'manufacturing', 'retail'];
    return industries[Math.floor(Math.random() * industries.length)];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
    * Clean up and exit
    */
   cleanup() {
     console.log('\n🧹 Cleaning up...');
     console.log(`📊 Total filings generated: ${this.filingCount}`);
     console.log('✅ Data simulation completed successfully');
     process.exit(0);
   }
}

/**
 * Command-line interface
 */
function showHelp() {
  console.log(`
🎬 Data Simulation Script for Cloudflare WebSocket Server

Usage: node simulate-data.js [options]

Options:
  --mode <mode>           Test mode: 'local' or 'production' (default: local)
  --server <url>          Custom server URL (overrides mode setting)
  --rate <ms>             Data generation rate in milliseconds (default: 5000)
  --max <count>           Maximum number of filings to generate (default: 50)
  --batch                 Use batch mode instead of real-time generation
  --help, -h              Show this help message

Examples:
  node simulate-data.js --mode local
  node simulate-data.js --mode production --rate 10000
  node simulate-data.js --server https://my-custom-domain.workers.dev --max 100
  node simulate-data.js --batch

Description:
  This script generates realistic mock 8-K filing data and streams it to the
  WebSocket server for testing the AI summarization pipeline. It simulates:
  
  - Realistic 8-K filing content with company names, dates, and event types
  - SEC EDGAR RSS feed format simulation
  - Different types of 8-K events (earnings, mergers, executive changes, etc.)
  - Configurable data generation rates
  - WebSocket streaming to test the AI summarization pipeline

Event Types Generated:
  - EARNINGS_RELEASE (25%): Quarterly earnings results
  - EXECUTIVE_CHANGES (20%): Executive appointments and departures  
  - MERGER_ACQUISITION (15%): Mergers and acquisitions
  - FINANCIAL_STATEMENT (10%): Financial statement restatements
  - LEGAL_PROCEEDINGS (10%): Material legal proceedings
  - SECURITIES_OFFERING (8%): Securities offerings
  - REGULATION_FD (7%): Regulation FD disclosures
  - RELATED_PARTY_TRANSACTIONS (5%): Related party transactions

Notes:
  - For local testing, ensure the server is running with 'npm run start'
  - For production testing, update CONFIG.productionServer with your actual URL
  - Press Ctrl+C to exit gracefully
  - The script will generate mock AI summaries for testing purposes
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
      CONFIG.mode = 'production';
      i++;
    }
    
    if (arg === '--rate' && args[i + 1]) {
      CONFIG.dataGenerationRate = parseInt(args[i + 1]);
      i++;
    }
    
    if (arg === '--max' && args[i + 1]) {
      CONFIG.maxFilings = parseInt(args[i + 1]);
      i++;
    }
    
    if (arg === '--batch') {
      CONFIG.enableRealTimeMode = false;
    }
  }
  
  // Validate mode
  if (CONFIG.mode !== 'local' && CONFIG.mode !== 'production') {
    console.error('❌ Invalid mode. Use --mode local or --mode production');
    process.exit(1);
  }
  
  // Validate rate
  if (CONFIG.dataGenerationRate < 1000) {
    console.error('❌ Rate must be at least 1000ms (1 second)');
    process.exit(1);
  }
  
  // Validate max filings
  if (CONFIG.maxFilings < 1 || CONFIG.maxFilings > 1000) {
    console.error('❌ Maximum filings must be between 1 and 1000');
    process.exit(1);
  }
}

// Main execution
async function main() {
  parseArgs();
  
  console.log('🎬 Cloudflare WebSocket Server Data Simulation');
  console.log('📖 Generating mock 8-K filing data for AI summarization testing');
  console.log('');
  
  const simulator = new DataSimulator();
  
  // Set up cleanup on exit
  process.on('SIGINT', () => simulator.cleanup());
  process.on('SIGTERM', () => simulator.cleanup());
  
  await simulator.start();
}

// Run the simulation
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Simulation error:', error);
    process.exit(1);
  });
}

module.exports = { DataSimulator, CONFIG };