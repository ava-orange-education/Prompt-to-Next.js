# Product Grid with Firestore & Zustand

A scalable, performant product browsing experience built with Next.js 16, Firestore, and Zustand.

## Features

- **Server-Side Pagination**: Firestore queries with `limit(20)` and `startAfter()` for efficient data loading
- **Advanced Filtering**: Category and price range filters using Firestore `where()` queries
- **Global State Management**: Zustand store synchronizes filters, pagination, and results
- **Image Optimization**: Next.js Image component with blur placeholders and responsive sizes
- **Lazy Loading**: Intersection Observer for offscreen product cards
- **SEO Optimized**: Structured data (Product schema) for search engines
- **Loading States**: Skeleton screens for better perceived performance
- **Error Handling**: Explicit empty and error states throughout

## Setup

### 1. Firebase Configuration

Your Firebase environment variables are already configured in this v0 project. You can view them in the **Vars** section of the in-chat sidebar.

The following variables are set:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### 2. Seed Sample Products

Run the seed script to populate your Firestore database with 25 sample products:

1. The script is located at `scripts/seed-products.ts`
2. Click the "Run" button in v0 to execute the script
3. Check the console logs to confirm products were added successfully

### 3. Firestore Indexes (Required)

Create composite indexes in your Firebase Console for efficient queries:

**Index 1: Category + Price + CreatedAt**
- Collection: `products`
- Fields:
  - `category` (Ascending)
  - `price` (Ascending)
  - `createdAt` (Descending)

**Index 2: Price + CreatedAt**
- Collection: `products`
- Fields:
  - `price` (Ascending)
  - `createdAt` (Descending)

**To create indexes:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Firestore Database → Indexes
4. Click "Create Index" and add the fields above

### 4. Firestore Security Rules

Update your Firestore security rules to allow read access:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{productId} {
      allow read: if true;
      allow write: if false; // Read-only for public
    }
  }
}
\`\`\`

## Data Structure

Products collection documents contain:

\`\`\`typescript
{
  name: string           // Product name
  description: string    // Product description
  price: number         // Price in USD
  category: string      // One of: Electronics, Clothing, Home & Garden, Sports, Books
  imageUrl: string      // Path to product image
  inStock: boolean      // Availability status
  createdAt: Timestamp  // Creation timestamp for sorting
}
\`\`\`

## Architecture

- **No Client-Side Filtering**: All filtering happens in Firestore queries for scalability
- **Lazy Initialization**: Firebase is initialized only on the client side to prevent SSR errors
- **Optimistic Loading**: Products load immediately with skeleton states
- **Responsive Design**: Mobile-first with adaptive layouts
- **Performance**: Lazy loading, image optimization, and efficient re-renders

## Key Files

- `lib/firebase/config.ts` - Firebase initialization with lazy loading
- `lib/firebase/products.ts` - Firestore queries and data fetching
- `lib/store/products-store.ts` - Zustand state management
- `components/product-grid.tsx` - Main grid with pagination
- `components/product-filters.tsx` - Filter UI and logic
- `scripts/seed-products.ts` - Database seeding script

## Troubleshooting

**Error: "Service firestore is not available"**
- This has been fixed with lazy initialization. Firebase now only initializes on the client side.

**No products showing**
- Run the seed script at `scripts/seed-products.ts`
- Check that your Firebase environment variables are set correctly in the Vars section
- Verify Firestore security rules allow read access

**Filtering not working**
- Create the required composite indexes in Firebase Console (see step 3 above)
- Firestore will show an error with a direct link to create the index if it's missing

**Images not loading**
- The seed script uses placeholder images that are generated automatically
- For production, replace `imageUrl` values with your actual product images
