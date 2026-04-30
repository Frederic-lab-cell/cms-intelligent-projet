import { useState, useRef, useEffect } from "react";
import { productsAPI } from "../../services/api";
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2'; 
import axios from 'axios';

// Teny fanalahidy ho an'ny fanasokajiana ho azy (suggestion automatique)
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
  const [previews, setPreviews] = useState([]); // Mitahiry ny sarin'ireo sary hofidina
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

  // Logic hamantarana ny sokajy tokony hisy ilay entana
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

  // Maka ny sokajy rehetra avy any amin'ny Backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Ampiasao ny URL-nao any amin'ny Render raha efa deployed
        const res = await axios.get('http://localhost:5000/api/products/categories/all');
        setCategories(res.data);
      } catch (err) {
        console.error("Fahadisoana teo am-pakan'ny sokajy", err);
      }
    };
    fetchCategories();
  }, []);

  // Soso-kevitra automatique rehefa manoratra anarana na famaritana
  useEffect(() => {
    if (!form.category_id) {
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

  // Rehefa misafidy sary
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Fafana ny previews taloha mba tsy ho feno ny fitadidiana (RAM)
      previews.forEach(url => URL.revokeObjectURL(url));
      
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setPreviews(newPreviews);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    let finalCategoryId = form.category_id;
    if (!finalCategoryId && suggestedCategory) {
      finalCategoryId = suggestedCategory.id;
    }

    if (!form.name.trim() || !form.price || !finalCategoryId) {
      setError("Mila fenoina ny anarana, ny vidiny, ary ny sokajy.");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', form.name.trim());
      formData.append('price', parseFloat(form.price));
      formData.append('stock', parseInt(form.stock) || 0);
      formData.append('description', form.description.trim());
      formData.append('category_id', finalCategoryId);

      // Fandefasana ireo sary maro
      const files = fileInputRef.current.files;
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
      }

      const response = await productsAPI.create(formData);
      
      if (response.status === 201 || response.status === 200) {
        await Toast.fire({
          icon: 'success',
          title: 'Nahomby',
          text: 'Voatahiry ny vokatra sy ny sariny.',
          timer: 2000,
          showConfirmButton: false
        });
        navigate("/admin/produits"); 
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Fahadisoana avy amin'ny mpizara (500)";
      setError(errorMsg);
      Toast.fire({ icon: 'error', title: 'Fahadisoana', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 min-h-screen bg-black text-white">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span className="w-2 h-8 bg-emerald-500 rounded-full"></span>
          Vokatra Vaovao
        </h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm animate-pulse">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">Anaran'ny entana</label>
              <input
                required placeholder="Ex: Asus ROG Strix"
                className="w-full bg-gray-800 p-3 rounded-xl outline-none border border-gray-700 focus:border-emerald-500 transition-all"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">Sokajy</label>
              <select 
                className="w-full bg-gray-800 p-3 rounded-xl outline-none border border-gray-700 focus:border-emerald-500 text-gray-300"
                value={form.category_id}
                onChange={e => setForm({...form, category_id: e.target.value})}
              >
                <option value="">-- Safidio eto --</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>

              {suggestedCategory && !form.category_id && (
                <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between animate-fadeIn">
                  <div className="text-[11px]">
                    <span className="text-emerald-400 font-bold">Soso-kevitra :</span> {suggestedCategory.name}
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({...form, category_id: suggestedCategory.id})}
                    className="text-[10px] bg-emerald-600 px-2 py-1 rounded-lg hover:bg-emerald-500 transition-colors"
                  >
                    Ampiharo
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-800/30 p-4 rounded-xl border border-dashed border-gray-700">
            <label className="block text-xs text-gray-400 mb-3 uppercase font-bold tracking-wider">Sary (Azonao isafidianana maro)</label>
            <div className="space-y-4">
                <input
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                  multiple 
                  accept="image/*"
                  className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-gray-700 file:text-emerald-400 hover:file:bg-gray-600 cursor-pointer"
                />
                
                {previews.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-2">
                    {previews.map((src, index) => (
                      <img 
                        key={index}
                        src={src} 
                        alt={`Preview ${index}`} 
                        className="w-20 h-20 object-cover rounded-xl border-2 border-emerald-500/30 shadow-lg" 
                      />
                    ))}
                  </div>
                )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">Vidiny (Ar)</label>
              <input
                type="number" placeholder="0"
                className="w-full bg-gray-800 p-3 rounded-xl border border-gray-700 outline-none focus:border-emerald-500"
                value={form.price} onChange={e => setForm({...form, price: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">Tahiry (Stock)</label>
              <input
                type="number" placeholder="0"
                className="w-full bg-gray-800 p-3 rounded-xl border border-gray-700 outline-none focus:border-emerald-500"
                value={form.stock} onChange={e => setForm({...form, stock: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">Famaritana (Description)</label>
            <textarea
              placeholder="Soraty eto ny antsipirian'ilay entana..."
              className="w-full bg-gray-800 p-3 rounded-xl border border-gray-700 h-28 outline-none focus:border-emerald-500 resize-none"
              value={form.description} onChange={e => setForm({...form, description: e.target.value})}
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-emerald-600 py-4 rounded-xl font-bold text-lg hover:bg-emerald-500 transition-all disabled:opacity-50 shadow-xl shadow-emerald-900/20"
          >
            {loading ? "Ampy hanodinana..." : "Tehirizo ny vokatra"}
          </button>
        </form>
      </div>
    </div>
  );
}