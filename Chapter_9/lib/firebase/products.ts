import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  type DocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const MOCK_PRODUCTS = [
  {
    id: "1",
    name: "Wireless Headphones",
    description: "Premium noise-cancelling wireless headphones with 30-hour battery life",
    price: 299.99,
    category: "Electronics",
    imageUrl: "/wireless-headphones.png",
    inStock: true,
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    name: "Smart Watch Pro",
    description: "Advanced fitness tracking with heart rate monitor and GPS",
    price: 399.99,
    category: "Electronics",
    imageUrl: "/smartwatch-lifestyle.png",
    inStock: true,
    createdAt: new Date("2024-01-14"),
  },
  {
    id: "3",
    name: "Organic Cotton T-Shirt",
    description: "Comfortable and sustainable everyday wear",
    price: 29.99,
    category: "Clothing",
    imageUrl: "/cotton-tshirt.png",
    inStock: true,
    createdAt: new Date("2024-01-13"),
  },
  {
    id: "4",
    name: "Running Shoes",
    description: "Lightweight performance running shoes with responsive cushioning",
    price: 129.99,
    category: "Sports",
    imageUrl: "/running-shoes.jpg",
    inStock: true,
    createdAt: new Date("2024-01-12"),
  },
  {
    id: "5",
    name: "Yoga Mat Premium",
    description: "Extra thick non-slip yoga mat for ultimate comfort",
    price: 49.99,
    category: "Sports",
    imageUrl: "/rolled-yoga-mat.png",
    inStock: true,
    createdAt: new Date("2024-01-11"),
  },
  {
    id: "6",
    name: "Coffee Maker Deluxe",
    description: "Programmable coffee maker with thermal carafe",
    price: 89.99,
    category: "Home & Garden",
    imageUrl: "/modern-coffee-maker.png",
    inStock: true,
    createdAt: new Date("2024-01-10"),
  },
  {
    id: "7",
    name: "LED Desk Lamp",
    description: "Adjustable brightness desk lamp with USB charging port",
    price: 45.99,
    category: "Home & Garden",
    imageUrl: "/modern-desk-lamp.png",
    inStock: true,
    createdAt: new Date("2024-01-09"),
  },
  {
    id: "8",
    name: "JavaScript: The Definitive Guide",
    description: "Comprehensive guide to JavaScript programming",
    price: 59.99,
    category: "Books",
    imageUrl: "/javascript-book.png",
    inStock: true,
    createdAt: new Date("2024-01-08"),
  },
]

function initializeFirebase() {
  if (typeof window === "undefined") {
    return null
  }

  try {
    if (getApps().length > 0) {
      return getApp()
    }
    return initializeApp(firebaseConfig)
  } catch (error) {
    console.error("[v0] Firebase initialization error:", error)
    return null
  }
}

export function getDb() {
  const app = initializeFirebase()
  if (!app) {
    return null
  }

  try {
    return getFirestore(app)
  } catch (error) {
    console.error("[v0] Firestore initialization error:", error)
    return null
  }
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  imageUrl: string
  inStock: boolean
  createdAt: Date
}

export interface ProductFilters {
  category?: string
  minPrice?: number
  maxPrice?: number
}

export interface PaginationParams {
  pageSize: number
  lastDoc?: DocumentSnapshot | null
}

async function fetchProductsFromMockData(
  filters: ProductFilters = {},
  pagination: PaginationParams = { pageSize: 20 },
) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  let filteredProducts = [...MOCK_PRODUCTS]

  // Apply category filter
  if (filters.category && filters.category !== "all") {
    filteredProducts = filteredProducts.filter((p) => p.category === filters.category)
  }

  // Apply price filters
  if (filters.minPrice !== undefined) {
    filteredProducts = filteredProducts.filter((p) => p.price >= filters.minPrice!)
  }
  if (filters.maxPrice !== undefined) {
    filteredProducts = filteredProducts.filter((p) => p.price <= filters.maxPrice!)
  }

  // Sort by date
  filteredProducts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  // Simple pagination (in real app, this would use lastDoc)
  const startIndex = 0 // In real implementation, track this based on lastDoc
  const endIndex = startIndex + pagination.pageSize
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  return {
    products: paginatedProducts,
    lastDoc: null,
    hasMore: endIndex < filteredProducts.length,
  }
}

export async function fetchProducts(filters: ProductFilters = {}, pagination: PaginationParams = { pageSize: 20 }) {
  try {
    const database = getDb()

    if (!database) {
      console.warn(
        "[v0] Firebase not available - using mock data. To use real Firebase, ensure your project is properly configured.",
      )
      return await fetchProductsFromMockData(filters, pagination)
    }

    const constraints: QueryConstraint[] = []

    if (filters.category && filters.category !== "all") {
      constraints.push(where("category", "==", filters.category))
    }

    if (filters.minPrice !== undefined) {
      constraints.push(where("price", ">=", filters.minPrice))
    }
    if (filters.maxPrice !== undefined) {
      constraints.push(where("price", "<=", filters.maxPrice))
    }

    constraints.push(orderBy("createdAt", "desc"))

    if (pagination.lastDoc) {
      constraints.push(startAfter(pagination.lastDoc))
    }
    constraints.push(limit(pagination.pageSize))

    const productsQuery = query(collection(database, "products"), ...constraints)
    const snapshot = await getDocs(productsQuery)

    const products: Product[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Product[]

    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null
    const hasMore = snapshot.docs.length === pagination.pageSize

    return {
      products,
      lastDoc: lastVisible,
      hasMore,
    }
  } catch (error) {
    console.error("[v0] Error fetching products, falling back to mock data:", error)
    return await fetchProductsFromMockData(filters, pagination)
  }
}

export async function fetchCategories(): Promise<string[]> {
  try {
    return ["Electronics", "Clothing", "Home & Garden", "Sports", "Books"]
  } catch (error) {
    console.error("[v0] Error fetching categories:", error)
    return []
  }
}
