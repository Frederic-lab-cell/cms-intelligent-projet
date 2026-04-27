import { useEffect, useState } from "react";
import { adminAPI } from "../../services/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const STATUS_LABELS = {
  pending: "En attente", confirmed: "Confirmée",
  shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée",
};
const STATUS_COLORS = {
  pending: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  confirmed: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  shipped: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  delivered: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  cancelled: "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [statusFilter, setFilter] = useState("");
  const [expandId, setExpandId] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    const params = statusFilter ? { status: statusFilter } : {};
    adminAPI.orders(params).then(r => setOrders(r.data)).catch(() => toast.error("Erreur de chargement"));
  };

  useEffect(load, [statusFilter]);

  const updateStatus = async (id, status) => {
    setLoading(true);
    try {
      await adminAPI.updateOrder(id, { status });
      toast.success("Statut mis à jour");
      load();
    } catch (err) {
      toast.error("Erreur mise à jour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 min-h-screen text-white font-sans bg-[#020617]">
      {/* Header avec bouton retour */}
      <div className="flex items-center gap-4 mb-10">
        <button 
          onClick={() => navigate(-1)} 
          className="px-4 py-2 bg-red-900/20 text-red-500 border border-red-900/50 hover:bg-red-900/40 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all"
        >
          ← Retour
        </button>
        <div>
          <h1 className="text-4xl font-black tracking-tighter italic uppercase text-emerald-500">Orders OS</h1>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">Gestion des flux transactionnels</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-8">
        <FilterBtn active={!statusFilter} onClick={() => setFilter("")}>Toutes</FilterBtn>
        {STATUSES.map(s => (
          <FilterBtn key={s} active={statusFilter === s} onClick={() => setFilter(s)}>
            {STATUS_LABELS[s]}
          </FilterBtn>
        ))}
      </div>

      <div className="space-y-3">
        {orders.length > 0 ? orders.map(o => (
          <div key={o.id} className="bg-[#0b1120] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
            <div
              className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-gray-800/20 transition-all"
              onClick={() => setExpandId(expandId === o.id ? null : o.id)}>
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-gray-500">#{o.id}</span>
                <span className={`text-[10px] px-3 py-1 rounded-lg font-bold border uppercase tracking-wider
                  ${STATUS_COLORS[o.status]}`}>
                  {STATUS_LABELS[o.status]}
                </span>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-sm font-bold text-gray-400">
                  {new Date(o.created_at).toLocaleDateString("fr-FR")}
                </span>
                <span className="font-black text-emerald-400 font-mono text-lg">
                  {Number(o.total).toLocaleString()} Ar
                </span>
                <span className="text-gray-600">{expandId === o.id ? "▲" : "▼"}</span>
              </div>
            </div>

            {expandId === o.id && (
              <div className="border-t border-gray-800 px-6 py-5 bg-[#0a0f1d]">
                <div className="mb-4">
                  {o.items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm py-2 border-b border-gray-800 last:border-0">
                      <span className="text-gray-300 font-medium">
                        {item.product_name} <span className="text-gray-600 font-mono text-xs">x {item.quantity}</span>
                      </span>
                      <span className="font-mono text-white font-bold">{Number(item.subtotal).toFixed(2)} Ar</span>
                    </div>
                  ))}
                </div>
                {o.address && (
                  <p className="text-xs text-gray-500 mb-6 bg-gray-900/50 p-3 rounded-xl border border-gray-800">
                    📍 {o.address}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mr-2">Status Shift :</span>
                  {STATUSES.filter(s => s !== o.status).map(s => (
                    <button key={s} onClick={() => updateStatus(o.id, s)}
                      disabled={loading}
                      className={`text-[10px] font-bold px-4 py-2 rounded-xl border transition-all uppercase tracking-wider
                        ${STATUS_COLORS[s]} hover:opacity-100 opacity-70`}>
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )) : (
          <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-3xl">
            <p className="text-gray-500 font-bold uppercase tracking-[0.2em]">Aucune commande trouvée</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
        ${active
          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20"
          : "bg-[#0b1120] border border-gray-800 text-gray-500 hover:text-white hover:border-emerald-500/30"}`}>
      {children}
    </button>
  );
}