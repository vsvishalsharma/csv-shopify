// Firebase Setup Script

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

async function setupFirebase() {
  console.log('Starting Firebase setup...');
  
  // Check if service account exists
  if (!fs.existsSync('./firebase-service-account.json')) {
    console.error('ERROR: firebase-service-account.json not found!');
    console.log('\nPlease follow these steps to get your service account:');
    console.log('1. Go to https://console.firebase.google.com/');
    console.log('2. Select your project');
    console.log('3. Go to Project Settings > Service accounts');
    console.log('4. Click "Generate new private key"');
    console.log('5. Save the file as firebase-service-account.json in this directory');
    process.exit(1);
  }
  
  try {
    const serviceAccount = require('./firebase-service-account.json');
    
    console.log('Service account loaded:');
    console.log('- Project ID:', serviceAccount.project_id);
    console.log('- Client Email:', serviceAccount.client_email);
    
    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      console.error('ERROR: Service account file is missing required fields!');
      process.exit(1);
    }
    
    // Initialize Firebase
    console.log('\nInitializing Firebase connection...');
    initializeApp({
      credential: cert(serviceAccount)
    });
    
    const db = getFirestore();
    
    // Check for existing collections
    console.log('\nChecking Firestore database...');
    try {
      const collections = await db.listCollections();
      console.log(`Found ${collections.length} collections in Firestore.`);
      
      if (collections.length > 0) {
        console.log('Collections:');
        collections.forEach(col => {
          console.log(`- ${col.id}`);
        });
      } else {
        console.log('No collections found. This might indicate the database was not created yet.');
        
        // Try to create a test collection to initialize the database
        console.log('\nAttempting to create a test collection to initialize the database...');
        try {
          await db.collection('test_collection').doc('test_doc').set({
            initialized: true,
            timestamp: new Date().toISOString()
          });
          console.log('✅ Successfully created test document. Firestore database is now initialized.');
          
          // Verify by reading it back
          const testDoc = await db.collection('test_collection').doc('test_doc').get();
          if (testDoc.exists) {
            console.log('✅ Verified read access to the test document.');
            
            // Clean up
            await db.collection('test_collection').doc('test_doc').delete();
            console.log('✅ Cleaned up test document.');
          }
        } catch (error) {
          console.error('❌ Failed to initialize database:', error);
          return false;
        }
      }
      
      // Create the products collection if it doesn't exist
      let productCollectionExists = false;
      for (const col of collections) {
        if (col.id === 'products') {
          productCollectionExists = true;
          break;
        }
      }
      
      if (!productCollectionExists) {
        console.log('\nCreating products collection...');
        try {
          await db.collection('products').doc('test-product').set({
            name: 'Test Product',
            price: 99.99,
            description: 'This is a test product to initialize the products collection',
            createdAt: new Date().toISOString()
          });
          console.log('✅ Products collection created successfully');
          
          // Clean up test product
          await db.collection('products').doc('test-product').delete();
        } catch (error) {
          console.error('❌ Failed to create products collection:', error);
          return false;
        }
      } else {
        console.log('✅ Products collection already exists');
      }
      
      console.log('\n✅ Firebase setup completed successfully!');
      console.log('You can now run your application:');
      console.log('$ node index.js');
      
      return true;
    } catch (error) {
      console.error('\nERROR: Failed to access Firestore database:', error);
      console.log('\nPossible issues:');
      console.log('1. Your service account might not have the necessary permissions');
      console.log('2. The Firestore database might not be created in your Firebase project');
      console.log('3. Firebase project ID in service account might be incorrect');
      console.log('\nTo create a Firestore database, follow these steps:');
      console.log('1. Go to https://console.firebase.google.com/');
      console.log('2. Select your project');
      console.log('3. Click on "Firestore Database" in the left sidebar');
      console.log('4. Click "Create database" and follow the setup wizard');
      console.log('5. Choose either production or test mode (for now)');
      console.log('6. Select a location close to your users');
      console.log('7. Click "Enable"');
      return false;
    }
  } catch (error) {
    console.error('Error processing service account:', error);
    return false;
  }
}

// Run the setup
setupFirebase()
  .then(success => {
    if (!success) {
      console.log('\nSetup failed. Please fix the issues and try again.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error during setup:', error);
    process.exit(1);
  }); 