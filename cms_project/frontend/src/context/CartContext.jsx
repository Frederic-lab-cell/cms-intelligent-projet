import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { cartAPI } from "../services/api";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);

  // Rafraîchissement du panier depuis le serveur
  const refresh = useCallback(async () => {
    if (!user) { 
      setCart(null); 
      return; 
    }
    try {
      const { data } = await cartAPI.get();
      setCart(data);
    } catch (err) { 
      console.error("Erreur refresh panier:", err);
      setCart(null); 
    }
  }, [user]);

  useEffect(() => { 
    refresh(); 
  }, [refresh]);

  // AJOUT AU PANIER - Source probable de l'erreur 400
  const addToCart = async (productId, qty = 1) => {
    setLoading(true);
    try {
      // Assure-toi que cartAPI.add envoie { product_id: productId, quantity: qty }
      const { data } = await cartAPI.add(productId, qty);
      
      // Mise à jour de l'état local avec les données renvoyées par Flask
      setCart(data); 
      return { success: true };
    } catch (e) {
      console.error("Erreur API Add:", e.response?.data);
      return { 
        success: false, 
        error: e.response?.data?.error || "Erreur lors de l'ajout au panier" 
      };
    } finally { 
      setLoading(false); 
    }
  };

  const updateQty = async (itemId, qty) => {
    try {
      const { data } = await cartAPI.updateItem(itemId, qty);
      setCart(data);
    } catch (e) {
      console.error("Erreur updateQty:", e);
    }
  };

  const removeItem = async (itemId) => {
    try {
      const { data } = await cartAPI.removeItem(itemId);
      setCart(data);
    } catch (e) {
      console.error("Erreur removeItem:", e);
    }
  };

  const clearCart = async () => {
    try {
      await cartAPI.clear();
      // Reset local propre
      setCart({ items: [], total: 0, item_count: 0 });
    } catch (e) {
      console.error("Erreur clearCart:", e);
    }
  };

  // Sécurité sur les compteurs pour éviter le undefined
  const itemCount = cart?.item_count ?? 0;
  const total = cart?.total ?? 0;

  return (
    <CartContext.Provider value={{
      cart, loading, itemCount, total,
      addToCart, updateQty, removeItem, clearCart, refresh,
    }}>
      {children}
    </CartContext.Provider>
  );
}