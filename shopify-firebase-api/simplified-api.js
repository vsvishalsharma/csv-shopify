// Simplified Shopify Firebase API

const express = require('express');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Initialize Firebase
try {
  const serviceAccount = require('./firebase-service-account.json');
  
  initializeApp({
    credential: cert(serviceAccount)
  });
  
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  process.exit(1);
}

const db = getFirestore();
const productsCollection = 'products';

// Parse JSON bodies
app.use(express.json());

// Function to remove empty fields from an object
function removeEmptyFields(obj) {
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
}

// Function to apply pricing formula based on product type
function applyPricingFormula(product) {
  // Clone the product to avoid modifying the original
  const processedProduct = { ...product };
  
  // Get product type and dimensions (if available)
  const productType = (product.Type || product.ProductType || '').toLowerCase();
  const width = parseFloat(product.Width || 0);
  
  // Base price from the product (if available)
  let basePrice = parseFloat(product.Price || product.price || 0);
  
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
  if (product.Price !== undefined) {
    processedProduct.Price = basePrice.toString();
  }
  if (product.price !== undefined) {
    processedProduct.price = basePrice;
  }
  
  return processedProduct;
}

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// API endpoint to add a test product
app.post('/api/test-product', async (req, res) => {
  try {
    const testProduct = {
      name: 'Test Product',
      description: 'This is a test product',
      price: 99.99,
      created_at: new Date().toISOString()
    };
    
    const docRef = await db.collection(productsCollection).add(testProduct);
    console.log('Added test product with ID:', docRef.id);
    
    res.json({ 
      id: docRef.id,
      message: 'Test product created successfully',
      product: testProduct 
    });
  } catch (error) {
    console.error('Error creating test product:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// API endpoint to list all products
app.get('/api/products', async (req, res) => {
  try {
    const snapshot = await db.collection(productsCollection).limit(10).get();
    
    if (snapshot.empty) {
      return res.json({ products: [] });
    }
    
    const products = [];
    snapshot.forEach(doc => {
      const productData = doc.data();
      // Remove empty fields
      const cleanedProduct = removeEmptyFields(productData);
      
      products.push({
        id: doc.id,
        ...cleanedProduct
      });
    });
    
    res.json({ products });
  } catch (error) {
    console.error('Error retrieving products:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// API endpoint to fetch a product by ID
app.get('/api/:id', async (req, res) => {
  try {
    const docRef = db.collection(productsCollection).doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productData = doc.data();
    // Remove empty fields
    const cleanedProduct = removeEmptyFields(productData);

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
    
    const docRef = db.collection(productsCollection).doc(productId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productData = doc.data();
    // Remove empty fields
    const cleanedProduct = removeEmptyFields(productData);
    
    // Apply pricing formula with width from request body
    const processedProduct = applyPricingFormulaWithSize(cleanedProduct, parseFloat(width));

    res.json(processedProduct);
  } catch (error) {
    console.error('Error calculating price:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Function to apply pricing formula with custom size
function applyPricingFormulaWithSize(product, width) {
  // Clone the product to avoid modifying the original
  const processedProduct = { ...product };
  
  // Get product type
  const productType = (product.Type || product.ProductType || '').toLowerCase();
  
  // Base price from the product (if available)
  let basePrice = parseFloat(product.Price || product.price || 0);
  
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
  if (product.Price !== undefined) {
    processedProduct.Price = basePrice.toString();
  }
  if (product.price !== undefined) {
    processedProduct.price = basePrice;
  }
  
  // Add calculated width to response
  processedProduct.calculatedWidth = width;
  
  return processedProduct;
}

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`- Health check: http://localhost:${port}/health`);
  console.log(`- Create test product: POST http://localhost:${port}/api/test-product`);
  console.log(`- List products: GET http://localhost:${port}/api/products`);
  console.log(`- Get product by ID: GET http://localhost:${port}/api/{id}`);
  console.log(`- Calculate Price: POST http://localhost:${port}/api/calculate-price`);
}); 