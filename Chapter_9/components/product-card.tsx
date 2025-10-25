"use client"

import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Product } from "@/lib/firebase/products"
import { useInView } from "react-intersection-observer"
import { useEffect, useState } from "react"

interface ProductCardProps {
  product: Product
  priority?: boolean
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })
  const [shouldLoad, setShouldLoad] = useState(priority)

  useEffect(() => {
    if (inView) {
      setShouldLoad(true)
    }
  }, [inView])

  return (
    <Card ref={ref} className="group overflow-hidden transition-all hover:shadow-lg">
      <CardContent className="p-0">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {shouldLoad ? (
            <Image
              src={
                product.imageUrl || `/placeholder.svg?height=400&width=400&query=${encodeURIComponent(product.name)}`
              }
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform group-hover:scale-105"
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
              priority={priority}
            />
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
          {!product.inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Badge variant="secondary" className="text-sm">
                Out of Stock
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-2 p-4">
        <Badge variant="outline" className="text-xs">
          {product.category}
        </Badge>
        <h3 className="line-clamp-2 text-balance font-semibold leading-tight">{product.name}</h3>
        <p className="line-clamp-2 text-pretty text-sm text-muted-foreground">{product.description}</p>
        <p className="text-lg font-bold">${product.price.toFixed(2)}</p>
      </CardFooter>
    </Card>
  )
}
