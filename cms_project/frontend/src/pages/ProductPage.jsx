import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { productsAPI } from "../services/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import ProductSuggestions from "../components/ProductSuggestions";
import toast from "react-hot-toast";

// ✅ CORRECTION — Utilise VITE_API_URL au lieu de localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ANGLE_LABELS = ["F", "D", "G", "Dr"];

function formatPrice(price) {
  const p = parseFloat(price);
  if (isNaN(p)) return "Prix non défini";
  if (p === 0) return "Gratuit";
  return `${p.toLocaleString()} Ar`;
}

// ✅ CORRECTION — Filtre les images locales, garde uniquement Cloudinary
function resolveImageUrl(url) {
  if (!url || url === "default.png" || url === "") {
    return "https://placehold.co/400x400/1f2937/6b7280?text=No+Image";
  }
  // URL Cloudinary ou externe → utiliser directement
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // Fichier local → servir depuis le backend
  return `${API_BASE_URL}/static/uploads/${url}`;
}

// ✅ CORRECTION — Filtre la galerie pour ne garder que les images valides
function buildImageGallery(product) {
  const rawImages =
    product.images_list && product.images_list.length > 0
      ? product.images_list
      : [product.image_url];

  // Garde uniquement les URLs valides (Cloudinary = http, ou fichier local non vide)
  const filtered = rawImages.filter(url => url && url !== "" && url !== "null");

  if (filtered.length === 0) {
    return [product.image_url || "default.png"];
  }
  return filtered;
}

