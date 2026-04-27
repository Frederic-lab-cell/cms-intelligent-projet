// src/hooks/useProducts.js
import { useState, useEffect, useCallback } from "react";
import { productsAPI } from "../services/api";

export function useProducts(initialParams = {}) {
  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetch = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await productsAPI.list({ ...initialParams, ...params });
      setProducts(data.products || []);
      setPagination({ page: data.page || 1, pages: data.pages || 1, total: data.total || 0 });
    } catch (e) {
      setError(e.response?.data?.error || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { products, loading, error, pagination, refetch: fetch };
}

// src/hooks/useCategories.js
export function useCategories() {
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    productsAPI.categories().then(r => setCategories(r.data)).catch(() => {});
  }, []);
  return categories;
}
