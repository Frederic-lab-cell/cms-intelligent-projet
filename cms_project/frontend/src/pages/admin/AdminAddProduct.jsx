import { useState, useRef, useEffect } from "react"; // Ajout de useEffect
import { productsAPI } from "../../services/api";
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2'; 
import axios from 'axios'; // Ou utilise ton instance API personnalisée

const CATEGORY_KEYWORDS = {
  informatique: ["ordinateur", "portable", "pc", "laptop", "gaming", "asus", "hp", "dell", "macbook", "intel", "amd", "nvidia", "ssd", "ram", "performance"],
  automobile: ["voiture", "auto", "suv", "hybride", "renault", "peugeot", "citroen", "audi", "bmw", "mercedes", "route", "berline", "sportive"],
  moto: ["moto", "125r", "xtreme", "scooter", "street", "ducati", "kawasaki", "yamaha", "honda", "ct125"],
  smartphone: ["smartphone", "iphone", "android", "samsung", "telephone", "xiaomi", "huawei", "pixel", "apple"],
};

export default function AdminAddProduct() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [categories, setCategories] = useState([]); // État pour stocker les catégories
  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    price: "",
    stock: "",
    description: "",
    category_id: ""
  });

  const normalizeText = (text) => {
    return (text || "").toLowerCase().replace(/[^\w\sàâäéèêëîïôöùûüç]/g, " ").trim();
  };

  const inferSuggestedCategory = (value) => {
    const text = normalizeText(value);
    if (!text) return null;

    let bestMatch = { label: null, score: 0 };
    Object.entries(CATEGORY_KEYWORDS).forEach(([label, words]) => {
      const score = words.reduce((acc, word) => acc + (text.includes(word) ? 1 : 0), 0);
      if (score > bestMatch.score) {
        bestMatch = { label, score };
      }
    });

    if (!bestMatch.label || bestMatch.score === 0) return null;
    return categories.find((cat) => cat.name.toLowerCase().includes(bestMatch.label)) || null;
  };

  // 1. CHARGER LES CATÉGORIES AU MONTAGE
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Remplace par ton endpoint réel (ex: /api/admin/categories)
        const res = await axios.get('http://localhost:5000/api/products/categories/all');
        setCategories(res.data);
      } catch (err) {
        console.error("Impossible de charger les catégories", err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const suggestion = inferSuggestedCategory(`${form.name} ${form.description}`);
    setSuggestedCategory(suggestion);
  }, [form.name, form.description, categories]);

  const Toast = Swal.mixin({
    background: '#1f2937',
    color: '#fff',
    confirmButtonColor: '#059669',
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Nettoyer l'ancienne URL pour éviter les fuites mémoire
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    let categoryId = form.category_id;
    if (!categoryId && suggestedCategory) {
      categoryId = suggestedCategory.id;
    }

    if (!form.name || !form.price || !categoryId) {
      setError("Le nom, le prix et la catégorie sont obligatoires.");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('price', form.price);
      formData.append('stock', form.stock || 0);
      formData.append('description', form.description);
      formData.append('category_id', categoryId);

      if (fileInputRef.current.files[0]) {
        formData.append('image', fileInputRef.current.files[0]);
      }

      const response = await productsAPI.create(formData);
      
      if (response.status === 201 || response.status === 200) {
        await Toast.fire({
          icon: 'success',
          title: 'Produit ajouté !',
          text: 'Le nouveau produit a été enregistré avec succès.',
          timer: 2000,
          showConfirmButton: false
        });
        navigate("/admin/produits"); 
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Erreur lors de l'envoi";
      setError(errorMsg);
      Toast.fire({ icon: 'error', title: 'Erreur', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 min-h-screen bg-black text-white">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold mb-6">Nouveau Produit</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* NOM ET CATÉGORIE SUR LA MÊME LIGNE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1 ml-1 uppercase font-bold">Nom du produit</label>
              <input
                required placeholder="Ex: Samsung S23 Ultra"
                className="w-full bg-gray-800 p-3 rounded-xl outline-none border border-gray-700 focus:border-emerald-500"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>
            
            {/* AJOUT DU SELECT DE CATÉGORIE */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 ml-1 uppercase font-bold">Catégorie</label>
              <select 
                className="w-full bg-gray-800 p-3 rounded-xl outline-none border border-gray-700 focus:border-emerald-500 text-gray-300"
                value={form.category_id}
                onChange={e => setForm({...form, category_id: e.target.value})}
              >
                <option value="" disabled>-- Sélectionner une catégorie --</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {suggestedCategory && (
                <div className="mt-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest">Catégorie suggérée</label>
                    <span className="text-[10px] uppercase tracking-widest bg-blue-500/15 text-blue-300 border border-blue-500/20 rounded-full px-2 py-1">
                      Suggestion automatique
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={suggestedCategory.name}
                      className="flex-1 bg-gray-800 text-gray-300 p-3 rounded-xl border border-dashed border-emerald-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({...form, category_id: suggestedCategory.id})}
                      className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs uppercase tracking-wider hover:bg-emerald-500 transition"
                    >
                      Utiliser
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4 bg-gray-800/50 p-3 rounded-xl border border-gray-700">
            <input
              type="file" ref={fileInputRef} onChange={handleFileChange}
              className="flex-1 text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
            />
            {preview && <img src={preview} alt="Aperçu" className="w-12 h-12 object-cover rounded-lg border border-gray-600" />}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1 ml-1 uppercase font-bold">Prix (Ar)</label>
              <input
                type="number" placeholder="0.00"
                className="w-full bg-gray-800 p-3 rounded-xl border border-gray-700 outline-none focus:border-emerald-500"
                value={form.price} onChange={e => setForm({...form, price: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 ml-1 uppercase font-bold">Stock initial</label>
              <input
                type="number" placeholder="Quantité"
                className="w-full bg-gray-800 p-3 rounded-xl border border-gray-700 outline-none focus:border-emerald-500"
                value={form.stock} onChange={e => setForm({...form, stock: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1 ml-1 uppercase font-bold">Description (IA TF-IDF)</label>
            <textarea
              placeholder="Décrivez le produit pour améliorer les recommandations..."
              className="w-full bg-gray-800 p-3 rounded-xl border border-gray-700 h-32 outline-none focus:border-emerald-500"
              value={form.description} onChange={e => setForm({...form, description: e.target.value})}
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-emerald-600 py-4 rounded-xl font-bold hover:bg-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? "Envoi en cours..." : "Enregistrer le produit"}
          </button>
        </form>
      </div>
    </div>
  );
}