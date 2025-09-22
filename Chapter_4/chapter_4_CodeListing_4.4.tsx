// components/inventory/InventoryTable.tsx (diff-style)
import { collection, getDocs, query, limit } from "firebase/firestore";
//                                            ^ add query, limit

useEffect(() => {
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Constrain the query to avoid huge reads
      const q = query(collection(db, "products"), limit(100));
      const snap = await getDocs(q);

      const rows: Product[] = snap.docs.map((doc) => {
        const d = doc.data() as any;
        return {
          id: doc.id,
          name: String(d.name ?? ""),
          sku: String(d.sku ?? ""),
          stock: Number(d.stock ?? 0),
          price: Number(d.price ?? 0),
          updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate() : new Date(),
        };
      });

      setProducts(rows);
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
