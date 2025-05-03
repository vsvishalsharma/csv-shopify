// Advanced Shopify Token Testing Script
require('dotenv').config();
const axios = require('axios');

async function testWithVariousApproaches() {
  console.log('===== Advanced Shopify Access Token Testing =====');
  
  // Get configuration
  const shopName = process.env.SHOPIFY_SHOP_NAME?.replace('.myshopify.com', '');
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  
  console.log(`Testing shop: ${shopName}`);
  console.log(`Using access token: ${accessToken?.substring(0, 4)}...${accessToken?.substring(accessToken?.length - 4)}`);
  
  // Approach 1: Basic X-Shopify-Access-Token header
  try {
    console.log('\n[TEST 1] Using X-Shopify-Access-Token header to access shop info');
    const response1 = await axios.get(`https://${shopName}.myshopify.com/admin/api/2023-10/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Success! Response:', response1.status);
  } catch (error) {
    console.log('❌ Failed with X-Shopify-Access-Token header');
    console.log(`Status: ${error.response?.status || 'Unknown'}`);
    console.log(`Message: ${JSON.stringify(error.response?.data || error.message)}`);
  }
  
  // Approach 2: Try with Basic Authentication
  try {
    console.log('\n[TEST 2] Using Basic Auth with API key and password');
    // In some cases, the access token can be used as a password with the API key
    const response2 = await axios.get(`https://${shopName}.myshopify.com/admin/api/2023-10/shop.json`, {
      auth: {
        username: apiKey,
        password: accessToken
      }
    });
    console.log('✅ Success! Response:', response2.status);
  } catch (error) {
    console.log('❌ Failed with Basic Auth');
    console.log(`Status: ${error.response?.status || 'Unknown'}`);
    console.log(`Message: ${JSON.stringify(error.response?.data || error.message)}`);
  }
  
  // Approach 3: Try using products endpoint instead of shop
  try {
    console.log('\n[TEST 3] Using different endpoint (products)');
    const response3 = await axios.get(`https://${shopName}.myshopify.com/admin/api/2023-10/products.json?limit=1`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Success! Response:', response3.status);
  } catch (error) {
    console.log('❌ Failed with products endpoint');
    console.log(`Status: ${error.response?.status || 'Unknown'}`);
    console.log(`Message: ${JSON.stringify(error.response?.data || error.message)}`);
  }
  
  // Approach 4: Use 2022-10 API version (older version might have different auth requirements)
  try {
    console.log('\n[TEST 4] Using older API version (2022-10)');
    const response4 = await axios.get(`https://${shopName}.myshopify.com/admin/api/2022-10/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Success! Response:', response4.status);
  } catch (error) {
    console.log('❌ Failed with older API version');
    console.log(`Status: ${error.response?.status || 'Unknown'}`);
    console.log(`Message: ${JSON.stringify(error.response?.data || error.message)}`);
  }
  
  // Approach 5: Check if store is password protected
  try {
    console.log('\n[TEST 5] Checking if storefront is password protected');
    const response5 = await axios.get(`https://${shopName}.myshopify.com`);
    console.log('✅ Storefront is accessible. Response:', response5.status);
    
    if (response5.data.includes('password')) {
      console.log('⚠️ The storefront might be password protected, but is accessible');
    }
  } catch (error) {
    console.log('❌ Error accessing storefront');
    console.log(`Status: ${error.response?.status || 'Unknown'}`);
    if (error.response?.data?.includes('password')) {
      console.log('⚠️ The store appears to be password protected');
    }
  }
  
  console.log('\n===== Test Complete =====');
  console.log('If all tests failed, potential issues:');
  console.log('1. Access token has expired or been revoked');
  console.log('2. Shop name is incorrect');
  console.log('3. The shop may be inactive or in development mode');
  console.log('4. The API version may not be compatible with this shop\'s current status');
  console.log('5. Your IP address may be restricted by Shopify');
}

// Run tests
testWithVariousApproaches(); 