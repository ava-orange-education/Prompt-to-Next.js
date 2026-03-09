useEffect(() => {
  const productsCollection = collection(db, "products");
  const productsQuery = query(productsCollection, orderBy("name"), limit(1000));

  const unsubscribe = onSnapshot(
    productsQuery,
    (snapshot) => {
      try {
        setLoading(true); // toggled on every snapshot (UI flicker)
        setError(null);

        const productsData = snapshot.docs.map((doc) => {
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
      } catch {
        setError("Failed to process products data.");
      } finally {
        setLoading(false); // toggled on every snapshot (UI flicker)
      }
    },
    (err) => {
      setError(
        "Failed to load products. Please check your Firebase configuration."
      );
      setLoading(false);
    }
  );

  return () => unsubscribe();
}, []);

// Filter + sort (⚠️ mutates React state array)
const filteredAndSortedProducts = useMemo(() => {
  let filtered = products;
  filtered.sort((a, b) => {
    /* ... */
  });
  return filtered;
}, [products, debouncedSearchTerm, sortField, sortDirection]);
