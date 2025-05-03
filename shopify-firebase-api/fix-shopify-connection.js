#!/usr/bin/env node

/**
 * Shopify API Connection Troubleshooter
 * 
 * This script diagnoses and fixes common Shopify API connection issues.
 * It verifies your credentials, validates your store URL, and tests the API connection.
 */

const axios = require('axios');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n========================================');
console.log('Shopify API Connection Troubleshooter');
console.log('========================================\n');

// Get current environment variables
const shopName = process.env.SHOPIFY_SHOP_NAME || '';
const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
const apiVersion = process.env.SHOPIFY_API_VERSION || '2023-10';

console.log('Current configuration:');
console.log(`- Shop Name: ${shopName}`);
if (accessToken) {
  console.log(`- Access Token: ${accessToken.substring(0, 4)}...${accessToken.substring(accessToken.length - 4)}`);
} else {
  console.log('- Access Token: Not set');
}
console.log(`- API Version: ${apiVersion}`);

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('\n❌ .env file not found. Let\'s create one.');
  createNewEnvFile();
} else {
  console.log('\nTesting connection to Shopify API...');
  testConnection();
}

// Test the connection to Shopify API
async function testConnection() {
  // Try different shop URL formats
  const shopOptions = [
    // Standard format
    { 
      name: shopName,
      url: `https://${shopName}.myshopify.com/admin/api/${apiVersion}/shop.json`,
      desc: 'Standard shop name format'
    },
    // Without .myshopify.com (if already included)
    { 
      name: shopName.replace('.myshopify.com', ''),
      url: `https://${shopName.replace('.myshopify.com', '')}.myshopify.com/admin/api/${apiVersion}/shop.json`,
      desc: 'Removing redundant .myshopify.com suffix'
    }
  ];

  let success = false;
  
  for (const option of shopOptions) {
    try {
      console.log(`\nTrying: ${option.desc}`);
      console.log(`URL: ${option.url}`);
      
      const response = await axios({
        method: 'GET',
        url: option.url,
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Success! Connected to shop: ${response.data.shop.name}`);
      console.log(`Shop Domain: ${response.data.shop.domain}`);
      console.log(`Shop ID: ${response.data.shop.id}`);
      
      // If this connection worked, update the .env file
      await updateEnvFile({
        SHOPIFY_SHOP_NAME: option.name,
        SHOPIFY_ACCESS_TOKEN: accessToken
      });
      
      success = true;
      break;
    } catch (error) {
      console.log(`❌ ${option.desc} failed:`);
      
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Message: ${JSON.stringify(error.response.data)}`);
        
        if (error.response.status === 401) {
          console.log('Authentication error - your access token may be invalid');
        } else if (error.response.status === 404) {
          console.log('Shop not found - check your shop name');
        }
      } else if (error.request) {
        console.log('No response received - network issue or Shopify API might be down');
      } else {
        console.log(`Error: ${error.message}`);
      }
    }
  }

  if (!success) {
    console.log('\n❌ All connection attempts failed.');
    askForNewCredentials();
  } else {
    console.log('\n✅ Connection successful! Your credentials have been verified and updated.');
    console.log('You can now run the server with: npm start');
    rl.close();
  }
}

// Ask user for new credentials
function askForNewCredentials() {
  console.log('\nLet\'s fix your Shopify credentials:');
  
  rl.question('\nEnter your Shopify Shop Name (e.g. "your-store" without .myshopify.com): ', (newShopName) => {
    rl.question('Enter your Shopify Access Token: ', async (newToken) => {
      if (!newShopName || !newToken) {
        console.log('❌ Both shop name and access token are required.');
        rl.close();
        return;
      }
      
      // Format the shop name (remove myshopify.com if included)
      const formattedShopName = newShopName.replace('.myshopify.com', '');
      
      // Update the .env file with new credentials
      await updateEnvFile({
        SHOPIFY_SHOP_NAME: formattedShopName,
        SHOPIFY_ACCESS_TOKEN: newToken,
        SHOPIFY_API_VERSION: apiVersion || '2023-10',
        PORT: process.env.PORT || '3001'
      });
      
      console.log('\n✅ Credentials updated. Let\'s test the connection again...');
      
      // Test with the new credentials
      process.env.SHOPIFY_SHOP_NAME = formattedShopName;
      process.env.SHOPIFY_ACCESS_TOKEN = newToken;
      
      testConnection();
    });
  });
}

// Create a new .env file from scratch
function createNewEnvFile() {
  console.log('\nLet\'s create a new .env file with your Shopify credentials:');
  
  rl.question('\nEnter your Shopify Shop Name (e.g. "your-store" without .myshopify.com): ', (shopName) => {
    rl.question('Enter your Shopify Access Token: ', async (accessToken) => {
      if (!shopName || !accessToken) {
        console.log('❌ Both shop name and access token are required.');
        rl.close();
        return;
      }
      
      // Format the shop name (remove myshopify.com if included)
      const formattedShopName = shopName.replace('.myshopify.com', '');
      
      // Create the .env file with new credentials
      await updateEnvFile({
        SHOPIFY_SHOP_NAME: formattedShopName,
        SHOPIFY_ACCESS_TOKEN: accessToken,
        SHOPIFY_API_VERSION: '2023-10',
        PORT: '3001'
      });
      
      console.log('\n✅ .env file created. Let\'s test the connection...');
      
      // Set env vars for the current process
      process.env.SHOPIFY_SHOP_NAME = formattedShopName;
      process.env.SHOPIFY_ACCESS_TOKEN = accessToken;
      process.env.SHOPIFY_API_VERSION = '2023-10';
      
      testConnection();
    });
  });
}

// Update the .env file
async function updateEnvFile(vars) {
  let envContent = '';
  
  // Build environment variable content
  for (const [key, value] of Object.entries(vars)) {
    envContent += `${key}=${value}\n`;
  }
  
  // Write to the .env file
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ .env file has been updated with the working configuration.');
    return true;
  } catch (error) {
    console.error('❌ Error updating .env file:', error.message);
    return false;
  }
}

// Handle exit
rl.on('close', () => {
  console.log('\nTroubleshooter completed. Goodbye!');
  process.exit(0);
}); 