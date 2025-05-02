# Shopify API Service

A Node.js application that interacts directly with the Shopify API to fetch product data and calculate custom pricing based on product dimensions.

## Features

- Direct integration with Shopify Admin API
- Fetch product information from your Shopify store
- Search for products
- Price calculation based on product dimensions (width)
- Custom pricing formulas for different product types

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A Shopify store with Admin API access

## Installation

1. Clone this repository:
   ```
   git clone <repository-url>
   cd shopify-api-service
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up your Shopify API credentials:
   ```
   node create-env.js
   ```
   This interactive script will guide you through creating your `.env` file with the required credentials.

   Alternatively, you can manually create a `.env` file in the root directory with:
   ```
   # Shopify API Credentials
   SHOPIFY_API_KEY=your_api_key_here
   SHOPIFY_API_SECRET=your_api_secret_here
   SHOPIFY_SHOP_NAME=your_shop_name_here
   SHOPIFY_ACCESS_TOKEN=your_access_token_here

   # Server configuration
   PORT=3000
   ```

4. Verify your credentials:
   ```
   node verify-credentials.js
   ```

5. Test your Shopify API connection:
   ```
   node test-shopify.js
   ```

## Getting Shopify API Credentials

1. Create a custom app in your Shopify admin:
   - Go to your Shopify admin
   - Navigate to Apps > Develop apps
   - Click "Create an app"
   - Give your app a name and click "Create app"

2. Configure app scopes:
   - Under "API access", click "Configure"
   - Add the following scopes:
     - `read_products`
     - `write_products`
   - Click "Save"

3. Get your API credentials:
   - Under "API credentials", click "Install app"
   - Note your API key, API secret key, and Access token
   - Add these to your `.env` file or use the `node create-env.js` script

## Usage

### Start the server

```
npm start
```

For development with automatic restart:

```
npm run dev
```

### API Endpoints

#### Get Products

```
GET /api/products?limit=10
```

Parameters:
- `limit` (optional): Number of products to return (default: 10)

#### Get Product by ID

```
GET /api/:id
```

Parameters:
- `:id`: The Shopify product ID

#### Calculate Price

```
POST /api/calculate-price
```

Request body:
```json
{
  "productId": "123456789",
  "width": 150
}
```

Parameters:
- `productId`: The Shopify product ID
- `width`: The width in centimeters to calculate the price for

#### Search Products

```
GET /api/search/products?query=sofa&limit=10
```

Parameters:
- `query`: The search term
- `limit` (optional): Number of products to return (default: 10)

## Price Calculation Logic

The API includes special price calculation logic for certain product types:

- **Sofas**: Base price + 200 shekels for every 10cm over 100cm width
- **TV Stands**: Base price + 150 shekels for every 10cm over 100cm width

## Troubleshooting

If you encounter issues with the Shopify API connection, try the following:

1. **Verify your credentials**:
   ```
   node verify-credentials.js
   ```
   This will check if all required environment variables are set properly.

2. **Test the API connection**:
   ```
   node test-shopify.js
   ```
   This performs basic connectivity tests to ensure your Shopify API is accessible.

3. **Common issues**:
   - **404 Not Found**: Check your shop name is correct. It should be the subdomain of your `.myshopify.com` URL.
   - **401 Unauthorized**: Your access token is invalid or expired. Generate a new one.
   - **403 Forbidden**: Your app doesn't have the required scopes. Update the app's permissions.

4. **Regenerating the .env file**:
   If your credentials are incorrect, you can regenerate the .env file:
   ```
   node create-env.js
   ```

## License

[MIT](LICENSE) 