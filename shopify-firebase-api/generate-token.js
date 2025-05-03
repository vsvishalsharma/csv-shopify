// Shopify Access Token Generation Guide
require('dotenv').config();
const fs = require('fs');
const path = require('path');

function generateTokenGuide() {
  console.log('===== Shopify Access Token Generation Guide =====');
  
  // Get API credentials
  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  const shopName = process.env.SHOPIFY_SHOP_NAME?.replace('.myshopify.com', '');
  
  if (!shopName || !apiKey || !apiSecret) {
    console.log('❌ Missing credentials in .env file. Please ensure you have:');
    if (!shopName) console.log('  - SHOPIFY_SHOP_NAME');
    if (!apiKey) console.log('  - SHOPIFY_API_KEY');
    if (!apiSecret) console.log('  - SHOPIFY_API_SECRET');
    console.log('\nRun "node create-env.js" to set up your credentials.\n');
    return;
  }
  
  console.log('\nTo generate a new access token, follow these steps:');
  console.log('\n1. Create a custom app in your Shopify admin:');
  console.log('   a. Log in to your Shopify admin');
  console.log('   b. Go to Apps > Develop apps');
  console.log('   c. Click "Create an app"');
  console.log('   d. Name your app (e.g., "API Integration")');
  console.log('   e. Set app URL to: http://localhost:3000');
  console.log('   f. Set redirect URL to: http://localhost:3000/auth/callback');
  
  console.log('\n2. Configure API scopes:');
  console.log('   a. Under "Admin API permissions", click "Configure"');
  console.log('   b. Add these recommended scopes:');
  console.log('      - read_products, write_products');
  console.log('      - read_orders (if needed)');
  console.log('      - read_customers (if needed)');
  
  console.log('\n3. Install the app to generate a token:');
  console.log('   a. Click "Install app" to install it to your store');
  console.log('   b. After installation, go to "API credentials" tab');
  console.log('   c. Find the "Admin API access token" section');
  console.log('   d. Copy the access token (it starts with "shpat_")');
  
  console.log('\n4. Update your .env file:');
  console.log('   a. Run "node update-access-token.js"');
  console.log('   b. Paste your new access token when prompted');
  
  console.log('\n5. Test your new token:');
  console.log('   a. Run "node test-access-token.js" to verify the token works');
  
  console.log('\nNotes:');
  console.log('- Access tokens for custom apps don\'t expire unless revoked');
  console.log('- If you need a new token, you can uninstall and reinstall the app');
  console.log('- Make sure your app has the necessary scopes for your API calls');
  console.log('- Some API endpoints require specific scopes or paid Shopify plans');
  
  // Check if token is in expected format
  const currentToken = process.env.SHOPIFY_ACCESS_TOKEN;
  if (currentToken && !currentToken.startsWith('shpat_')) {
    console.log('\n⚠️ Warning: Your current access token doesn\'t start with "shpat_"');
    console.log('This suggests it might not be a valid Admin API access token.');
    console.log('Custom app tokens should start with "shpat_".');
  }
}

// Run the guide
generateTokenGuide(); 