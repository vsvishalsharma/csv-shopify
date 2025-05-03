# Shopify to Firebase API

A Node.js server that fetches products from Shopify Admin GraphQL API, stores them in Firebase Firestore, and exposes REST API endpoints to retrieve product data.

## Features

- Fetches product data from Shopify using the Admin GraphQL API
- Stores products in Firebase Firestore database
- Provides REST API endpoints to retrieve product data
- Supports getting all products and individual products by ID

## Prerequisites

- Node.js and npm installed
- A Shopify store with Admin API access
- A Firebase project with Firestore enabled
- Shopify Admin API access token

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the project root with the following variables:
   ```
   SHOPIFY_SHOP_NAME=your-shop-name
   SHOPIFY_ACCESS_TOKEN=your-admin-api-access-token
   PORT=3000
   ```
4. Place your Firebase service account key file in the project root as `firebase-service-account.json`

## Usage

Start the server:
```
npm start
```

For development with auto-restart:
```
npm run dev
```

## API Endpoints

### GET /api/products
Returns all products stored in the Firestore database.

### GET /api/products/:id
Returns a specific product by its ID.

### POST /api/sync-products
Fetches products from Shopify and stores them in Firestore. This endpoint should be called whenever you want to update your product database.

## GraphQL vs REST API
This project uses Shopify's Admin GraphQL API instead of the REST API for fetching product data. GraphQL provides several advantages:

1. Efficient data fetching - Only request the specific fields you need
2. Reduced number of API calls - Fetch related data in a single request
3. Strongly typed schema - Better development experience
4. Improved flexibility - Easily adjust the data you're requesting without changing backend code 