// Test Shopify API Connection

require('dotenv').config();
const { productService } = require('./shopify-api');
const axios = require('axios');

// Helper function to display product details
function displayProduct(product) {
  console.log('\nProduct Details:');
  console.log('----------------');
  console.log(`ID: ${product.id}`);
  console.log(`Title: ${product.title}`);
  console.log(`Product Type: ${product.product_type}`);
  
  if (product.variants && product.variants.length > 0) {
    const variant = product.variants[0];
    console.log(`Price: ${variant.price}`);
    console.log(`SKU: ${variant.sku || 'N/A'}`);
  }
  
  console.log(`Tags: ${product.tags || 'None'}`);
  console.log(`Created: ${new Date(product.created_at).toLocaleString()}`);
  console.log(`Updated: ${new Date(product.updated_at).toLocaleString()}`);
}

// Test the price calculation formula
function testPriceCalculation(product, width) {
  const calculatedProduct = productService.applyPricingFormula(product, width);
  console.log('\nPrice Calculation Test:');
  console.log('----------------------');
  console.log(`Product: ${product.title}`);
  console.log(`Original Price: ${product.variants[0]?.price || 'N/A'}`);
  console.log(`Width: ${width}cm`);
  console.log(`Calculated Price: ${calculatedProduct.variants[0]?.price || 'N/A'}`);
}

// Verify shop access directly using axios
async function verifyShopAccess() {
  console.log('\nVerifying direct shop access...');
  const shopName = process.env.SHOPIFY_SHOP_NAME.replace('.myshopify.com', '');
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  
  try {
    // Check if the shop exists first with a simple request
    const shopResponse = await axios.get(`https://${shopName}.myshopify.com/admin/api/2023-10/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken
      }
    });
    
    console.log('✅ Shop access verified successfully!');
    console.log(`Shop name: ${shopResponse.data.shop.name}`);
    console.log(`Shop domain: ${shopResponse.data.shop.myshopify_domain}`);
    console.log(`Plan: ${shopResponse.data.shop.plan_name}`);
    return true;
  } catch (error) {
    console.error('❌ Shop access verification failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
      
      if (error.response.status === 401) {
        console.error('\nAuthentication error - your access token may be invalid or expired.');
      } else if (error.response.status === 404) {
        console.error('\nShop not found - check your shop name.');
        console.error(`Attempted to access: https://${shopName}.myshopify.com`);
      }
    } else if (error.request) {
      console.error('No response received from Shopify API');
      console.error('This could be a network issue or Shopify API might be down');
    } else {
      console.error('Error setting up the request:', error.message);
    }
    return false;
  }
}

// Main test function
async function testShopifyConnection() {
  console.log('Testing Shopify API Connection...');
  console.log(`Shop: ${process.env.SHOPIFY_SHOP_NAME}`);
  
  // First verify basic shop access
  const shopAccessValid = await verifyShopAccess();
  if (!shopAccessValid) {
    console.log('\nShop access verification failed. Please check your credentials.');
    console.log('If your shop name and access token are correct, ensure your app has the necessary API scopes.');
    return;
  }
  
  try {
    // Test 1: Fetch products
    console.log('\nTest 1: Fetching products...');
    const products = await productService.getProducts({ limit: 3 });
    
    if (!products || products.length === 0) {
      console.log('No products found in the store.');
    } else {
      console.log(`Successfully fetched ${products.length} products.`);
      
      // Display the first product
      const firstProduct = products[0];
      displayProduct(firstProduct);
      
      // Test 2: Fetch a single product
      console.log('\nTest 2: Fetching a single product...');
      const product = await productService.getProduct(firstProduct.id);
      console.log(`Successfully fetched product "${product.title}"`);
      
      // Test 3: Test price calculation
      if (product.product_type.toLowerCase().includes('sofa')) {
        testPriceCalculation(product, 150); // Test with 150cm width
      } else {
        console.log('\nTest 3: Skipping price calculation test (no sofa product found)');
      }
      
      // Test 4: Search products
      console.log('\nTest 4: Searching products...');
      const searchTerm = 'sofa';
      const searchResults = await productService.searchProducts(searchTerm, { limit: 2 });
      console.log(`Search for "${searchTerm}" returned ${searchResults.length} results.`);
      if (searchResults.length > 0) {
        console.log('First search result:');
        console.log(`- ${searchResults[0].title} (${searchResults[0].product_type})`);
      }
    }
    
    console.log('\nAll tests completed successfully! Your Shopify API connection is working.');
  } catch (error) {
    console.error('\nError testing Shopify API connection:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
      
      if (error.response.status === 403) {
        console.error('\nForbidden - Your access token might not have the required scopes.');
        console.error('Make sure your app has the following scopes:');
        console.error('- read_products');
        console.error('- write_products (if you need to modify products)');
      }
    } else {
      console.error(error.message);
    }
    
    console.log('\nPossible solutions:');
    console.log('1. Check that your .env file contains the correct Shopify credentials');
    console.log('2. Verify that your access token has not expired');
    console.log('3. Ensure your app has the necessary API scopes (read_products)');
    console.log('4. Check that your store name is correct');
    console.log('5. If you just created your custom app, it might take a few minutes to activate');
  }
}

// Run the test
testShopifyConnection(); 