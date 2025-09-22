useEffect(() => {
  setLoading(true);
  setError(null);

  // ✅ Why: Constrain queries at the source.
  // Streams only the most recent 100 documents instead of the full collection.
  const q = query(
    collection(db, "products"),
    orderBy("updatedAt", "desc"), // Show most recent changes first
    limit(100) // Keep the stream lightweight
  );

  let first = true;
  const unsubscribe = onSnapshot(
    q,
    (snap) => {
      // ✅ Why: Defensive mapping against missing or invalid timestamps.
      const rows: Product[] = snap.docs.map((doc) => {
        const d = doc.data() as any;
        const date = d.updatedAt?.toDate ? d.updatedAt.toDate() : new Date();
        return {
          id: doc.id,
          name: String(d.name ?? ""),
          sku: String(d.sku ?? ""),
          stock: Number(d.stock ?? 0),
          price: Number(d.price ?? 0),
          updatedAt: date,
        };
      });
      setProducts(rows);

      // ✅ Why: Stop showing the spinner after the first snapshot only.
      // The AI code toggled loading on every update, which caused flicker.
      if (first) {
        setLoading(false);
        first = false;
      }
    },
    (err) => {
      console.error(err);
      setError("Realtime subscription failed. Check rules/connection.");
      setLoading(false);
    }
  );

  // ✅ Why: Clean up subscriptions when unmounting to prevent memory leaks.
  return () => unsubscribe();
}, []);

// ✅ Why: Reset to page 1 whenever sort changes.
// Otherwise the user could sort while stuck on page 3, seeing no visible effect.
useEffect(() => {
  setCurrentPage(1);
}, [sortField, sortDirection]);

// ✅ Why: Copy before sorting to avoid mutating React state directly.
const filteredAndSortedProducts = useMemo(() => {
  let base = [...products]; // safe copy

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
