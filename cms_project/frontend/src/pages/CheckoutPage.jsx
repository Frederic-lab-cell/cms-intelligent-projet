// src/pages/CheckoutPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ordersAPI } from "../services/api";
import { useCart } from "../context/CartContext";
import toast from "react-hot-toast";

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash"); // État pour le paiement
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Envoi de l'adresse et de la méthode de paiement
      await ordersAPI.checkout({ 
        address, 
        payment_method: paymentMethod 
      });
      await clearCart();
      toast.success("Commande confirmée !");
      navigate(`/commandes`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Erreur lors du paiement");
    } finally { setLoading(false); }
  };

  if (!cart?.items?.length) {
    navigate("/panier"); return null;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      {/* Bouton de retour en ROUGE */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-red-500 hover:text-red-400 transition-colors mb-8 group text-sm font-medium"
      >
        <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span> 
        Retour au panier
      </button>

      <h1 className="text-2xl font-bold text-white mb-8">Finaliser la commande</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
          Récapitulatif
        </h2>
        <div className="space-y-2 mb-4">
          {cart.items.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-300">{item.product.name} × {item.quantity}</span>
              <span className="text-white font-mono">{item.subtotal.toFixed(2)}Ar</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-700 pt-3 flex justify-between font-bold">
          <span className="text-white">Total</span>
          <span className="text-emerald-400 font-mono">{cart.total.toFixed(2)}Ar</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Champ Adresse */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Adresse de livraison</label>
          <textarea
            value={address}
            onChange={e => setAddress(e.target.value)}
            required rows={3}
            placeholder="Numéro, rue, ville, code postal..."
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3
              text-white text-sm placeholder-gray-500 focus:outline-none
              focus:border-emerald-500/60 resize-none"
          />
        </div>

        {/* Champ Méthode de paiement */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Méthode de paiement</label>
          <select
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3
              text-white text-sm focus:outline-none focus:border-emerald-500/60"
          >
            <option value="cash">Paiement à la livraison (Cash)</option>
            <option value="mvola">MVola</option>
            <option value="orange_money">Orange Money</option>
            <option value="airtel_money">Airtel Money</option>
          </select>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500
            text-white font-semibold transition disabled:opacity-50">
          {loading ? "Traitement..." : "Confirmer la commande"}
        </button>
      </form>
    </div>
  );
}