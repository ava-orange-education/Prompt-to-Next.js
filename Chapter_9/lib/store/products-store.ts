import { create } from "zustand"
import type { DocumentSnapshot } from "firebase/firestore"
import type { Product, ProductFilters } from "@/lib/firebase/products"
import { fetchProducts as fetchProductsFromFirebase } from "@/lib/firebase/products"

interface ProductsState {
  products: Product[]
  filters: ProductFilters
  lastDoc: DocumentSnapshot | null
  hasMore: boolean
  isLoading: boolean
  error: string | null

  // Actions
  setProducts: (products: Product[]) => void
  appendProducts: (products: Product[]) => void
  setFilters: (filters: ProductFilters) => void
  setLastDoc: (doc: DocumentSnapshot | null) => void
  setHasMore: (hasMore: boolean) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  resetPagination: () => void
  fetchProducts: (append?: boolean) => Promise<void>
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  filters: {},
  lastDoc: null,
  hasMore: true,
  isLoading: false,
  error: null,

  setProducts: (products) => set({ products }),
  appendProducts: (products) => set((state) => ({ products: [...state.products, ...products] })),
  setFilters: (filters) => set({ filters }),
  setLastDoc: (doc) => set({ lastDoc: doc }),
  setHasMore: (hasMore) => set({ hasMore }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  resetPagination: () => set({ products: [], lastDoc: null, hasMore: true }),

  fetchProducts: async (append = false) => {
    const state = get()

    set({ isLoading: true, error: null })

    try {
      const result = await fetchProductsFromFirebase(state.filters, {
        pageSize: 20,
        lastDoc: append ? state.lastDoc : null,
      })

      if (append) {
        set({
          products: [...state.products, ...result.products],
          lastDoc: result.lastDoc,
          hasMore: result.hasMore,
          isLoading: false,
        })
      } else {
        set({
          products: result.products,
          lastDoc: result.lastDoc,
          hasMore: result.hasMore,
          isLoading: false,
        })
      }
    } catch (error) {
      console.error("[v0] Error in fetchProducts:", error)
      set({
        error: error instanceof Error ? error.message : "Failed to fetch products",
        isLoading: false,
      })
    }
  },
}))
