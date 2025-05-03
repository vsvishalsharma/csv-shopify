// Run API server with test shop configuration
require('dotenv').config();

// Override configuration for testing
process.env.SHOPIFY_SHOP_NAME = 'test-api1';

// Start the main app
require('./server.js'); 