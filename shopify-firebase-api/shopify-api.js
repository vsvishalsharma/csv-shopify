// Shopify API Client
// This file provides a direct connection to the Shopify API

const axios = require('axios');
require('dotenv').config();

// Shopify API configuration
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOPIFY_SHOP_NAME = process.env.SHOPIFY_SHOP_NAME;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = '2023-10'; // Using a more stable version

// Normalize shop name (remove .myshopify.com if included)
const normalizedShopName = SHOPIFY_SHOP_NAME.replace('.myshopify.com', '');

// Shopify API base URL
const baseUrl = `https://${normalizedShopName}.myshopify.com/admin/api/${SHOPIFY_API_VERSION}`;

// Log API configuration for debugging
console.log('Shopify API Configuration:');
console.log(`- Shop: ${normalizedShopName}`);
console.log(`- API Version: ${SHOPIFY_API_VERSION}`);
console.log(`- Base URL: ${baseUrl}`);

// Headers for API requests
const headers = {
  'Content-Type': 'application/json',
  'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
};

// Helper function to handle API rate limits
const handleRateLimit = async (response) => {
  if (response.headers['x-shopify-shop-api-call-limit']) {
    const [current, limit] = response.headers['x-shopify-shop-api-call-limit'].split('/');
    console.log(`API Rate Limit: ${current}/${limit}`);
    
    // If we're close to the limit, wait a bit
    if (parseInt(current) > parseInt(limit) * 0.8) {
      console.log('Approaching rate limit, waiting...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return response;
};

// Helper function for API requests
const shopifyRequest = async (method, endpoint, data = null) => {
  try {
    // Ensure endpoint starts with slash
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${formattedEndpoint}`;
    
    console.log(`Making ${method} request to: ${url}`);
    
    const options = {
      method,
      url,
      headers,
      data: data ? data : undefined
    };
    
    const response = await axios(options);
    await handleRateLimit(response);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('Shopify API Error:', error.response.status, error.response.data);
      console.error('Request URL:', error.config.url);
      console.error('Request Headers:', error.config.headers);
      
      if (error.response.status === 429) {
        // Handle rate limit exceeded
        const retryAfter = parseInt(error.response.headers['retry-after'] || '5');
        console.log(`Rate limit exceeded. Retrying after ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return shopifyRequest(method, endpoint, data);
      }
    } else {
      console.error('Network or other error:', error.message);
    }
    throw error;
  }
};

// Product functions
const productService = {
  // Get a list of products
  async getProducts(params = { limit: 10 }) {
    const queryParams = new URLSearchParams(params).toString();
    const data = await shopifyRequest('GET', `/products.json?${queryParams}`);
    return data.products;
  },

  // Get a single product by ID
  async getProduct(id) {
    const data = await shopifyRequest('GET', `/products/${id}.json`);
    return data.product;
  },

  // Search for products
  async searchProducts(query, params = { limit: 10 }) {
    const queryParams = new URLSearchParams({
      ...params,
      query
    }).toString();
    const data = await shopifyRequest('GET', `/products.json?${queryParams}`);
    return data.products;
  },

  // Apply pricing formula to a product
  applyPricingFormula(product, customWidth = null) {
    // Clone the product to avoid modifying the original
    const processedProduct = { ...product };
    
    // Get product type and dimensions (if available)
    const productType = (product.product_type || '').toLowerCase();
    const width = customWidth || parseFloat(product.variants[0]?.option2 || 0);
    
    // Base price from the product
    let basePrice = parseFloat(product.variants[0]?.price || 0);
    
    // Apply formula for Sofas (every 10cm increase = 200 shekels)
    if (productType.includes('sofa') && !productType.includes('corner') && width > 0) {
      // Calculate price adjustment based on width (every 10cm = 200 shekels)
      const standardWidth = 100; // Assume this is the base width for pricing
      const widthDifference = width - standardWidth;
      
      if (widthDifference > 0) {
        const priceIncrease = Math.ceil(widthDifference / 10) * 200;
        basePrice += priceIncrease;
      }
    }
    
    // Apply formula for TV Stands (every 10cm increase = 150 shekels)
    if ((productType.includes('tv') && productType.includes('stand')) && width > 0) {
      // Calculate price adjustment based on width (every 10cm = 150 shekels)
      const standardWidth = 100; // Assume this is the base width for pricing
      const widthDifference = width - standardWidth;
      
      if (widthDifference > 0) {
        const priceIncrease = Math.ceil(widthDifference / 10) * 150;
        basePrice += priceIncrease;
      }
    }
    
    // Update the product price
    if (processedProduct.variants && processedProduct.variants.length > 0) {
      processedProduct.variants[0].price = basePrice.toString();
    }
    
    // Add calculated width to response if custom width was provided
    if (customWidth) {
      processedProduct.calculatedWidth = customWidth;
    }
    
    return processedProduct;
  }
};

// Function to remove empty fields from an object
const removeEmptyFields = (obj) => {
  const cleanedObj = {};
  
  for (const key in obj) {
    const value = obj[key];
    // Skip empty strings, null, or undefined values
    if (value === null || value === undefined || value === '') {
      continue;
    }
    
    // If it's an object, recursively clean it
    if (typeof value === 'object' && !Array.isArray(value)) {
      cleanedObj[key] = removeEmptyFields(value);
    } else {
      cleanedObj[key] = value;
    }
  }
  
  return cleanedObj;
};

module.exports = {
  productService,
  removeEmptyFields
}; 