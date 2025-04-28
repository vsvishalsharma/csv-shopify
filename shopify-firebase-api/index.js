// shopify-firebase-api/index.js

const express = require('express');
const csv = require('csv-parser');
const fs = require('fs');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Check if service account file exists
if (!fs.existsSync('./firebase-service-account.json')) {
  console.error('ERROR: firebase-service-account.json not found! Please create this file with your Firebase credentials.');
  process.exit(1);
}

// Initialize Firebase with error handling and debugging
let db;
try {
  const serviceAccount = require('./firebase-service-account.json');
  
  // Validate service account
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    console.error('ERROR: Service account is missing required fields (project_id, client_email, or private_key)!');
    process.exit(1);
  }
  
  console.log('Initializing Firebase with project ID:', serviceAccount.project_id);
  
  initializeApp({
    credential: cert(serviceAccount)
  });
  
  db = getFirestore();
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  process.exit(1);
}

const productsCollection = 'products';

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
    const snapshot = await db.collection(productsCollection).limit(limit).get();
    
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

// Function to generate a safe document ID
function generateSafeId(input) {
  if (!input) {
    return `product-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }
  
  // Convert to string and remove invalid characters
  return input.toString()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 1500); // Ensure ID isn't too long
}

// Function to verify Firestore connection
async function verifyFirestoreConnection() {
  try {
    console.log('Testing Firestore connection...');
    const testCollection = 'test_collection';
    const testDoc = 'test_connection';
    
    await db.collection(testCollection).doc(testDoc).set({ 
      test: true, 
      timestamp: new Date().toISOString() 
    });
    
    await db.collection(testCollection).doc(testDoc).delete();
    console.log('✅ Firestore connection verified');
    return true;
  } catch (error) {
    console.error('❌ Firestore connection test failed:', error);
    return false;
  }
}

// Function to import CSV data to Firebase
async function importCsvToFirebase() {
    const products = [];
    const csvFilePath = './products.csv';
    
    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      console.error('Error: products.csv file not found in project root');
      return 0;
    }
    
    // Verify Firebase connection before starting import
    const connectionOk = await verifyFirestoreConnection();
    if (!connectionOk) {
      throw new Error('Failed to connect to Firestore. Please check your service account credentials and permissions.');
    }
    
    console.log('Starting CSV import process...');
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
          // Generate a safe product ID
          const productId = generateSafeId(row['ID'] || row['Handle']);
          
          products.push({
            id: productId,
            ...row
          });
        })
        .on('end', async () => {
          try {
            console.log(`Parsed ${products.length} products from CSV`);
            
            // Use individual document writes instead of batching
            let successCount = 0;
            let failureCount = 0;
            
            // Process in very small chunks to avoid rate limits
            const chunkSize = 10;
            
            for (let i = 0; i < products.length; i += chunkSize) {
              const chunk = products.slice(i, i + chunkSize);
              console.log(`Processing chunk ${Math.floor(i/chunkSize) + 1} of ${Math.ceil(products.length/chunkSize)}, size: ${chunk.length}`);
              
              // Process documents sequentially to avoid overloading Firestore
              for (const product of chunk) {
                try {
                  const docRef = db.collection(productsCollection).doc(product.id);
                  await docRef.set(product);
                  successCount++;
                  
                  if (successCount % 10 === 0 || successCount === 1) {
                    console.log(`Progress: ${successCount}/${products.length} products saved`);
                  }
                } catch (error) {
                  failureCount++;
                  console.error(`Failed to upload product ${product.id}:`, error.message);
                }
              }
              
              // Add a longer delay between chunks to prevent rate limiting
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            console.log(`CSV import completed: ${successCount} successful, ${failureCount} failed`);
            resolve(successCount);
          } catch (error) {
            console.error('Error uploading to Firebase:', error);
            reject(error);
          }
        })
        .on('error', (error) => {
          console.error('Error processing CSV:', error);
          reject(error);
        });
    });
}

// API endpoint to trigger CSV import
app.post('/api/import-csv', async (req, res) => {
  try {
    // Check if already importing
    if (global.isImporting) {
      return res.status(409).json({ error: 'Import already in progress' });
    }
    
    // Set flag to prevent multiple imports
    global.isImporting = true;
    
    // Start import in background
    importCsvToFirebase()
      .then(count => {
        console.log(`Import completed: ${count} products imported`);
        global.isImporting = false;
      })
      .catch(error => {
        console.error('Import failed:', error);
        global.isImporting = false;
      });
    
    // Respond immediately
    res.json({ 
      message: 'CSV import started',
      status: 'processing'
    });
  } catch (error) {
    global.isImporting = false;
    console.error('Error starting import:', error);
    res.status(500).json({ error: 'Failed to start import', details: error.message });
  }
});

// API endpoint to check import status
app.get('/api/import-status', (req, res) => {
  res.json({
    importing: !!global.isImporting,
    status: global.isImporting ? 'in_progress' : 'idle'
  });
});

// Start the server
app.listen(port, async () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`- Health check: http://localhost:${port}/health`);
  console.log(`- List products: http://localhost:${port}/api/products`);
  console.log(`- Get product by ID: http://localhost:${port}/api/{id}`);
  console.log(`- Import CSV: POST http://localhost:${port}/api/import-csv`);
  console.log(`- Import status: GET http://localhost:${port}/api/import-status`);
  
  // Check if command line argument to import CSV is provided
  if (process.argv.includes('--import-csv')) {
    console.log('Auto-import flag detected. Starting CSV import...');
    try {
      const importedCount = await importCsvToFirebase();
      console.log(`Successfully imported ${importedCount} products to Firebase`);
    } catch (error) {
      console.error('Failed to import products:', error);
    }
  }
});