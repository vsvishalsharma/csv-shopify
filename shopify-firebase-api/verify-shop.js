// Verify Shopify Shop Name
require('dotenv').config();
const axios = require('axios');

async function verifyShopName() {
  console.log('Verifying Shopify Shop Name');
  console.log('==========================');
  
  // Get shop name from environment
  const shopName = process.env.SHOPIFY_SHOP_NAME?.replace('.myshopify.com', '');
  
  if (!shopName) {
    console.error('❌ SHOPIFY_SHOP_NAME is not set in your .env file');
    return;
  }
  
  console.log(`Checking if shop exists: ${shopName}.myshopify.com`);
  
  try {
    // Try to access the storefront (public facing shop)
    console.log('\nAttempting to access storefront...');
    const response = await axios.get(`https://${shopName}.myshopify.com`, {
      validateStatus: function (status) {
        return status < 500; // Accept any status code less than 500
      }
    });
    
    if (response.status === 200) {
      console.log('✅ Shop storefront is accessible!');
      
      // Check if the page contains password form (password-protected shop)
      if (response.data.includes('password') && response.data.includes('form')) {
        console.log('⚠️ Note: The shop appears to be password protected');
      }
    } else if (response.status === 401) {
      console.log('⚠️ Shop exists but requires password authentication');
    } else if (response.status === 404) {
      console.error('❌ Shop not found! The shop name may be incorrect.');
    } else {
      console.log(`⚠️ Received status code ${response.status} when accessing the shop`);
    }
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      console.error('❌ Shop domain does not exist!');
      console.error('Please check if the shop name is spelled correctly.');
    } else {
      console.error('❌ Error accessing shop:', error.message);
    }
  }
  
  // Try to verify shop name with admin API endpoint
  try {
    console.log('\nChecking admin API endpoint...');
    const adminResponse = await axios.get(`https://${shopName}.myshopify.com/admin`, {
      validateStatus: function (status) {
        return status < 500; // Accept any status code less than 500
      }
    });
    
    if (adminResponse.status === 200 || adminResponse.status === 302 || adminResponse.status === 403) {
      console.log('✅ Shop admin endpoint exists');
    } else if (adminResponse.status === 404) {
      console.error('❌ Shop admin endpoint not found! The shop name may be incorrect.');
    } else {
      console.log(`⚠️ Received status code ${adminResponse.status} when accessing the admin endpoint`);
    }
  } catch (error) {
    console.error('❌ Error accessing shop admin:', error.message);
  }
  
  console.log('\nSuggested Actions:');
  console.log('1. Double-check the shop name in your .env file');
  console.log('2. If the shop name is correct, try updating your access token');
  console.log('3. Ensure your app has been properly installed on the shop');
  console.log('4. Check if your shop is on a paid plan (some API features require a paid plan)');
}

// Run the verification
verifyShopName(); 