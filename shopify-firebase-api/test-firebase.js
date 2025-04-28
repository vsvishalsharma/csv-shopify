// Simple Firebase connection test

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

// Check if service account file exists
if (!fs.existsSync('./firebase-service-account.json')) {
  console.error('ERROR: firebase-service-account.json not found!');
  process.exit(1);
}

// Load and validate service account
try {
  const serviceAccount = require('./firebase-service-account.json');
  
  console.log('Service account details:');
  console.log('- Project ID:', serviceAccount.project_id);
  console.log('- Client Email:', serviceAccount.client_email);
  
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    console.error('ERROR: Service account file is missing required fields!');
    process.exit(1);
  }
  
  // Initialize Firebase
  console.log('\nInitializing Firebase...');
  initializeApp({
    credential: cert(serviceAccount)
  });
  
  const db = getFirestore();
  
  // Test Firestore write
  async function testFirestore() {
    try {
      console.log('\nTesting Firestore write...');
      const testCollection = 'test_collection';
      const testDoc = 'test_document';
      const testData = { 
        testField: 'Test value', 
        timestamp: new Date().toISOString() 
      };
      
      // Attempt to write a document
      await db.collection(testCollection).doc(testDoc).set(testData);
      console.log('✅ Successfully wrote to Firestore');
      
      // Read it back to confirm
      const docRef = db.collection(testCollection).doc(testDoc);
      const doc = await docRef.get();
      
      if (doc.exists) {
        console.log('✅ Successfully read from Firestore');
        console.log('Document data:', doc.data());
      } else {
        console.log('❌ Document does not exist after writing!');
      }
      
      // Clean up
      await docRef.delete();
      console.log('✅ Successfully deleted test document');
      
      console.log('\nFirebase connection test completed successfully!');
    } catch (error) {
      console.error('\n❌ Firebase test failed with error:', error);
      console.error('\nPossible issues:');
      console.error('1. Firebase service account may not have proper permissions');
      console.error('2. Firestore database may not be created in your Firebase project');
      console.error('3. Project ID in service account may be incorrect');
      console.error('4. Network or firewall issues preventing connection');
    }
  }
  
  // Run the test
  testFirestore();
  
} catch (error) {
  console.error('Error loading service account:', error);
  process.exit(1);
} 