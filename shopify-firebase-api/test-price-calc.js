function applyPricingFormulaWithSize(product, width) {
    const processedProduct = { ...product };
    const productType = (product.Type || product.ProductType || '').toLowerCase();
    const originalPrice = parseFloat(product.Price || product.price || 0);
    let basePrice = originalPrice;
  
    if (productType.includes('sofa') && !productType.includes('corner') && width > 0) {
      const widthDifference = width - 100;
      if (widthDifference > 0) {
        const priceIncrease = Math.ceil(widthDifference / 10) * 200;
        basePrice += priceIncrease;
      }
    }
  
    if ((productType.includes('tv') && productType.includes('stand')) && width > 0) {
      const widthDifference = width - 100;
      if (widthDifference > 0) {
        const priceIncrease = Math.ceil(widthDifference / 10) * 150;
        basePrice += priceIncrease;
      }
    }
  
    processedProduct.calculatedWidth = width;
    processedProduct.Price = basePrice.toString();
    processedProduct.OriginalPrice = originalPrice.toString();
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
    console.log(`   • ✅ Test ${match ? 'Passed' : `❌ Failed`}\n`);
  }
  