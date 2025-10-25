"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ProductFilters as Filters } from "@/lib/firebase/products"
import { Filter, X } from "lucide-react"

interface ProductFiltersProps {
  categories: string[]
  onFilterChange: (filters: Filters) => void
  initialFilters?: Filters
}

export function ProductFilters({ categories, onFilterChange, initialFilters = {} }: ProductFiltersProps) {
  const [category, setCategory] = useState(initialFilters.category || "all")
  const [minPrice, setMinPrice] = useState(initialFilters.minPrice?.toString() || "")
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice?.toString() || "")
  const [isOpen, setIsOpen] = useState(false)

  const handleApplyFilters = () => {
    const filters: Filters = {}

    if (category !== "all") {
      filters.category = category
    }
    if (minPrice) {
      filters.minPrice = Number.parseFloat(minPrice)
    }
    if (maxPrice) {
      filters.maxPrice = Number.parseFloat(maxPrice)
    }

    onFilterChange(filters)
    setIsOpen(false)
  }

  const handleClearFilters = () => {
    setCategory("all")
    setMinPrice("")
    setMaxPrice("")
    onFilterChange({})
  }

  const hasActiveFilters = category !== "all" || minPrice || maxPrice

  return (
    <>
      {/* Mobile Filter Button */}
      <div className="lg:hidden">
        <Button variant="outline" onClick={() => setIsOpen(!isOpen)} className="w-full">
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {[category !== "all", minPrice, maxPrice].filter(Boolean).length}
            </span>
          )}
        </Button>
      </div>

      {/* Filter Panel */}
      <Card className={`${isOpen ? "block" : "hidden"} lg:block`}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-8 px-2 text-xs">
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Category Filter */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Range Filter */}
          <div className="space-y-2">
            <Label>Price Range</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                min="0"
                step="0.01"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Apply Button */}
          <Button onClick={handleApplyFilters} className="w-full">
            Apply Filters
          </Button>
        </CardContent>
      </Card>
    </>
  )
}
