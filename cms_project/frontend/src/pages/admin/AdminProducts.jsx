import { useEffect, useState } from "react";
import { productsAPI, adminAPI } from "../../services/api";
import axios from "axios";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:5000";

// FIX #1 — Résolution d'URL centralisée avec gestion de "default.png"
function resolveImageUrl(url) {
  if (!url || url === "default.png") {
    return "https://via.placeholder.com/150?text=No+Image";
  }
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_URL}/static/uploads/${url}`;
}

// FIX #2 — Conversion numérique sécurisée (évite NaN si champ vide)
function safeFloat(val, fallback = 0) {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
}
function safeInt(val, fallback = 0) {
  const n = parseInt(val, 10);
  return isNaN(n) ? fallback : n;
}

export default function AdminProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [galleryFiles, setGalleryFiles] = useState({ face: null, dos: null, gauche: null, droite: null });
  const [galleryPreviews, setGalleryPreviews] = useState({ face: null, dos: null, gauche: null, droite: null });

  const [newCatName, setNewCatName] = useState("");
  const [form, setForm] = useState({
    name: "", description: "", price: "", stock: "",
    category_id: "", is_active: true, rl_score: 50.0
  });

  const darkSwal = Swal.mixin({
    customClass: {
      popup: "bg-[#0b1120] border border-gray-800 rounded-[2rem] text-white shadow-2xl",
      title: "text-white font-black",
      confirmButton: "bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-xl font-bold border-0 mx-2 transition-all",
      cancelButton: "bg-gray-800 hover:bg-gray-700 px-6 py-3 rounded-xl font-bold border-0 mx-2 transition-all"
    },
    buttonsStyling: false
  });

  const load = () => {
    productsAPI.categories().then(r => {
      setCategories(r.data || []);
    }).catch(() => toast.error("Erreur catégories"));

    productsAPI.list({ per_page: 100 }).then(r => {
      const data = r.data.products || r.data;
      setProducts(Array.isArray(data) ? data : []);
    }).catch(() => toast.error("Erreur produits"));
  };

  useEffect(load, []);

  const getCategoryName = (categoryId) => {
    if (!categoryId) return "NON CLASSÉ";
    const found = categories.find(c => String(c.id) === String(categoryId));
    return found ? found.name.toUpperCase() : "NON CLASSÉ";
  };

  const handleGalleryChange = (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    setGalleryFiles(prev => ({ ...prev, [key]: file }));
    const reader = new FileReader();
    reader.onloadend = () => {
      setGalleryPreviews(prev => ({ ...prev, [key]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const recomputeTFIDF = async () => {
    const result = await darkSwal.fire({
      title: "Recalcul TF-IDF",
      text: "Réindexation de tous les tags IA en cours...",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Lancer",
      cancelButtonText: "Annuler"
    });
    if (!result.isConfirmed) return;

    darkSwal.fire({
      title: "Patientez...",
      text: "Mise à jour des tags IA",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      await adminAPI.recomputeTFIDF();
      darkSwal.fire({ title: "Terminé", text: "Les tags IA ont été recalculés.", icon: "success", timer: 2000, showConfirmButton: false });
      load();
    } catch {
      darkSwal.fire({ title: "Erreur", text: "Impossible de recalculer les tags IA.", icon: "error" });
    }
  };

  const openCreate = () => {
    setEditProduct(null);
    setForm({ name: "", description: "", price: "", stock: "", category_id: "", is_active: true, rl_score: 50.0 });
    setNewCatName("");
    setGalleryFiles({ face: null, dos: null, gauche: null, droite: null });
    setGalleryPreviews({ face: null, dos: null, gauche: null, droite: null });
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditProduct(p);
    setForm({
      name: p.name || "",
      description: p.description || "",
      price: p.price ?? "",
      stock: p.stock ?? "",
      category_id: p.category_id || "",
      is_active: p.is_active ?? true,
      rl_score: p.rl_score ?? 50.0
    });
    setNewCatName("");

    // FIX #3 — Pré-remplissage galerie avec toutes les images disponibles
    const imgs = p.images_list && p.images_list.length > 0
      ? p.images_list
      : [p.image_url, null, null, null];
    const angles = ["face", "dos", "gauche", "droite"];
    const previews = {};
    angles.forEach((a, i) => {
      previews[a] = imgs[i] ? resolveImageUrl(imgs[i]) : null;
    });
    setGalleryPreviews(previews);
    setGalleryFiles({ face: null, dos: null, gauche: null, droite: null });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // FIX #4 — Validation du nom avant envoi
    if (!form.name.trim()) {
      toast.error("Le nom du produit est requis");
      return;
    }

    setSubmitting(true);
    let currentCategoryId = form.category_id;

    try {
      if (newCatName.trim() !== "") {
        const catRes = await axios.post(`${API_URL}/api/products/categories`, { name: newCatName.trim() });
        currentCategoryId = catRes.data.id;
      }

      if (!currentCategoryId) {
        toast.error("Veuillez sélectionner ou créer une catégorie");
        setSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("description", form.description || "");
      // FIX #5 — Utilisation de safeFloat/safeInt pour éviter NaN
      formData.append("price", safeFloat(form.price));
      formData.append("stock", safeInt(form.stock));
      formData.append("category_id", currentCategoryId);
      formData.append("is_active", form.is_active ? "1" : "0");
      formData.append("rl_score", safeFloat(form.rl_score, 50.0));

      if (galleryFiles.face)   formData.append("image", galleryFiles.face);
      if (galleryFiles.dos)    formData.append("additional_images", galleryFiles.dos);
      if (galleryFiles.gauche) formData.append("additional_images", galleryFiles.gauche);
      if (galleryFiles.droite) formData.append("additional_images", galleryFiles.droite);

      // FIX #6 — Ne PAS passer Content-Type : laisser le navigateur générer le boundary multipart
      // Supprimer complètement le header Content-Type pour que FormData fonctionne
      if (editProduct) {
        await productsAPI.update(editProduct.id, formData);
        toast.success("Produit mis à jour");
      } else {
        await productsAPI.create(formData);
        toast.success("Nouveau produit indexé");
      }

      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Échec de l'opération");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const nameMatch = (p.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const catMatch = filterCat === "" || String(p.category_id) === String(filterCat);
    return nameMatch && catMatch;
  });

  const handleDelete = async (id) => {
    const result = await darkSwal.fire({
      title: "Supprimer ?",
      text: "Cette donnée sera effacée du cluster.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "CONFIRMER"
    });
    if (result.isConfirmed) {
      try {
        await productsAPI.delete(id);
        load();
        toast.success("Entrée supprimée");
      } catch {
        toast.error("Erreur lors de la suppression");
      }
    }
  };

  // FIX #7 — Extraction du terme depuis un tag objet ou string
  function getTagTerm(tag) {
    if (!tag) return "";
    if (typeof tag === "string") return tag;
    return tag.term || tag.name || JSON.stringify(tag);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 min-h-screen text-white font-sans bg-[#020617]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-red-900/20 text-red-500 border border-red-900/50 hover:bg-red-900/40 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all"
          >
            ← Retour
          </button>
          <div>
            <h1 className="text-4xl font-black tracking-tighter italic uppercase text-emerald-500">Inventory OS</h1>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">
              {filteredProducts.length} ARTICLES EN BASE DE DONNÉES
            </p>
          </div>
        </div>

        <div className="flex flex-1 max-w-2xl gap-3">
          <input
            type="text" placeholder="Filtrage par nom..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 bg-[#0f172a] border border-gray-800 rounded-2xl px-5 py-3 text-sm outline-none focus:border-emerald-500/50 transition-all"
          />
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="bg-[#0f172a] border border-gray-800 rounded-2xl px-4 py-3 text-[10px] font-bold uppercase outline-none text-gray-400 focus:border-emerald-500/50"
          >
            <option value="">TOUTES CATÉGORIES</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
          </select>
          <button
            onClick={recomputeTFIDF}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-sm transition-all shadow-lg shadow-blue-900/20"
          >
            ↻ Recalcul IA
          </button>
          <button
            onClick={openCreate}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-black text-sm transition-all shadow-lg shadow-emerald-900/20"
          >
            + AJOUTER
          </button>
        </div>
      </div>

      <div className="bg-[#0b1120] border border-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl mb-10">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800/50 bg-gray-800/10 text-gray-500 font-bold uppercase text-[9px] tracking-[0.2em]">
                <th className="px-8 py-7">Produit</th>
                <th className="px-6 py-7 text-center">Score RL</th>
                <th className="px-6 py-7 text-center">IA Tags</th>
                <th className="px-6 py-7 text-center">Catégorie</th>
                <th className="px-6 py-7 text-center">Prix</th>
                <th className="px-8 py-7 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/30">
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-700 font-mono text-xs uppercase tracking-widest">
                    Aucun produit trouvé
                  </td>
                </tr>
              )}
              {filteredProducts.map(p => (
                <tr key={p.id} className="group hover:bg-white/[0.01] transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <img
                        src={resolveImageUrl(p.image_url)}
                        alt={p.name}
                        className="w-12 h-12 rounded-xl object-cover border border-gray-800 group-hover:border-emerald-500/30 transition-all"
                        onError={e => { e.target.src = "https://via.placeholder.com/48?text=?"; }}
                      />
                      <span className="font-black text-white text-base">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <span className="font-mono text-emerald-400 font-bold">
                      {safeFloat(p.rl_score).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <div className="flex flex-wrap justify-center gap-1">
                      {/* FIX #8 — Tags rendus depuis objets {term, tfidf_score} ou strings */}
                      {p.tags && p.tags.length > 0 ? (
                        p.tags.slice(0, 5).map((t, i) => (
                          <span
                            key={i}
                            className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-tighter"
                          >
                            #{getTagTerm(t)}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-700 text-[8px] italic tracking-widest">N/A</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <span className="px-4 py-1.5 bg-gray-800/40 rounded-xl text-gray-400 text-[10px] font-bold border border-gray-700/50 uppercase">
                      {getCategoryName(p.category_id)}
                    </span>
                  </td>
                  <td className="px-6 py-6 text-center text-emerald-400 font-mono font-bold text-base">
                    {Number(p.price || 0).toLocaleString()} Ar
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-5 font-bold text-[10px] uppercase tracking-wider">
                      <button onClick={() => openEdit(p)} className="text-blue-500 hover:text-blue-400 transition-colors">Modifier</button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-400 transition-colors">Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#0b1120] border border-gray-800 rounded-[3rem] p-10 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-black mb-8 italic uppercase text-emerald-500">
              {editProduct ? "Modification" : "Indexation"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Galerie 4 angles */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {["face", "dos", "gauche", "droite"].map(angle => (
                  <div
                    key={angle}
                    onClick={() => document.getElementById(`input-${angle}`).click()}
                    className="relative flex flex-col items-center justify-center h-28 bg-[#0f172a] border-2 border-dashed border-gray-800 rounded-3xl hover:border-emerald-500/50 cursor-pointer overflow-hidden group transition-all"
                  >
                    {galleryPreviews[angle] ? (
                      <img
                        src={galleryPreviews[angle]}
                        className="w-full h-full object-cover"
                        alt={angle}
                        onError={e => { e.target.src = "https://via.placeholder.com/120?text=?"; }}
                      />
                    ) : (
                      <div className="text-center">
                        <span className="text-[14px] text-gray-700 block">+</span>
                        <span className="text-[8px] font-black text-gray-600 uppercase italic">{angle}</span>
                      </div>
                    )}
                    <input
                      id={`input-${angle}`}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={e => handleGalleryChange(e, angle)}
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 rounded-full text-[7px] text-emerald-500 font-bold uppercase border border-emerald-500/20">
                      {angle}
                    </div>
                    {/* FIX #9 — Bouton reset image par angle */}
                    {galleryPreviews[angle] && (
                      <button
                        type="button"
                        onClick={ev => {
                          ev.stopPropagation();
                          setGalleryPreviews(prev => ({ ...prev, [angle]: null }));
                          setGalleryFiles(prev => ({ ...prev, [angle]: null }));
                        }}
                        className="absolute top-2 right-2 w-5 h-5 bg-red-600/80 rounded-full text-white text-[10px] flex items-center justify-center hover:bg-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <input
                type="text"
                placeholder="NOM DU PRODUIT *"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-[#0f172a] border border-gray-800 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500/50 font-bold uppercase"
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number" placeholder="PRIX (AR)" required min="0" step="0.01"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  className="bg-[#0f172a] border border-gray-800 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500/50"
                />
                <input
                  type="number" placeholder="STOCK" required min="0"
                  value={form.stock}
                  onChange={e => setForm({ ...form, stock: e.target.value })}
                  className="bg-[#0f172a] border border-gray-800 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                <label className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mb-2 block">
                  Intelligence RL (Score %)
                </label>
                <input
                  type="number" step="0.1" min="0" max="100"
                  value={form.rl_score}
                  onChange={e => setForm({ ...form, rl_score: e.target.value })}
                  className="w-full bg-transparent text-xl font-mono text-emerald-400 outline-none"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Classification</label>
                <select
                  value={form.category_id}
                  onChange={e => { setForm({ ...form, category_id: e.target.value }); setNewCatName(""); }}
                  className="w-full bg-[#0f172a] border border-gray-800 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500/50 font-bold text-gray-400 uppercase"
                >
                  <option value="">SÉLECTIONNER EXISTANT</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="OU CRÉER NOUVEAU..."
                  value={newCatName}
                  onChange={e => { setNewCatName(e.target.value); setForm({ ...form, category_id: "" }); }}
                  className="w-full bg-[#0f172a] border border-gray-800 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500/50 font-bold uppercase text-sm"
                />
              </div>

              <textarea
                placeholder="DESCRIPTION POUR ANALYSE IA"
                rows={2}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full bg-[#0f172a] border border-gray-800 rounded-2xl px-6 py-4 outline-none resize-none focus:border-emerald-500/50"
              />

              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                  className="flex-1 font-black text-gray-500 uppercase text-[10px] tracking-widest disabled:opacity-40"
                >
                  Annuler
                </button>
                {/* FIX #10 — Bouton désactivé pendant l'envoi pour éviter double-submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-emerald-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? "Envoi..." : "Valider"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}