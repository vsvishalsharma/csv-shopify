const express = require('express');
const axios = require('axios');
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Initialize Express
const app = express();
app.use(express.json());

// Shopify GraphQL API configuration
const SHOPIFY_SHOP_NAME = process.env.SHOPIFY_SHOP_NAME;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';

// Validate environment variables
if (!SHOPIFY_SHOP_NAME) {
  console.error('Error: SHOPIFY_SHOP_NAME is not set in environment variables');
  console.error('Please run: node fix-shopify-connection.js');
  process.exit(1);
}

if (!SHOPIFY_ACCESS_TOKEN) {
  console.error('Error: SHOPIFY_ACCESS_TOKEN is not set in environment variables');
  console.error('Please run: node fix-shopify-connection.js');
  process.exit(1);
}

// Format shop name properly (remove .myshopify.com if included)
const formattedShopName = SHOPIFY_SHOP_NAME.replace('.myshopify.com', '');

// Make sure we use the correct format for the URL
const SHOPIFY_URL = `https://${formattedShopName}.myshopify.com`;
const SHOPIFY_GRAPHQL_URL = `${SHOPIFY_URL}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

// Log the configured Shopify API URL for debugging
console.log(`Using Shopify Shop: ${formattedShopName}`);
console.log(`Shopify GraphQL URL: ${SHOPIFY_GRAPHQL_URL}`);

// Price calculation logic
function calculateCustomPrice(product, width) {
  // Default behavior: return the original price of the first variant
  let basePrice = 0;
  if (product.variants && product.variants.length > 0) {
    basePrice = parseFloat(product.variants[0].price);
  }

  // If no width provided or invalid width, return the base price
  if (!width || isNaN(parseFloat(width))) {
    return basePrice;
  }
  
  width = parseFloat(width);
  
  // Get product type (convert to lowercase for case-insensitive comparison)
  const productType = (product.productType || '').toLowerCase();
  
  // Different calculation logic based on product type
  // For sofas: base price + 200 for every 10cm over 100cm
  if (productType.includes('sofa') && !productType.includes('corner') && width > 0) {
    const standardWidth = 100; // Base width for pricing
    const widthDifference = width - standardWidth;
    
    if (widthDifference > 0) {
      const priceIncrease = Math.ceil(widthDifference / 10) * 200;
      return basePrice + priceIncrease;
    }
  }
  
  // For TV stands or TV cabinets: base price + 150 for every 10cm over 100cm
  if ((productType.includes('tv') && (productType.includes('stand') || productType.includes('cabinet'))) && width > 0) {
    const standardWidth = 100; // Base width for pricing
    const widthDifference = width - standardWidth;
    
    if (widthDifference > 0) {
      const priceIncrease = Math.ceil(widthDifference / 10) * 150;
      return basePrice + priceIncrease;
    }
  }
  
  // For all other products: just return the base price
  return basePrice;
}

// Helper function to clean object by removing empty fields
function cleanObject(obj) {
  // If null, undefined or not an object, return as is
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle arrays - clean each item in the array and filter out empty values
  if (Array.isArray(obj)) {
    return obj
      .map(item => cleanObject(item))
      .filter(item => {
        // Filter out null, undefined, empty strings
        if (item === null || item === undefined) return false;
        if (typeof item === 'string' && item.trim() === '') return false;
        // Keep arrays only if they have elements after cleaning
        if (Array.isArray(item) && item.length === 0) return false;
        // Keep objects only if they have properties after cleaning
        if (typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length === 0) return false;
        return true;
      });
  }
  
  // For regular objects
  const result = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    // Skip null, undefined, or empty strings
    if (value === null || value === undefined) return;
    if (typeof value === 'string' && value.trim() === '') return;
    
    // Handle arrays - clean each item in the array
    if (Array.isArray(value)) {
      const cleanedArray = cleanObject(value);
      if (cleanedArray.length > 0) {
        result[key] = cleanedArray;
      }
      return;
    }
    
    // Handle nested objects
    if (typeof value === 'object') {
      const cleanedObj = cleanObject(value);
      if (Object.keys(cleanedObj).length > 0) {
        result[key] = cleanedObj;
      }
      return;
    }
    
    // Include all other values
    result[key] = value;
  });
  
  return result;
}

// Fetch products from Shopify via GraphQL API
async function fetchShopifyProducts() {
  console.log('Fetching products from Shopify...');
  console.log(`Using GraphQL URL: ${SHOPIFY_GRAPHQL_URL}`);
  
  // Simple GraphQL query to fetch all products
  const query = `
    {
      products(first: 250) {
        edges {
          node {
            id
            title
            description
            handle
            productType
            vendor
            tags
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  price
                  sku
                  availableForSale
                }
              }
            }
            images(first: 10) {
              edges {
                node {
                  id
                  url
                  altText
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await axios({
      url: SHOPIFY_GRAPHQL_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
      },
      data: {
        query
      }
    });

    if (!response.data || !response.data.data || !response.data.data.products) {
      throw new Error('Invalid response from Shopify GraphQL API');
    }

    // Transform products into a simpler format
    const products = response.data.data.products.edges.map(edge => {
      const product = edge.node;
      
      // Extract variant data
      const variants = product.variants.edges.map(variantEdge => {
        const variant = variantEdge.node;
        return {
          id: variant.id.split('/').pop(),
          title: variant.title,
          price: variant.price,
          sku: variant.sku,
          availableForSale: variant.availableForSale
        };
      });
      
      // Extract image data
      const images = product.images.edges.map(imageEdge => {
        const image = imageEdge.node;
        return {
          id: image.id.split('/').pop(),
          url: image.url,
          altText: image.altText
        };
      });
      
      // Create the product object
      const processedProduct = {
        id: product.id.split('/').pop(), // Extract numeric ID
        title: product.title,
        description: product.description,
        handle: product.handle,
        productType: product.productType,
        vendor: product.vendor,
        tags: product.tags,
        variants,
        images,
        // Add base price for convenience (from first variant)
        basePrice: variants.length > 0 ? variants[0].price : '0.00'
      };
      
      // Clean the product by removing empty fields
      return cleanObject(processedProduct);
    });
    
    console.log(`Successfully fetched ${products.length} products from Shopify`);
    return products;
  } catch (error) {
    console.error('Error fetching products from Shopify:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

// Store products in Firestore
async function storeProductsInFirestore(products) {
  console.log(`Storing ${products.length} products in Firestore...`);
  
  const batch = db.batch();
  const productsRef = db.collection('products');
  
  products.forEach(product => {
    const docRef = productsRef.doc(product.id.toString());
    batch.set(docRef, product);
  });
  
  await batch.commit();
  console.log('Products successfully stored in Firestore');
}

// API endpoint to sync products from Shopify to Firestore
app.post('/api/sync-products', async (req, res) => {
  try {
    const products = await fetchShopifyProducts();
    await storeProductsInFirestore(products);
    res.status(200).json({ success: true, message: `${products.length} products synced successfully` });
  } catch (error) {
    console.error('Error in sync-products:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get all products
app.get('/api/products', async (req, res) => {
  try {
    const productsSnapshot = await db.collection('products').get();
    const products = [];
    
    productsSnapshot.forEach(doc => {
      // Clean the product by removing empty fields
      const cleanedProduct = cleanObject(doc.data());
      products.push(cleanedProduct);
    });
    
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get a product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const productDoc = await db.collection('products').doc(productId).get();
    
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Clean the product by removing empty fields
    const cleanedProduct = cleanObject(productDoc.data());
    
    res.status(200).json(cleanedProduct);
  } catch (error) {
    console.error('Error fetching product:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to calculate custom price based on product ID and width
app.post('/api/calculate-price', async (req, res) => {
  try {
    const { productId, width } = req.body;
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }
    
    // Get the product from Firestore
    const productDoc = await db.collection('products').doc(productId.toString()).get();
    
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const product = productDoc.data();
    
    // Validate width if provided
    let parsedWidth = null;
    if (width) {
      parsedWidth = parseFloat(width);
      if (isNaN(parsedWidth)) {
        return res.status(400).json({ error: 'Width must be a valid number' });
      }
    }
    
    // Calculate the custom price based on product and width
    const calculatedPrice = calculateCustomPrice(product, parsedWidth);
    
    // Create response with detailed information
    const response = {
      productId,
      title: product.title,
      productType: product.productType || 'Unknown',
      basePrice: product.basePrice || (product.variants && product.variants.length > 0 ? product.variants[0].price : '0.00'),
      requestedWidth: parsedWidth ? parsedWidth.toString() : 'Not specified',
      calculatedPrice: calculatedPrice.toFixed(2),
      currency: 'ILS',
      // Include width pricing information for transparency
      pricingInfo: {
        appliedFormula: getPricingFormulaDescription(product.productType)
      }
    };
    
    // Clean the response to remove any empty fields
    const cleanedResponse = cleanObject(response);
    
    res.status(200).json(cleanedResponse);
  } catch (error) {
    console.error('Error calculating price:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to get pricing formula description
function getPricingFormulaDescription(productType) {
  if (!productType) return 'Standard pricing';
  
  const type = productType.toLowerCase();
  
  if (type.includes('sofa') && !type.includes('corner')) {
    return 'Sofa pricing: Base price + 200 ILS for every 10cm over 100cm width';
  }
  
  if (type.includes('tv') && (type.includes('stand') || type.includes('cabinet'))) {
    return 'TV stand pricing: Base price + 150 ILS for every 10cm over 100cm width';
  }
  
  return 'Standard pricing: No width adjustments applied';
}

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Endpoints:`);
  console.log(`- GET /api/products - Get all products`);
  console.log(`- GET /api/products/:id - Get product by ID`);
  console.log(`- POST /api/sync-products - Sync products from Shopify to Firestore`);
  console.log(`- POST /api/calculate-price - Calculate price based on product ID and width`);
}); 