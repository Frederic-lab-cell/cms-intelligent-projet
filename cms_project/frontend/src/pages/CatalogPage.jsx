import { useEffect, useState, useCallback } from "react";
import { productsAPI } from "../services/api";
import ProductCard from "../components/ProductCard";

export default function CatalogPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [catFilter, setCatFilter] = useState(null);
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSearch, setIsSearch] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);

  // Charger les catégories au montage
  useEffect(() => {
    productsAPI.categories()
      .then(r => setCategories(r.data || []))
      .catch(err => {
        console.error("Erreur catégories:", err);
        // Note : Si tu as une 404 ici, vérifie que la route Flask est bien '/categories/all/'
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, per_page: 12 };
      if (catFilter) params.category_id = catFilter;
      if (query) params.q = query;

      const response = await productsAPI.list(params);

      if (response && response.data) {
        setProducts(response.data.products || []);
        setTotalPages(response.data.pages || 1);
        setIsSearch(!!response.data.search);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Erreur chargement produits:", err);
      setError("Impossible de charger les produits. Vérifiez la route API ou votre connexion.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [catFilter, query, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setQuery(searchInput);
    setPage(1);
  };

  const clearSearch = () => {
    setSearchInput("");
    setQuery("");
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header + Search TF-IDF */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-4">Catalogue</h1>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
          <div className="relative flex-1">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Recherche sémantique TF-IDF..."
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5
                text-white placeholder-gray-500 text-sm focus:outline-none
                focus:border-emerald-500/60"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white
              rounded-xl text-sm font-medium transition"
          >
            Chercher
          </button>
        </form>

        {isSearch && (
          <p className="text-sm text-emerald-400 mt-2">
            🔍 Résultats TF-IDF pour « {query} » — {products.length} produit(s)
          </p>
        )}
      </div>

      {/* Affichage de l'erreur (ex: 404 ou 500) */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Filtres par Catégories */}
      <div className="flex gap-2 flex-wrap mb-8">
        <FilterBtn active={!catFilter} onClick={() => { setCatFilter(null); setPage(1); }}>
          Tous
        </FilterBtn>
        {categories.map((c) => (
          <FilterBtn
            key={c.id}
            active={catFilter === c.id}
            onClick={() => { setCatFilter(c.id); setPage(1); }}
          >
            {c.icon} {c.name}
          </FilterBtn>
        ))}
      </div>

      {/* Grille des produits avec ProductCard Interactif */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl h-72 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-3">🔍</p>
          <p>{error ? "Erreur de communication avec le serveur" : "Aucun produit trouvé"}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} showSimilarity={isSearch} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isSearch && totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition
                ${page === i + 1
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-900 border border-gray-700 text-gray-400 hover:border-gray-500"
                }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition
        ${active
          ? "bg-emerald-600 text-white border border-emerald-500"
          : "bg-gray-900 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"
        }`}
    >
      {children}
    </button>
  );
}