"use client"

import { useEffect, useCallback, useState } from "react"
import { ProductCard } from "./product-card"
import { ProductGridSkeleton } from "./product-skeleton"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useProductsStore } from "@/lib/store/products-store"
import { AlertCircle, Package } from "lucide-react"

export function ProductGrid() {
  const { products, filters, hasMore, isLoading, error, resetPagination, fetchProducts } = useProductsStore()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const loadProducts = useCallback(
    async (append = false) => {
      if (!isMounted) return
      await fetchProducts(append)
    },
    [fetchProducts, isMounted],
  )

  useEffect(() => {
    if (!isMounted) return

    resetPagination()
    loadProducts(false)
  }, [filters, isMounted]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = () => {
    loadProducts(true)
  }

  if (error && products.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!isLoading && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="mb-4 h-16 w-16 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-semibold">No products found</h3>
        <p className="text-sm text-muted-foreground">Try adjusting your filters to see more results</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} priority={index < 4} />
        ))}
      </div>

      {isLoading && <ProductGridSkeleton />}

      {!isLoading && hasMore && (
        <div className="flex justify-center">
          <Button onClick={handleLoadMore} variant="outline" size="lg">
            Load More Products
          </Button>
        </div>
      )}

      {!isLoading && !hasMore && products.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">You've reached the end of the catalog</p>
      )}
    </div>
  )
}
