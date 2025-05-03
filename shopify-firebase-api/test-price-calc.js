// Import the pricing calculation logic from server.js
// This file is for testing the price calculation logic independently

// This function matches the logic in server.js
function calculateCustomPrice(product, width) {
  // Default behavior: return the original price of the first variant
  let basePrice = 0;
  if (product.variants && product.variants.length > 0) {
    basePrice = parseFloat(product.variants[0].price);
  } else if (product.Price) {
    basePrice = parseFloat(product.Price);
  }

  // If no width provided or invalid width, return the base price
  if (!width || isNaN(parseFloat(width))) {
    return basePrice;
  }
  
  width = parseFloat(width);
  
  // Get product type (convert to lowercase for case-insensitive comparison)
  const productType = (product.productType || product.Type || '').toLowerCase();
  
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

// Helper function for testing
function applyPricingFormulaWithSize(product, width) {
  const processedProduct = { ...product };
  const calculatedPrice = calculateCustomPrice(product, width);
  
  processedProduct.calculatedWidth = width;
  processedProduct.Price = calculatedPrice.toString();
  processedProduct.OriginalPrice = (product.Price || '0').toString();
  
  return processedProduct;
}

// --- Dummy test data ---
const testCases = [
  {
    input: {
      product: { Type: 'Sofa', Price: '3000' },
      width: 100
    },
    expectedPrice: '3000',
    description: 'Base width for sofa'
  },
  {
    input: {
      product: { Type: 'Sofa', Price: '3000' },
      width: 120
    },
    expectedPrice: '3400',
    description: 'Sofa with +20cm'
  },
  {
    input: {
      product: { Type: 'TV Stand', Price: '2000' },
      width: 130
    },
    expectedPrice: '2450',
    description: 'TV Stand with +30cm'
  },
  {
    input: {
      product: { Type: 'Corner Sofa', Price: '5000' },
      width: 150
    },
    expectedPrice: '5000',
    description: 'Corner sofa - should not change'
  }
];

// --- Run tests ---
console.log('\n🔍 Running Pricing Logic Test Cases:\n');

for (const { input, expectedPrice, description } of testCases) {
  const result = applyPricingFormulaWithSize(input.product, input.width);

  const original = result.OriginalPrice;
  const calculated = result.Price;
  const match = calculated === expectedPrice;

  console.log(`🧪 ${description}`);
  console.log(`   • Original Price   : ₹${original}`);
  console.log(`   • Width Provided   : ${input.width} cm`);
  console.log(`   • Calculated Price : ₹${calculated}`);
  console.log(`   • Expected Price   : ₹${expectedPrice}`);
  console.log(`   • ${match ? '✅ Test Passed' : '❌ Test Failed'}\n`);
}
  