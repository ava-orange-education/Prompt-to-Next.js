// Reset page whenever sort changes
useEffect(() => {
  setCurrentPage(1);
}, [sortField, sortDirection]);

// Filter + sort (no mutation)
const filteredAndSortedProducts = useMemo(() => {
  // ✅ always copy
  let base = [...products];

  if (debouncedSearchTerm) {
    const q = debouncedSearchTerm.toLowerCase();
    base = base.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }

  const dir = sortDirection === "asc" ? 1 : -1;
  base.sort((a, b) => {
    if (sortField === "updatedAt") {
      return (a.updatedAt.getTime() - b.updatedAt.getTime()) * dir;
    }
    if (sortField === "price" || sortField === "stock") {
      return ((a[sortField] as number) - (b[sortField] as number)) * dir;
    }
    return String(a[sortField]).localeCompare(String(b[sortField])) * dir;
  });

  return base;
}, [products, debouncedSearchTerm, sortField, sortDirection]);
