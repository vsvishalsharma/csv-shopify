const axios = require('axios');
require('dotenv').config();

async function testGraphQL() {
  // Get configuration from environment variables
  const shopifyURL = process.env.SHOPIFY_URL || `https://${process.env.SHOPIFY_SHOP_NAME}.myshopify.com`;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  
  console.log('Testing Shopify GraphQL API');
  console.log(`URL: ${shopifyURL}`);
  console.log(`Token: ${accessToken ? '**REDACTED**' : 'MISSING'}`);
  
  if (!shopifyURL || !accessToken) {
    console.error('Error: Missing required Shopify configuration');
    return;
  }
  
  const fullShopifyURL = `${shopifyURL}/admin/api/2023-10/graphql.json`;
  console.log(`Full GraphQL URL: ${fullShopifyURL}`);
  
  // Simple query - similar to the Go example
  const query = `
    {
      products(first: 10) {
        edges {
          node {
            id
            title
            variants(first: 1) {
              edges {
                node {
                  price
                }
              }
            }
          }
        }
      }
    }
  `;
  
  try {
    console.log('\nSending request to Shopify GraphQL API...');
    
    const response = await axios({
      url: fullShopifyURL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      data: JSON.stringify({
        query
      })
    });
    
    // Log the raw response
    console.log('\nRaw response:');
    console.log(JSON.stringify(response.data, null, 2).substring(0, 500) + '...');
    
    // Check for errors
    if (response.data.errors) {
      console.error('\nGraphQL errors:');
      response.data.errors.forEach(error => {
        console.error(`- ${error.message}`);
      });
      return;
    }
    
    // Process products
    const products = [];
    const edges = response.data.data.products.edges;
    
    edges.forEach(edge => {
      const node = edge.node;
      const price = node.variants.edges.length > 0 ? node.variants.edges[0].node.price : '';
      
      products.push({
        id: node.id,
        title: node.title,
        price
      });
    });
    
    console.log(`\nSuccessfully found ${products.length} products`);
    products.forEach(product => {
      console.log(`- ${product.title} (${product.price})`);
    });
    
  } catch (error) {
    console.error('\nError making GraphQL request:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      console.error('No response received');
    } else {
      console.error(`Error: ${error.message}`);
    }
  }
}

// Run the test
testGraphQL(); 