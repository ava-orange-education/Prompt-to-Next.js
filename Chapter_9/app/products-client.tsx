"use client"

import { Suspense } from "react"
import { ProductFilters } from "@/components/product-filters"
import { ProductGrid } from "@/components/product-grid"
import { ProductGridSkeleton } from "@/components/product-skeleton"
import { useProductsStore } from "@/lib/store/products-store"

const CATEGORIES = ["Electronics", "Clothing", "Home & Garden", "Sports", "Books"]

// Client wrapper for filters to handle state
function ProductFiltersClient() {
  const { setFilters } = useProductsStore()

  return <ProductFilters categories={CATEGORIES} onFilterChange={setFilters} />
}

export function ProductsPageClient() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-balance text-3xl font-bold tracking-tight lg:text-4xl">Discover Products</h1>
          <p className="mt-2 text-pretty text-muted-foreground">Browse our curated collection of premium products</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 lg:shrink-0">
            <div className="sticky top-8">
              <ProductFiltersClient />
            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            <Suspense fallback={<ProductGridSkeleton />}>
              <ProductGrid />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  )
}
