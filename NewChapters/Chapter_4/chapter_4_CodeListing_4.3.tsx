"use client";

import { useState, useMemo, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
  updatedAt: Date;
}

type SortField = keyof Product;
type SortDirection = "asc" | "desc";

export default function InventoryTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ... debounced search + sort/pagination state omitted for brevity

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const productsCollection = collection(db, "products");
        const productsSnapshot = await getDocs(productsCollection);

        const productsData = productsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            sku: data.sku,
            stock: data.stock,
            price: data.price,
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Product;
        });

        setProducts(productsData);
      } catch (err) {
        setError(
          "Failed to load products. Please check your Firebase configuration."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // ... filtering/sorting/pagination render follows
}
