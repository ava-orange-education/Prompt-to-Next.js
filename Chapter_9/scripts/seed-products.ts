// This script seeds the Firestore database with sample products
// Run this script from the v0 interface to populate your database

import { getDb } from "@/lib/firebase/config"
import { collection, addDoc, Timestamp } from "firebase/firestore"

const sampleProducts = [
  {
    name: "Wireless Headphones Pro",
    description: "Premium noise-cancelling wireless headphones with 30-hour battery life",
    price: 299.99,
    category: "Electronics",
    imageUrl: "/wireless-headphones.png",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "Smart Watch Ultra",
    description: "Advanced fitness tracking with heart rate monitor and GPS",
    price: 449.99,
    category: "Electronics",
    imageUrl: "/smartwatch-lifestyle.png",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "Cotton T-Shirt",
    description: "Comfortable 100% organic cotton t-shirt in multiple colors",
    price: 29.99,
    category: "Clothing",
    imageUrl: "/cotton-tshirt.png",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "Running Shoes",
    description: "Lightweight running shoes with advanced cushioning technology",
    price: 129.99,
    category: "Sports",
    imageUrl: "/running-shoes.jpg",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "Yoga Mat Premium",
    description: "Extra thick non-slip yoga mat with carrying strap",
    price: 49.99,
    category: "Sports",
    imageUrl: "/rolled-yoga-mat.png",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "Coffee Maker Deluxe",
    description: "Programmable coffee maker with thermal carafe",
    price: 89.99,
    category: "Home & Garden",
    imageUrl: "/modern-coffee-maker.png",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "LED Desk Lamp",
    description: "Adjustable LED desk lamp with USB charging port",
    price: 39.99,
    category: "Home & Garden",
    imageUrl: "/modern-desk-lamp.png",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "JavaScript: The Definitive Guide",
    description: "Comprehensive guide to JavaScript programming",
    price: 59.99,
    category: "Books",
    imageUrl: "/javascript-book.png",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "Bluetooth Speaker",
    description: "Portable waterproof Bluetooth speaker with 12-hour battery",
    price: 79.99,
    category: "Electronics",
    imageUrl: "/bluetooth-speaker.jpg",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "Denim Jeans",
    description: "Classic fit denim jeans with stretch comfort",
    price: 69.99,
    category: "Clothing",
    imageUrl: "/denim-jeans.png",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "Laptop Backpack",
    description: "Water-resistant laptop backpack with multiple compartments",
    price: 59.99,
    category: "Electronics",
    imageUrl: "/laptop-backpack.png",
    inStock: false,
    createdAt: Timestamp.now(),
  },
  {
    name: "Stainless Steel Water Bottle",
    description: "Insulated water bottle keeps drinks cold for 24 hours",
    price: 24.99,
    category: "Sports",
    imageUrl: "/reusable-water-bottle.png",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "Indoor Plant Set",
    description: "Set of 3 low-maintenance indoor plants with pots",
    price: 44.99,
    category: "Home & Garden",
    imageUrl: "/indoor-plants.png",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "Wireless Mouse",
    description: "Ergonomic wireless mouse with precision tracking",
    price: 34.99,
    category: "Electronics",
    imageUrl: "/wireless-mouse.png",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "Hoodie Sweatshirt",
    description: "Cozy fleece hoodie with kangaroo pocket",
    price: 49.99,
    category: "Clothing",
    imageUrl: "/cozy-hoodie.png",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "Cookbook Collection",
    description: "Set of 3 bestselling cookbooks for home chefs",
    price: 79.99,
    category: "Books",
    imageUrl: "/vintage-cookbook.png",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "Tennis Racket Pro",
    description: "Professional-grade tennis racket with carbon fiber frame",
    price: 199.99,
    category: "Sports",
    imageUrl: "/tennis-racket.png",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "Wall Art Canvas",
    description: "Modern abstract canvas wall art, 24x36 inches",
    price: 89.99,
    category: "Home & Garden",
    imageUrl: "/abstract-geometric-wall-art.png",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "Mechanical Keyboard",
    description: "RGB mechanical gaming keyboard with tactile switches",
    price: 149.99,
    category: "Electronics",
    imageUrl: "/mechanical-keyboard.png",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "Winter Jacket",
    description: "Insulated winter jacket with removable hood",
    price: 159.99,
    category: "Clothing",
    imageUrl: "/winter-jacket.png",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "Fitness Tracker Band",
    description: "Slim fitness tracker with sleep monitoring",
    price: 79.99,
    category: "Sports",
    imageUrl: "/fitness-tracker-lifestyle.png",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "Aromatherapy Diffuser",
    description: "Ultrasonic essential oil diffuser with LED lights",
    price: 34.99,
    category: "Home & Garden",
    imageUrl: "/aromatherapy-diffuser.jpg",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "Science Fiction Novel Set",
    description: "Bestselling sci-fi trilogy in hardcover",
    price: 64.99,
    category: "Books",
    imageUrl: "/scifi-books.jpg",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "USB-C Hub",
    description: "7-in-1 USB-C hub with HDMI and SD card reader",
    price: 44.99,
    category: "Electronics",
    imageUrl: "/usb-hub.png",
    inStock: true,
    createdAt: Timestamp.now(),
  },
  {
    name: "Sneakers Classic",
    description: "Timeless canvas sneakers in white",
    price: 54.99,
    category: "Clothing",
    imageUrl: "/white-sneakers.png",
    inStock: true,
    createdAt: Timestamp.now(),
  },
]

async function seedProducts() {
  try {
    console.log("[v0] Starting to seed products...")
    const db = getDb()
    const productsCollection = collection(db, "products")

    let count = 0
    for (const product of sampleProducts) {
      await addDoc(productsCollection, product)
      count++
      console.log(`[v0] Added product ${count}/${sampleProducts.length}: ${product.name}`)
    }

    console.log(`[v0] Successfully seeded ${count} products!`)
    return { success: true, count }
  } catch (error) {
    console.error("[v0] Error seeding products:", error)
    throw error
  }
}

// Run the seed function
seedProducts()
  .then((result) => {
    console.log("[v0] Seeding complete:", result)
  })
  .catch((error) => {
    console.error("[v0] Seeding failed:", error)
  })
