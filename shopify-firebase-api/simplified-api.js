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
      products.push({
        id: doc.id,
        ...doc.data()
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

    res.json(doc.data());
  } catch (error) {
    console.error('Error retrieving product:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`- Health check: http://localhost:${port}/health`);
  console.log(`- Create test product: POST http://localhost:${port}/api/test-product`);
  console.log(`- List products: http://localhost:${port}/api/products`);
  console.log(`- Get product by ID: http://localhost:${port}/api/{id}`);
}); 