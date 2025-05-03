// Scheduled sync script for importing products from Shopify to Firebase
// This script will be executed by a cron job once a week
// It imports products and ensures no duplicates are created

const axios = require('axios');
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
let serviceAccount;
try {
  serviceAccount = require('./firebase-service-account.json');
} catch (error) {
  console.error('Error loading Firebase service account:', error.message);
  console.error('Make sure firebase-service-account.json exists in the project root');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Shopify GraphQL API configuration
const SHOPIFY_SHOP_NAME = process.env.SHOPIFY_SHOP_NAME;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';

if (!SHOPIFY_SHOP_NAME || !SHOPIFY_ACCESS_TOKEN) {
  console.error('ERROR: Missing Shopify credentials in .env file');
  console.error('Make sure SHOPIFY_SHOP_NAME and SHOPIFY_ACCESS_TOKEN are set');
  console.error('Run: node fix-shopify-connection.js to diagnose and fix issues');
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
        basePrice: variants.length > 0 ? variants[0].price : '0.00',
        lastUpdated: new Date().toISOString() // Add update timestamp
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

// Check for and remove deleted products
async function checkForDeletedProducts(shopifyProducts) {
  console.log('Checking for products that have been deleted from Shopify...');
  
  try {
    // Get all current products from Firestore
    const firestoreSnapshot = await db.collection('products').get();
    const firestoreProducts = [];
    
    firestoreSnapshot.forEach(doc => {
      firestoreProducts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Create a set of Shopify product IDs for quick lookup
    const shopifyProductIds = new Set(shopifyProducts.map(product => product.id.toString()));
    
    // Find products in Firestore that are not in Shopify
    const deletedProducts = firestoreProducts.filter(product => !shopifyProductIds.has(product.id.toString()));
    
    console.log(`Found ${deletedProducts.length} products that have been deleted from Shopify`);
    
    // Delete these products from Firestore
    if (deletedProducts.length > 0) {
      const batch = db.batch();
      
      deletedProducts.forEach(product => {
        const docRef = db.collection('products').doc(product.id.toString());
        batch.delete(docRef);
        console.log(`Marked for deletion: ${product.title} (${product.id})`);
      });
      
      await batch.commit();
      console.log(`Deleted ${deletedProducts.length} products from Firestore`);
    }
    
    return deletedProducts.length;
  } catch (error) {
    console.error('Error checking for deleted products:', error.message);
    return 0;
  }
}

// Store products in Firestore with duplicate checking
async function storeProductsInFirestore(products) {
  console.log(`Preparing to store ${products.length} products in Firestore...`);
  
  try {
    const batch = db.batch();
    const productsRef = db.collection('products');
    let newCount = 0;
    let updatedCount = 0;
    
    // Check each product for existing versions in Firestore
    for (const product of products) {
      const productId = product.id.toString();
      const docRef = productsRef.doc(productId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        // New product
        batch.set(docRef, product);
        newCount++;
      } else {
        // Existing product - check if it needs updating
        const existingProduct = doc.data();
        
        // Simple check based on comparing content
        // You could implement more sophisticated checks based on specific fields
        const existingProductString = JSON.stringify(existingProduct);
        const newProductString = JSON.stringify(product);
        
        if (existingProductString !== newProductString) {
          batch.set(docRef, product);
          updatedCount++;
        }
      }
    }
    
    if (newCount > 0 || updatedCount > 0) {
      await batch.commit();
      console.log(`Firestore update complete: ${newCount} new products, ${updatedCount} updated products`);
    } else {
      console.log('No changes needed - all products are up to date');
    }
    
    return { newCount, updatedCount };
  } catch (error) {
    console.error('Error storing products in Firestore:', error.message);
    throw error;
  }
}

// Main function to run the sync process
async function syncProducts() {
  console.log('========================================');
  console.log('Starting scheduled Shopify to Firebase sync');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('========================================');
  
  try {
    // Fetch products from Shopify
    const products = await fetchShopifyProducts();
    
    // Check for and remove deleted products
    const deletedCount = await checkForDeletedProducts(products);
    
    // Store products in Firestore with duplicate checking
    const { newCount, updatedCount } = await storeProductsInFirestore(products);
    
    console.log('========================================');
    console.log('Sync completed successfully');
    console.log(`Products fetched: ${products.length}`);
    console.log(`New products: ${newCount}`);
    console.log(`Updated products: ${updatedCount}`);
    console.log(`Deleted products: ${deletedCount}`);
    console.log('========================================');
    
    return {
      success: true,
      productsCount: products.length,
      newCount,
      updatedCount,
      deletedCount
    };
  } catch (error) {
    console.error('Error during sync process:', error.message);
    console.log('========================================');
    console.log('Sync failed');
    console.log('========================================');
    
    return {
      success: false,
      error: error.message
    };
  } finally {
    // Disconnect from Firebase to allow the script to exit
    await admin.app().delete();
  }
}

// Run the sync if this file is executed directly
if (require.main === module) {
  syncProducts()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

// Export for potential programmatic use
module.exports = { syncProducts }; 