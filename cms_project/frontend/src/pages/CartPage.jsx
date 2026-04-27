// src/pages/CartPage.jsx
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

// Configuration de l'URL Backend
const API_URL = "http://127.0.0.1:5000";

export default function CartPage() {
  const { cart, updateQty, removeItem, loading } = useCart();
  const navigate = useNavigate();

  // Fonction pour reconstruire l'URL complète de l'image
  const getFullImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_URL}/static/uploads/${url}`;
  };

  if (!cart || cart.items.length === 0) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <p className="text-5xl mb-4">🛒</p>
      <h2 className="text-xl font-bold text-white mb-3">Votre panier est vide</h2>
      <Link to="/catalogue"
        className="inline-block px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500
          text-white font-medium transition">
        Explorer le catalogue
      </Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* BOUTON RETOUR EN ROUGE */}
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-red-500 hover:text-red-400 transition-colors mb-6 group"
      >
        <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span>
        <span className="text-sm font-bold uppercase tracking-widest">Retour</span>
      </button>

      <h1 className="text-2xl font-bold text-white mb-8">
        Panier <span className="text-gray-500 font-normal text-base">
          ({cart.item_count} article{cart.item_count > 1 ? "s" : ""})
        </span>
      </h1>

      <div className="space-y-3 mb-8">
        {cart.items.map(item => (
          <div key={item.id}
            className="flex gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
            
            <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center
              justify-center text-2xl flex-shrink-0 overflow-hidden border border-gray-700">
              {item.product.image_url ? (
                <img 
                  src={getFullImageUrl(item.product.image_url)} 
                  alt={item.product.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = "https://via.placeholder.com/150?text=Error"; }}
                />
              ) : (
                item.product.category?.icon || "📦"
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-white text-sm">{item.product.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {item.product.stock <= 5 && !item.product.in_stock === false
                  ? <span className="text-amber-400">Reste {item.product.stock} en stock</span>
                  : item.product.category?.name}
              </p>
              <p className="text-emerald-400 font-mono font-bold mt-1">
                {Number(item.product.price).toFixed(2)}Ar
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center border border-gray-700 rounded-lg overflow-hidden">
                <button onClick={() => updateQty(item.id, item.quantity - 1)}
                  className="px-3 py-1 text-gray-400 hover:text-white hover:bg-gray-800 transition text-sm">
                  −
                </button>
                <span className="px-3 py-1 text-white text-sm font-mono">{item.quantity}</span>
                <button onClick={() => updateQty(item.id, item.quantity + 1)}
                  className="px-3 py-1 text-gray-400 hover:text-white hover:bg-gray-800 transition text-sm">
                  +
                </button>
              </div>
              <p className="text-white font-bold font-mono text-sm">
                {Number(item.subtotal).toFixed(2)}Ar
              </p>
              <button onClick={() => removeItem(item.id)}
                className="text-xs text-red-400 hover:text-red-300 transition">
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <span className="text-gray-400">Total</span>
          <span className="text-2xl font-bold text-white font-mono">
            {Number(cart.total).toFixed(2)}Ar
          </span>
        </div>
        <button onClick={() => navigate("/checkout")}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500
            text-white font-semibold transition shadow-lg shadow-emerald-900/20">
          Passer la commande →
        </button>
      </div>
    </div>
  );
}