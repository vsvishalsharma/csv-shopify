// Script to create .env file for Shopify API
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(__dirname, '.env');

console.log('Shopify API .env File Creation Utility');
console.log('=====================================');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('\n⚠️ An .env file already exists. Overwriting it will replace your current credentials.');
  rl.question('Do you want to continue? (y/n): ', answer => {
    if (answer.toLowerCase() !== 'y') {
      console.log('Operation cancelled. Your .env file was not modified.');
      rl.close();
      return;
    }
    collectShopifyCredentials();
  });
} else {
  collectShopifyCredentials();
}

function collectShopifyCredentials() {
  console.log('\nPlease enter your Shopify API credentials:');
  
  let credentials = {
    SHOPIFY_API_KEY: '',
    SHOPIFY_API_SECRET: '',
    SHOPIFY_SHOP_NAME: '',
    SHOPIFY_ACCESS_TOKEN: '',
    PORT: '3000'
  };
  
  rl.question('\nShopify Shop Name (e.g. "your-store" without .myshopify.com): ', shopName => {
    credentials.SHOPIFY_SHOP_NAME = shopName.trim();
    
    rl.question('Shopify API Key: ', apiKey => {
      credentials.SHOPIFY_API_KEY = apiKey.trim();
      
      rl.question('Shopify API Secret: ', apiSecret => {
        credentials.SHOPIFY_API_SECRET = apiSecret.trim();
        
        rl.question('Shopify Access Token: ', accessToken => {
          credentials.SHOPIFY_ACCESS_TOKEN = accessToken.trim();
          
          rl.question('Server Port (default: 3000): ', port => {
            if (port.trim()) {
              credentials.PORT = port.trim();
            }
            
            createEnvFile(credentials);
            rl.close();
          });
        });
      });
    });
  });
}

function createEnvFile(credentials) {
  const envContent = `# Shopify API Credentials
SHOPIFY_API_KEY=${credentials.SHOPIFY_API_KEY}
SHOPIFY_API_SECRET=${credentials.SHOPIFY_API_SECRET}
SHOPIFY_SHOP_NAME=${credentials.SHOPIFY_SHOP_NAME}
SHOPIFY_ACCESS_TOKEN=${credentials.SHOPIFY_ACCESS_TOKEN}

# Server configuration
PORT=${credentials.PORT}
`;

  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ .env file created successfully!');
    console.log('\nNext steps:');
    console.log('1. Run "node verify-credentials.js" to verify your credentials');
    console.log('2. Run "node test-shopify.js" to test the Shopify API connection');
    console.log('3. Start the server with "npm start"');
  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
  }
}

// Handle exit events
rl.on('close', () => {
  console.log('\nThank you for setting up the Shopify API!');
  process.exit(0);
}); 