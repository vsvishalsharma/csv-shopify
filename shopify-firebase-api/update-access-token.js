// Update Shopify Access Token script
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(__dirname, '.env');

console.log('Update Shopify Access Token');
console.log('========================');

// Check if .env exists
if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found. Please run create-env.js first.');
  rl.close();
  return;
}

// Read current .env file
const envContent = fs.readFileSync(envPath, 'utf8');

// Get current values
let current = {};
envContent.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, value] = line.split('=');
    current[key.trim()] = value.trim();
  }
});

console.log(`Current shop: ${current['SHOPIFY_SHOP_NAME'] || 'Not set'}`);
console.log(`Current access token: ${current['SHOPIFY_ACCESS_TOKEN'] ? '********' : 'Not set'}`);

// Prompt for new access token
rl.question('\nEnter new Shopify Access Token: ', (token) => {
  if (!token.trim()) {
    console.log('No token provided. Exiting without changes.');
    rl.close();
    return;
  }

  // Update the access token in the env content
  const updatedContent = envContent.replace(
    /SHOPIFY_ACCESS_TOKEN=.*/,
    `SHOPIFY_ACCESS_TOKEN=${token.trim()}`
  );

  // Write back to .env file
  fs.writeFileSync(envPath, updatedContent);
  console.log('✅ Access token updated successfully!');
  rl.close();
});

rl.on('close', () => {
  console.log('\nDone! Restart your server to apply changes.');
  process.exit(0);
}); 