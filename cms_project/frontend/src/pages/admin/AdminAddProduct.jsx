import { useState, useRef, useEffect } from "react";
import { productsAPI } from "../../services/api";
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2'; 
import axios from 'axios';

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
  const [categories, setCategories] = useState([]);
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
    if (!text || categories.length === 0) return null;

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

  // Charger les catégories au montage
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/products/categories/all');
        setCategories(res.data);
      } catch (err) {
        console.error("Impossible de charger les catégories", err);
      }
    };
    fetchCategories();
  }, []);

  // Déclencher la suggestion quand le nom ou la description change
  useEffect(() => {
    if (!form.category_id) { // Ne suggérer que si l'utilisateur n'a pas encore choisi
        const suggestion = inferSuggestedCategory(`${form.name} ${form.description}`);
        setSuggestedCategory(suggestion);
    } else {
        setSuggestedCategory(null);
    }
  }, [form.name, form.description, categories, form.category_id]);

  const Toast = Swal.mixin({
    background: '#1f2937',
    color: '#fff',
    confirmButtonColor: '#059669',
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Logique de sélection finale de l'ID de catégorie
    let finalCategoryId = form.category_id;
    if (!finalCategoryId && suggestedCategory) {
      finalCategoryId = suggestedCategory.id;
    }

    // Validation stricte avant envoi
    if (!form.name.trim() || !form.price || !finalCategoryId) {
      setError("Le nom, le prix et la catégorie sont obligatoires.");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', form.name.trim());
      formData.append('price', parseFloat(form.price));
      formData.append('stock', parseInt(form.stock) || 0); // Convertit "" en 0 pour le backend
      formData.append('description', form.description.trim());
      formData.append('category_id', finalCategoryId);

      if (fileInputRef.current.files[0]) {
        formData.append('image', fileInputRef.current.files[0]);
      }

      const response = await productsAPI.create(formData);
      
      if (response.status === 201 || response.status === 200) {
        await Toast.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Le produit a été enregistré.',
          timer: 2000,
          showConfirmButton: false
        });
        navigate("/admin/produits"); 
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Erreur serveur (500)";
      setError(errorMsg);
      Toast.fire({ icon: 'error', title: 'Erreur', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 min-h-screen bg-black text-white">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span className="w-2 h-8 bg-emerald-500 rounded-full"></span>
          Nouveau Produit
        </h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm animate-pulse">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">Nom du produit</label>
              <input
                required placeholder="Ex: Asus ROG Strix"
                className="w-full bg-gray-800 p-3 rounded-xl outline-none border border-gray-700 focus:border-emerald-500 transition-all"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">Catégorie</label>
              <select 
                className="w-full bg-gray-800 p-3 rounded-xl outline-none border border-gray-700 focus:border-emerald-500 text-gray-300"
                value={form.category_id}
                onChange={e => setForm({...form, category_id: e.target.value})}
              >
                <option value="">-- Choisir manuellement --</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>

              {suggestedCategory && !form.category_id && (
                <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between animate-fadeIn">
                  <div className="text-[11px]">
                    <span className="text-emerald-400 font-bold">Suggestion :</span> {suggestedCategory.name}
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({...form, category_id: suggestedCategory.id})}
                    className="text-[10px] bg-emerald-600 px-2 py-1 rounded-lg hover:bg-emerald-500"
                  >
                    Appliquer
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-800/30 p-4 rounded-xl border border-dashed border-gray-700">
            <label className="block text-xs text-gray-400 mb-3 uppercase font-bold tracking-wider">Image du produit</label>
            <div className="flex items-center space-x-4">
                <input
                type="file" ref={fileInputRef} onChange={handleFileChange}
                className="flex-1 text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-gray-700 file:text-emerald-400 hover:file:bg-gray-600 cursor-pointer"
                />
                {preview && <img src={preview} alt="Aperçu" className="w-16 h-16 object-cover rounded-xl border-2 border-emerald-500/50 shadow-emerald-500/20 shadow-lg" />}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">Prix (Ar)</label>
              <input
                type="number" placeholder="0"
                className="w-full bg-gray-800 p-3 rounded-xl border border-gray-700 outline-none focus:border-emerald-500"
                value={form.price} onChange={e => setForm({...form, price: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">Stock</label>
              <input
                type="number" placeholder="0"
                className="w-full bg-gray-800 p-3 rounded-xl border border-gray-700 outline-none focus:border-emerald-500"
                value={form.stock} onChange={e => setForm({...form, stock: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">Description</label>
            <textarea
              placeholder="Décrivez les caractéristiques techniques..."
              className="w-full bg-gray-800 p-3 rounded-xl border border-gray-700 h-28 outline-none focus:border-emerald-500 resize-none"
              value={form.description} onChange={e => setForm({...form, description: e.target.value})}
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-emerald-600 py-4 rounded-xl font-bold text-lg hover:bg-emerald-500 transition-all disabled:opacity-50 shadow-xl shadow-emerald-900/20"
          >
            {loading ? "Traitement en cours..." : "Enregistrer le produit"}
          </button>
        </form>
      </div>
    </div>
  );
}