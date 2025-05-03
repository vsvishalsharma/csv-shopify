const axios = require('axios');
require('dotenv').config();

// Shopify GraphQL API configuration
const SHOPIFY_SHOP_NAME = process.env.SHOPIFY_SHOP_NAME;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = '2023-10';

// Normalize shop name
const normalizedShopName = SHOPIFY_SHOP_NAME?.replace('.myshopify.com', '') || '';
const SHOPIFY_GRAPHQL_URL = `https://${normalizedShopName}.myshopify.com/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

async function testGraphQLConnection() {
  console.log('\n=== Testing Shopify GraphQL API Connection ===\n');
  console.log('Shop Name:', normalizedShopName);
  console.log('API Version:', SHOPIFY_API_VERSION);
  console.log('GraphQL URL:', SHOPIFY_GRAPHQL_URL);
  
  // Simple query to get shop information
  const query = `
    query {
      shop {
        name
        myshopifyDomain
        plan {
          displayName
        }
      }
    }
  `;
  
  try {
    console.log('\nSending test GraphQL query...');
    const response = await axios({
      url: SHOPIFY_GRAPHQL_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
      },
      data: { query }
    });
    
    console.log('\n✅ GraphQL connection successful!\n');
    const shopInfo = response.data.data.shop;
    console.log('Shop Information:');
    console.log(`- Name: ${shopInfo.name}`);
    console.log(`- Domain: ${shopInfo.myshopifyDomain}`);
    console.log(`- Plan: ${shopInfo.plan.displayName}`);
    
    // Try to get product count
    console.log('\nFetching product count...');
    const productCountQuery = `
      query {
        products(first: 1) {
          edges {
            node {
              id
            }
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;
    
    const productResponse = await axios({
      url: SHOPIFY_GRAPHQL_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
      },
      data: { query: productCountQuery }
    });
    
    if (productResponse.data.data.products.edges.length > 0) {
      console.log('✅ Successfully found at least one product.');
      console.log('✅ Your GraphQL API is working properly!');
    } else {
      console.log('⚠️ No products found in your shop. This is not an error, but you need products to use the sync feature.');
    }
    
    return true;
  } catch (error) {
    console.error('\n❌ GraphQL connection failed!');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        console.error('\nAuthentication error - your access token may be invalid or expired.');
        console.error('Make sure your SHOPIFY_ACCESS_TOKEN in the .env file is correct and has the necessary permissions.');
      } else if (error.response.status === 404) {
        console.error('\nEndpoint not found - check your shop name.');
        console.error(`Attempted to access: ${SHOPIFY_GRAPHQL_URL}`);
        console.error('Make sure your SHOPIFY_SHOP_NAME in the .env file is correct.');
      }
    } else if (error.request) {
      console.error('No response received from Shopify API.');
      console.error('This could be a network issue or Shopify API might be down.');
    } else {
      console.error('Error setting up the request:', error.message);
    }
    
    console.error('\nTroubleshooting steps:');
    console.error('1. Verify your SHOPIFY_SHOP_NAME in .env (should be only the subdomain part, like "mystore" not "mystore.myshopify.com")');
    console.error('2. Verify your SHOPIFY_ACCESS_TOKEN in .env is correct and has not expired');
    console.error('3. Ensure your shop admin account has proper access permissions');
    console.error('4. Check if your network connection can access Shopify\'s API');
    
    return false;
  }
}

// Run the test
testGraphQLConnection()
  .then(success => {
    if (success) {
      console.log('\nYou can now run the main server using: npm start');
    } else {
      console.log('\nPlease fix the issues above before proceeding.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error during test:', error);
    process.exit(1);
  }); 