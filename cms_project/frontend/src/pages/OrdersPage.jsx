// src/pages/OrdersPage.jsx
import { useEffect, useState } from "react";
import { ordersAPI } from "../services/api";

const STATUS_LABELS = {
  pending:   { text: "En attente",  cls: "bg-yellow-500/15 text-yellow-400" },
  confirmed: { text: "Confirmée",   cls: "bg-blue-500/15 text-blue-400" },
  shipped:   { text: "Expédiée",    cls: "bg-purple-500/15 text-purple-400" },
  delivered: { text: "Livrée",      cls: "bg-emerald-500/15 text-emerald-400" },
  cancelled: { text: "Annulée",     cls: "bg-red-500/15 text-red-400" },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    ordersAPI.list().then(r => setOrders(r.data));
  }, []);

  if (!orders.length) return (
    <div className="text-center py-20 text-gray-500">
      <p className="text-4xl mb-3">📦</p>
      <p>Aucune commande pour l'instant</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-white mb-8">Mes commandes</h1>
      <div className="space-y-4">
        {orders.map(o => {
          const s = STATUS_LABELS[o.status] || STATUS_LABELS.pending;
          return (
            <div key={o.id}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-mono text-gray-400">
                  Commande #{o.id}
                </span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.cls}`}>
                  {s.text}
                </span>
              </div>
              <div className="space-y-1 mb-3">
                {o.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-300">
                      {item.product_name} × {item.quantity}
                    </span>
                    <span className="text-white font-mono">{item.subtotal.toFixed(2)}Ar</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                <span className="text-xs text-gray-500">
                  {new Date(o.created_at).toLocaleDateString("fr-FR")}
                </span>
                <span className="font-bold text-emerald-400 font-mono">
                  {o.total.toFixed(2)}Ar
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