// ── Tunnel de vérification achat ──────────────────────────────────────────────
function PurchaseTunnel({ product, onClose, onConfirm }) {
  const [step, setStep] = useState(0);

  const topTags = (product.tags || []).slice(0, 3).map(t => t.term).join(", ") || "—";
  const priceLabel = formatPrice(product.price);
  const categoryName = product.category?.name || "Général";
  const rlScore = Math.round(product.rl_score || 0);

  const steps = [
    {
      badge: "Étape 1/3 — Intention",
      badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      title: `Souhaitez-vous vraiment acheter ce produit ?`,
      hint: `Ce produit a ${product.views || 0} vues et ${product.sales || 0} ventes. Tags TF-IDF : ${topTags}.`,
    },
    {
      badge: "Étape 2/3 — Besoin",
      badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      title: `Ce produit répond-il à votre besoin de "${categoryName}" ?`,
      hint: `Score IA : ${rlScore}%. Ces caractéristiques correspondent-elles à votre recherche ?`,
    },
    {
      badge: "Étape 3/3 — Confirmation",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      title: `Confirmer l'achat pour ${priceLabel} ?`,
      hint: "En confirmant, cet achat enrichira l'agent Q-Learning et améliorera les suggestions futures.",
    },
  ];

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border font-mono mb-4 ${current.badgeColor}`}>
          {current.badge}
        </span>

        <h3 className="text-lg font-semibold text-white mb-4">{current.title}</h3>

        <div className="flex gap-3 bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-4">
          <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
            {product.category?.icon || "📦"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white text-sm truncate">{product.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{categoryName}</p>
            <p className="text-base font-bold text-emerald-400 mt-2 font-mono">{priceLabel}</p>
          </div>
        </div>

        <p className="text-sm text-gray-400 mb-6">{current.hint}</p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-medium transition"
          >
            ✕ Annuler
          </button>
          {step < 2 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition"
            >
              Continuer →
            </button>
          ) : (
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition"
            >
              ✓ Confirmer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page produit ──────────────────────────────────────────────────────────────
export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [showTunnel, setShowTunnel] = useState(false);
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  useEffect(() => {
    setLoading(true);
    setActiveImgIndex(0);
    productsAPI
      .get(id)
      .then(r => setProduct(r.data))
      .catch(() => toast.error("Erreur de chargement du produit"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = () => {
    if (!user) {
      toast.error("Connectez-vous pour acheter");
      return;
    }
    setShowTunnel(true);
  };

  const handleConfirm = async () => {
    setShowTunnel(false);
    const result = await addToCart(product.id, qty);
    if (result.success) {
      toast.success("Ajouté au panier !");
      navigate("/panier");
    } else {
      toast.error(result.error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl h-96 animate-pulse" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20 text-gray-500 font-mono">Produit introuvable</div>
    );
  }

  const outOfStock = (product.stock ?? 0) <= 0;

  // ✅ CORRECTION — Galerie filtrée proprement
  const images = buildImageGallery(product);
  const safeIndex = Math.min(activeImgIndex, images.length - 1);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="grid md:grid-cols-2 gap-8 mb-12">

        {/* 🖼️ Section Images */}
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl aspect-square flex items-center justify-center overflow-hidden relative shadow-inner">
            <img
              src={resolveImageUrl(images[safeIndex])}
              alt={product.name}
              className="w-full h-full object-contain p-4 transition-all duration-300"
              onError={e => {
                e.target.onerror = null;
                e.target.src = "https://placehold.co/400x400/1f2937/6b7280?text=No+Image";
              }}
            />

            {/* Boutons angles — seulement si plusieurs images valides */}
            {images.length > 1 && (
              <div className="absolute bottom-4 right-4 flex gap-1.5">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImgIndex(idx)}
                    className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border transition ${
                      safeIndex === idx
                        ? "bg-emerald-500 border-emerald-400 text-white"
                        : "bg-gray-900/80 border-gray-700 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    {ANGLE_LABELS[idx] ?? idx + 1}
                  </button>
                ))}
              </div>
            )}

            {outOfStock && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-red-400 font-bold text-xl uppercase tracking-widest border-2 border-red-400 px-4 py-2 rounded-lg">
                  Rupture
                </span>
              </div>
            )}
          </div>

          {/* Miniatures — seulement si plusieurs images */}
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImgIndex(idx)}
                  className={`aspect-square rounded-xl border-2 overflow-hidden transition-all p-1 bg-gray-900 ${
                    safeIndex === idx
                      ? "border-emerald-500 scale-95"
                      : "border-gray-800 hover:border-gray-600"
                  }`}
                >
                  <img
                    src={resolveImageUrl(img)}
                    className="w-full h-full object-contain"
                    alt={`Vue ${idx + 1}`}
                    onError={e => {
                      e.target.onerror = null;
                      e.target.src = "https://placehold.co/80x80/1f2937/6b7280?text=?";
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ℹ️ Section Info */}
        <div>
          <p className="text-sm text-gray-500 mb-2 uppercase tracking-widest">
            {product.category?.name}
          </p>
          <h1 className="text-3xl font-bold text-white mb-4">{product.name}</h1>

          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-bold text-emerald-400 font-mono">
              {formatPrice(product.price)}
            </span>
            <span
              className={`text-sm font-medium px-3 py-1 rounded-full border ${
                outOfStock
                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              }`}
            >
              {outOfStock ? "Indisponible" : `En stock (${product.stock})`}
            </span>
          </div>

          <p className="text-gray-400 text-base leading-relaxed mb-8 border-l-2 border-gray-800 pl-4">
            {product.description || "Aucune description disponible pour ce produit."}
          </p>

          {/* Tags IA TF-IDF */}
          {product.tags?.length > 0 && (
            <div className="mb-8">
              <p className="text-xs text-gray-500 font-mono mb-3 uppercase tracking-wider">
                Tags IA · TF-IDF
              </p>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag, i) => {
                  const score = tag.tfidf_score || 0;
                  return (
                    <span
                      key={i}
                      className={`px-3 py-1 rounded-full text-xs font-mono font-medium flex items-center gap-2 border transition-colors ${
                        score >= 0.2
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-gray-800/50 text-gray-400 border-gray-700"
                      }`}
                    >
                      {tag.term}
                      <span className="opacity-40 text-[9px]">{score.toFixed(2)}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-4 mb-8 text-sm">
            <Stat label="Vues" value={product.views || 0} />
            <Stat label="Ventes" value={product.sales || 0} />
            <Stat label="IA Score" value={`${Math.round(product.rl_score || 0)}%`} accent />
          </div>

          {!outOfStock && (
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-gray-700 rounded-xl overflow-hidden bg-gray-900 shadow-inner">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="px-5 py-3 text-gray-400 hover:text-white hover:bg-gray-800 transition"
                >
                  −
                </button>
                <span className="px-4 text-white font-mono font-bold">{qty}</span>
                <button
                  onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                  className="px-5 py-3 text-gray-400 hover:text-white hover:bg-gray-800 transition"
                >
                  +
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 transition active:scale-95"
              >
                🛒 Ajouter au panier
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Suggestions IA */}
      <div className="mt-16 pt-12 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xl">
            🤖
          </div>
          <h2 className="text-xl font-bold text-white">Suggestions IA</h2>
        </div>
        <ProductSuggestions productId={product.id} />
      </div>

      {showTunnel && (
        <PurchaseTunnel
          product={product}
          onClose={() => setShowTunnel(false)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-center flex-1 transition-colors hover:border-gray-700">
      <p className="text-[10px] text-gray-500 mb-1 uppercase font-bold tracking-tighter">{label}</p>
      <p className={`font-bold font-mono text-lg ${accent ? "text-emerald-400" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}