// components/inventory/InventoryTable.tsx (excerpt)
"use client";
import { useEffect, useMemo, useState } from "react";
import { mockProducts, type Product } from "@/lib/mock/products";

type SortField = keyof Product;
type SortDirection = "asc" | "desc";

export default function InventoryTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ✅ Reset page when sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortField, sortDirection]);

  // ✅ Filter + sort on a copy
  const filteredAndSortedProducts = useMemo(() => {
    let base = [...mockProducts];
    if (debouncedSearchTerm) {
      const q = debouncedSearchTerm.toLowerCase();
      base = base.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      );
    }

    const dir = sortDirection === "asc" ? 1 : -1;
    const cmp = (a: Product, b: Product) => {
      if (sortField === "updatedAt") {
        return (a.updatedAt.getTime() - b.updatedAt.getTime()) * dir;
      }
      if (sortField === "stock" || sortField === "price") {
        return ((a[sortField] as number) - (b[sortField] as number)) * dir;
      }
      return String(a[sortField]).localeCompare(String(b[sortField])) * dir;
    };
    return base.sort(cmp);
  }, [debouncedSearchTerm, sortField, sortDirection]);

  // (pagination + rendering unchanged)
}
