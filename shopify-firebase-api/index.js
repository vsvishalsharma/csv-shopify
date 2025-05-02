// shopify-firebase-api/index.js

const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import Shopify API service
const { productService, removeEmptyFields } = require('./shopify-api');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('\n❌ ERROR: .env file not found');
  console.error('Please run "node create-env.js" to create your environment file.');
  process.exit(1);
}

// Check if Shopify credentials are configured
const missingCredentials = [];
['SHOPIFY_API_KEY', 'SHOPIFY_API_SECRET', 'SHOPIFY_SHOP_NAME', 'SHOPIFY_ACCESS_TOKEN'].forEach(key => {
  if (!process.env[key]) {
    missingCredentials.push(key);
  }
});

if (missingCredentials.length > 0) {
  console.error(`\n❌ ERROR: Missing Shopify credentials: ${missingCredentials.join(', ')}`);
  console.error('\nPlease update your .env file with the required credentials.');
  console.error('You can run "node verify-credentials.js" to check your configuration.');
  console.error('Or run "node create-env.js" to recreate your .env file.');
  process.exit(1);
}

// Parse JSON bodies
app.use(express.json());

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// API endpoint to list all products (with pagination)
app.get('/api/products', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const products = await productService.getProducts({ limit });
    
    if (!products || products.length === 0) {
      return res.json({ products: [] });
    }
    
    const formattedProducts = products.map(product => {
      // Remove empty fields
      const cleanedProduct = removeEmptyFields(product);
      
      return {
        id: cleanedProduct.id.toString(),
        ...cleanedProduct
      };
    });
    
    res.json({ products: formattedProducts });
  } catch (error) {
    console.error('Error retrieving products:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// API endpoint to fetch a product by ID
app.get('/api/:id', async (req, res) => {
  try {
    const product = await productService.getProduct(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Remove empty fields
    const cleanedProduct = removeEmptyFields(product);

    res.json(cleanedProduct);
  } catch (error) {
    console.error('Error retrieving product:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// API endpoint to calculate price based on size
app.post('/api/calculate-price', async (req, res) => {
  try {
    const { productId, width } = req.body;
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }
    
    if (!width || isNaN(parseFloat(width))) {
      return res.status(400).json({ error: 'Valid width is required' });
    }
    
    const product = await productService.getProduct(productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Remove empty fields
    const cleanedProduct = removeEmptyFields(product);
    
    // Apply pricing formula with width from request body
    const processedProduct = productService.applyPricingFormula(cleanedProduct, parseFloat(width));

    res.json(processedProduct);
  } catch (error) {
    console.error('Error calculating price:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// API endpoint to search products
app.get('/api/search/products', async (req, res) => {
  try {
    const { query, limit } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const limitValue = parseInt(limit) || 10;
    const products = await productService.searchProducts(query, { limit: limitValue });
    
    if (!products || products.length === 0) {
      return res.json({ products: [] });
    }
    
    const formattedProducts = products.map(product => {
      // Remove empty fields
      const cleanedProduct = removeEmptyFields(product);
      
      return {
        id: cleanedProduct.id.toString(),
        ...cleanedProduct
      };
    });
    
    res.json({ products: formattedProducts });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Start the server
app.listen(port, () => {
  const shopName = process.env.SHOPIFY_SHOP_NAME.replace('.myshopify.com', '');
  
  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│           Shopify API Server Running            │');
  console.log('├─────────────────────────────────────────────────┤');
  console.log(`│ Server URL: http://localhost:${port}              │`);
  console.log(`│ Shop: ${shopName.padEnd(41, ' ')}│`);
  console.log('├─────────────────────────────────────────────────┤');
  console.log('│ Available Endpoints:                            │');
  console.log('│ • GET  /health                                  │');
  console.log('│ • GET  /api/products                            │');
  console.log('│ • GET  /api/:id                                 │');
  console.log('│ • POST /api/calculate-price                     │');
  console.log('│ • GET  /api/search/products                     │');
  console.log('└─────────────────────────────────────────────────┘');
});