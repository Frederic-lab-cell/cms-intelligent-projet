import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

// ✅ CORRECTION : Fiarovana ny URL (manala slash any amin'ny farany raha misy)
const rawUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
const BASE_URL = rawUrl.replace(/\/$/, ""); 

const DEFAULT_IMAGE = "https://placehold.co/400x300/1f2937/6b7280?text=No+Image";

export default function ProductCard({ product, showSimilarity = false }) {
  const { addToCart, loading } = useCart();
  const { user } = useAuth();
  
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // Fiarovana raha toa ka tsy misy ny images_list
  const images = product?.images_list && product?.images_list.length > 0 
    ? product.images_list 
    : [product?.image_url];

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Connectez-vous pour acheter");
      return;
    }
    const result = await addToCart(product.id);
    if (result.success) toast.success("Ajouté au panier !");
    else toast.error(result.error);
  };

  const outOfStock = !product?.in_stock;

  const formatImageUrl = (url) => {
    if (!url || url === "default.png") return DEFAULT_IMAGE;
    
    // Raha efa URL feno (Cloudinary na hafa)
    if (url.startsWith("http")) return url;
    
    // Manadio ny URL alohan'ny hanampiana ny BASE_URL
    const cleanUrl = url.startsWith("/") ? url : `/${url}`;
    return `${BASE_URL}/static/uploads${cleanUrl}`;
  };

  return (
    <div
      className={`group relative bg-gray-900 border rounded-xl overflow-hidden
      transition-all duration-200 flex flex-col
      ${outOfStock ? "border-gray-800 opacity-60" : "border-gray-800 hover:border-emerald-500/40 hover:-translate-y-0.5"}`}
    >
      {/* Zone Image */}
      <div className="relative aspect-[4/3] bg-gray-800 overflow-hidden">
        <Link to={`/produit/${product?.id}`} className="block w-full h-full">
          <img
            src={formatImageUrl(images[activeImgIndex] || product?.image_url)}
            alt={product?.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = DEFAULT_IMAGE;
            }}
          />
        </Link>

        {/* 🔘 LES 4 BOUTONS SUR L'IMAGE */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-black/60 p-1 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
          {['F', 'D', 'G', 'D'].map((label, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.preventDefault();
                if (images[idx]) setActiveImgIndex(idx);
              }}
              className={`w-7 h-7 flex items-center justify-center text-[10px] font-bold rounded transition-colors
                ${activeImgIndex === idx ? "bg-emerald-500 text-white" : "text-gray-300 hover:bg-white/20"}
                ${!images[idx] && "opacity-20 cursor-not-allowed"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {outOfStock && (
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-red-500 text-white">
              Rupture
            </span>
          )}
          {!outOfStock && product?.stock <= 5 && (
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500 text-black">
              Plus que {product.stock} !
            </span>
          )}
        </div>
        
        <div className="absolute top-2 right-2">
          <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-gray-900/80 text-emerald-400">
            RL {Math.round(product?.rl_score || 0)}
          </span>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex flex-col flex-1 p-4">
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <Link to={`/produit/${product?.id}`} className="flex-1">
              <p className="text-xs text-gray-500 uppercase">{product?.category?.name}</p>
              <h3 className="font-semibold text-white text-sm leading-tight group-hover:text-emerald-400 transition-colors line-clamp-2">
                {product?.name}
              </h3>
            </Link>
            
            <div className="flex gap-0.5 bg-gray-800 p-0.5 rounded border border-gray-700">
              {['F', 'D'].map((l, i) => (
                <button 
                  key={i}
                  onClick={() => images[i] && setActiveImgIndex(i)}
                  className={`w-5 h-5 text-[8px] rounded ${activeImgIndex === i ? 'bg-emerald-600' : 'text-gray-500'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Tags TF-IDF */}
          {product?.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {product.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-gray-800 text-gray-400 border border-gray-700">
                  {tag.term}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Prix et Bouton Panier */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-800">
          <span className="text-lg font-bold text-white">
            {product?.price?.toLocaleString() || 0} Ar
          </span>
          <button
            onClick={handleAdd}
            disabled={outOfStock || loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              outOfStock ? "bg-gray-800 text-gray-600" : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            {outOfStock ? "Indisponible" : "+ Panier"}
          </button>
        </div>
      </div>
    </div>
  );
}