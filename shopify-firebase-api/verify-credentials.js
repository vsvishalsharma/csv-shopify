// Shopify Credentials Verification Script
require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('Shopify API Credentials Verification');
console.log('===================================');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('❌ .env file not found');
  console.log('\nCreating a template .env file...');
  
  const envTemplate = `# Shopify API Credentials
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_SHOP_NAME=your_shop_name_here
SHOPIFY_ACCESS_TOKEN=your_access_token_here

# Server configuration
PORT=3000
`;
  
  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ Created .env template file.');
  console.log('Please edit this file with your actual Shopify credentials.');
  process.exit(1);
} else {
  console.log('✅ .env file exists');
}

// Check credentials
const requiredVars = ['SHOPIFY_API_KEY', 'SHOPIFY_API_SECRET', 'SHOPIFY_SHOP_NAME', 'SHOPIFY_ACCESS_TOKEN'];
const missingVars = [];

requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    missingVars.push(varName);
  } else if (process.env[varName].includes('your_') || process.env[varName] === '') {
    missingVars.push(`${varName} (contains placeholder value)`);
  }
});

if (missingVars.length > 0) {
  console.log('❌ Missing or invalid credentials:');
  missingVars.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  
  console.log('\nPlease update your .env file with the correct Shopify credentials.');
  console.log('\nHow to get your Shopify credentials:');
  console.log('1. Go to your Shopify admin portal');
  console.log('2. Navigate to Apps > Develop apps');
  console.log('3. Create a custom app or select an existing one');
  console.log('4. Under "API credentials", click "Configure Admin API" and add necessary scopes (read_products, etc.)');
  console.log('5. Install the app to your store to generate the access token');
  
  process.exit(1);
} else {
  console.log('✅ All required credentials are present');
}

// Additional checks on shop name format
let shopName = process.env.SHOPIFY_SHOP_NAME;
if (shopName.includes('.myshopify.com')) {
  console.log('ℹ️ Shop name includes .myshopify.com - will be automatically stripped in API calls');
  shopName = shopName.replace('.myshopify.com', '');
}

// Verify access token format
const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
if (accessToken.length < 10) {
  console.log('⚠️ Warning: Access token seems too short. Make sure you\'re using the full token');
}

console.log('\nShopify configuration:');
console.log(`- Shop: ${shopName}`);
console.log(`- Access Token: ${accessToken.substring(0, 4)}...${accessToken.substring(accessToken.length - 4)}`);

console.log('\n✅ Verification complete. Your environment appears to be properly configured.');
console.log('ℹ️ Note: This script only checks if credentials are present, not if they are valid.');
console.log('ℹ️ To test if your credentials work, run: node test-shopify.js'); 