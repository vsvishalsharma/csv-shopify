// Test Shopify Access Token
require('dotenv').config();
const axios = require('axios');

async function testAccessToken() {
  console.log('Testing Shopify Access Token...');
  
  // Get configuration
  const shopName = process.env.SHOPIFY_SHOP_NAME?.replace('.myshopify.com', '');
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  
  if (!shopName || !accessToken) {
    console.error('❌ Missing configuration:');
    if (!shopName) console.error('   - SHOPIFY_SHOP_NAME not set');
    if (!accessToken) console.error('   - SHOPIFY_ACCESS_TOKEN not set');
    console.error('\nPlease run create-env.js to set up your environment.');
    return;
  }
  
  console.log(`Shop: ${shopName}`);
  console.log(`Access Token: ${accessToken.substring(0, 4)}...${accessToken.substring(accessToken.length - 4)}`);
  
  try {
    // Make a simple request to verify the token
    const response = await axios.get(`https://${shopName}.myshopify.com/admin/api/2023-10/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken
      }
    });
    
    console.log('\n✅ Access token is valid!');
    console.log(`Shop details: ${response.data.shop.name} (${response.data.shop.myshopify_domain})`);
    console.log(`Plan: ${response.data.shop.plan_name}`);
  } catch (error) {
    console.error('\n❌ Access token validation failed:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Message: ${JSON.stringify(error.response.data)}`);
      
      if (error.response.status === 401) {
        console.error('\nPossible issues:');
        console.error('1. The access token is invalid or has expired');
        console.error('2. The token doesn\'t have the necessary scopes (read_products, etc.)');
        console.error('3. The token might be for a different shop than specified');
      } else if (error.response.status === 404) {
        console.error('\nThe shop name appears to be incorrect.');
        console.error(`Attempted to access: https://${shopName}.myshopify.com`);
      }
    } else if (error.request) {
      console.error('No response received from Shopify');
      console.error('This could be a network issue or Shopify API might be down');
    } else {
      console.error(`Error: ${error.message}`);
    }
  }
}

// Run the test
testAccessToken(); 