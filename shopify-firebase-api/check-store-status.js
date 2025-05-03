// Check Shopify Store Status
require('dotenv').config();
const axios = require('axios');
const dns = require('dns');
const { promisify } = require('util');

const resolveDns = promisify(dns.resolve);

async function checkStoreStatus() {
  console.log('===== Shopify Store Status Check =====');
  
  // Get shop name from environment
  const shopName = process.env.SHOPIFY_SHOP_NAME?.replace('.myshopify.com', '');
  
  if (!shopName) {
    console.error('❌ SHOPIFY_SHOP_NAME is not set in your .env file');
    return;
  }
  
  console.log(`Checking status for: ${shopName}.myshopify.com`);
  
  // Check 1: DNS Resolution
  try {
    console.log('\n[CHECK 1] DNS Resolution');
    const dnsResult = await resolveDns(`${shopName}.myshopify.com`);
    console.log(`✅ DNS resolves to: ${dnsResult.join(', ')}`);
  } catch (error) {
    console.error(`❌ DNS resolution failed: ${error.message}`);
    console.error('The shop domain may not exist or DNS might be having issues.');
    return;
  }
  
  // Check 2: Status Code Check
  try {
    console.log('\n[CHECK 2] HTTP Status Check');
    const response = await axios.get(`https://${shopName}.myshopify.com`, {
      validateStatus: function (status) {
        return status < 500; // Accept any status code less than 500
      }
    });
    
    console.log(`Status code: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ Store is online and accessible');
      
      // Check for password protection
      if (response.data.includes('password') && response.data.includes('form')) {
        console.log('⚠️ Store is password protected (development/coming soon mode)');
      }
    } else if (response.status === 404) {
      console.error('❌ Store not found (404)');
    } else if (response.status === 401 || response.status === 403) {
      console.log('⚠️ Store requires authentication');
    } else {
      console.log(`⚠️ Received status ${response.status} from store`);
    }
  } catch (error) {
    console.error('❌ Error accessing store:', error.message);
  }
  
  // Check 3: Shopify Status
  try {
    console.log('\n[CHECK 3] Shopify Platform Status');
    const statusResponse = await axios.get('https://www.shopifystatus.com/api/v2/status.json');
    
    if (statusResponse.data.status.indicator === 'none') {
      console.log('✅ Shopify platform status: All systems operational');
    } else {
      console.log(`⚠️ Shopify platform status: ${statusResponse.data.status.description}`);
      console.log(`Current incidents: ${statusResponse.data.status.indicator} (${statusResponse.data.status.description})`);
    }
  } catch (error) {
    console.log('⚠️ Unable to check Shopify system status');
  }
  
  // Check 4: Admin Access
  try {
    console.log('\n[CHECK 4] Admin Access');
    const adminResponse = await axios.get(`https://${shopName}.myshopify.com/admin`, {
      validateStatus: function (status) {
        return status < 500; // Accept any status code less than 500
      },
      maxRedirects: 0
    });
    
    console.log(`Admin status code: ${adminResponse.status}`);
    
    if (adminResponse.status === 200) {
      console.log('✅ Admin area exists and is responding');
    } else if (adminResponse.status === 302 || adminResponse.status === 303) {
      console.log('✅ Admin area exists (redirects to login)');
    } else {
      console.log(`⚠️ Admin returned status ${adminResponse.status}`);
    }
  } catch (error) {
    if (error.response && error.response.status === 302) {
      console.log('✅ Admin area exists (redirects to login)');
    } else {
      console.log('⚠️ Could not verify admin area:', error.message);
    }
  }
  
  console.log('\n===== Store Check Complete =====');
  console.log('\nIf store is accessible but API calls fail:');
  console.log('1. Verify your access token is for this specific shop');
  console.log('2. Check that your app has been properly installed on this shop');
  console.log('3. Ensure your app has the necessary API scopes');
  console.log('4. The store may be on a development/trial plan with API restrictions');
}

// Run the check
checkStoreStatus(); 