// src/pages/admin/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminAPI } from "../../services/api";
import Swal from 'sweetalert2'; 
import PopularProductsChart from "../../components/PopularProductsChart";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [spamWords, setSpamWords] = useState([]);
  const [rlMetrics, setRlMetrics] = useState(null);
  const [rlLoading, setRlLoading] = useState(false);

  // Configuration de base pour les alertes sombres
  const swalConfig = {
    background: '#111827',
    color: '#fff',
    confirmButtonColor: '#10b981',
  };

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [statsRes, spamRes, rlRes] = await Promise.all([
          adminAPI.dashboard(),
          adminAPI.spamWords(),
          adminAPI.rlMetrics(),
        ]);
        setStats(statsRes.data);
        setSpamWords(spamRes.data);
        setRlMetrics(rlRes.data);
      } catch (e) {
        console.log("Chargement initial admin failed:", e);
      }
    };

    loadInitial();

    const autoEnrich = async () => {
      try {
        await adminAPI.recomputeTFIDF();
        await adminAPI.runRL({});
        const [statsRes, rlRes] = await Promise.all([
          adminAPI.dashboard(),
          adminAPI.rlMetrics(),
        ]);
        setStats(statsRes.data);
        setRlMetrics(rlRes.data);
      } catch (e) {
        console.log("Enrichissement auto en attente...");
      }
    };
    
    autoEnrich();
  }, []);

  const runRL = async () => {
    const result = await Swal.fire({
      ...swalConfig,
      title: 'Lancer l\'apprentissage RL ?',
      text: "L'agent de renforcement va mettre à jour les scores des produits.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Démarrer l\'épisode',
      cancelButtonText: 'Annuler',
      cancelButtonColor: '#374151',
    });

    if (!result.isConfirmed) return;

    setRlLoading(true);
    Swal.fire({
      ...swalConfig,
      title: 'Apprentissage en cours...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading() }
    });

    try {
      const { data } = await adminAPI.runRL({});
      const [statsRes, rlMetricsRes] = await Promise.all([
        adminAPI.dashboard(),
        adminAPI.rlMetrics(),
      ]);
      setStats(statsRes.data);
      setRlMetrics(rlMetricsRes.data);
      Swal.fire({
        ...swalConfig,
        icon: 'success',
        title: 'Épisode RL terminé',
        text: `${data.products_updated} produits ont été mis à jour avec succès.`,
      });
    } catch { 
      Swal.fire({
        ...swalConfig,
        icon: 'error',
        title: 'Erreur RL',
        text: 'Impossible de terminer l\'apprentissage.',
      });
    } finally { setRlLoading(false); }
  };

  const recomputeTFIDF = async () => {
    Swal.fire({
      ...swalConfig,
      title: 'Recalcul TF-IDF',
      text: 'Analyse de tout le corpus en cours...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading() }
    });

    try {
      await adminAPI.recomputeTFIDF();
      const r = await adminAPI.dashboard(); 
      setStats(r.data);
      Swal.fire({
        ...swalConfig,
        icon: 'success',
        title: 'TF-IDF mis à jour',
        text: 'Le moteur de recommandation est maintenant synchronisé.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch {
      Swal.fire({
        ...swalConfig,
        icon: 'error',
        title: 'Erreur technique',
        text: 'Le recalcul a échoué.',
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard Admin</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={recomputeTFIDF}
            className="px-4 py-2 rounded-xl border border-purple-500/30 text-purple-400
              hover:bg-purple-500/10 text-sm font-medium transition shadow-lg shadow-purple-500/5">
            ↻ TF-IDF
          </button>
          <button onClick={runRL} disabled={rlLoading}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500
              text-white text-sm font-medium transition disabled:opacity-50 shadow-lg shadow-emerald-500/20">
            {rlLoading ? "RL en cours..." : "▶ Épisode RL"}
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 mb-8 group/container">
          {[
            { label: "Clients",       value: stats.total_users,     icon: "👤" },
            { label: "Produits",      value: stats.total_products,  icon: "📦" },
            { label: "Commandes",     value: stats.total_orders,    icon: "🛒" },
            { label: "Revenus",       value: stats.revenue,         icon: "💰", accent: true, isPrice: true },
            { label: "Spams Bloqués", value: stats.total_spams_detected, icon: "🛡️",
              danger: stats.total_spams_detected > 0 },
            { label: "Msgs non lus",  value: stats.pending_messages, icon: "💬",
              warn: stats.pending_messages > 0 },
            { label: "Stock faible",  value: stats.low_stock_alerts, icon: "⚠️",
              warn: stats.low_stock_alerts > 0 },
          ].map((k, i) => (
            <div 
              key={i} 
              className={`bg-gray-900/50 backdrop-blur-sm border rounded-2xl p-4 transition-all duration-300
                group-hover/container:scale-[0.95] group-hover/container:opacity-50 group-hover/container:blur-[1px]
                hover:!scale-[1.1] hover:!opacity-100 hover:!blur-none hover:z-10 hover:shadow-2xl
                ${k.warn ? "border-amber-500/30 shadow-amber-500/5" : k.danger ? "border-red-500/30 shadow-red-500/5" : "border-gray-800"}`}
            >
              <div className="text-xl mb-3">{k.icon}</div>
              <div className={`font-bold font-mono leading-tight
                ${k.isPrice ? "text-base" : "text-lg truncate"}
                ${k.accent ? "text-emerald-400" : k.warn ? "text-amber-400" : k.danger ? "text-red-400" : "text-white"}`}>
                {k.isPrice ? `${new Intl.NumberFormat('fr-FR').format(k.value)} Ar` : k.value}
              </div>
              <div className="text-[10px] uppercase font-bold text-gray-500 mt-1 tracking-wider">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Graphique d'évolution RL / ventes */}
      {rlMetrics && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Graphique d'évolution des ventes</h2>
              <p className="text-sm text-gray-400">Historique 14 jours et comportement epsilon-greedy.</p>
            </div>
            <div className="flex gap-3 text-sm text-gray-300">
              <span className="px-3 py-2 rounded-2xl bg-slate-800/80">ε = {rlMetrics.epsilon}</span>
              <span className="px-3 py-2 rounded-2xl bg-slate-800/80">Épisodes = {rlMetrics.episodes}</span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            {/* Graphique historique ventes */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-3xl p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-400">Ventes journalières</span>
                <span className="text-xs text-green-400">Derniers 14 jours</span>
              </div>
              <div className="flex items-end gap-2 h-44">
                {rlMetrics.sales_history.map((item) => {
                  const maxQty = Math.max(...rlMetrics.sales_history.map(v => v.qty), 1);
                  const height = Math.max(12, (item.qty / maxQty) * 100);
                  return (
                    <div key={item.date} className="flex-1 text-center">
                      <div className="mx-auto w-full h-full flex items-end">
                        <div className="w-full rounded-t-2xl bg-emerald-400" style={{ height: `${height}%` }} />
                      </div>
                      <div className="mt-2 text-[10px] text-gray-500">{item.date.slice(5)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Nouveau graphique intégré */}
            <PopularProductsChart data={rlMetrics.top_products} />
          </div>
        </div>
      )}

      {/* Nav rapide */}
      <div className="grid sm:grid-cols-3 gap-6 mb-8">
        {[
          { to: "/admin/produits",  icon: "📦", title: "Gérer les produits",
            desc: "Inventaire & Tags TF-IDF" },
          { to: "/admin/commandes", icon: "🛒", title: "Gérer les commandes",
            desc: "Transactions & Statuts" },
          { to: "/admin/messages",  icon: "💬", title: "Messagerie",
            desc: "Filtre Naïve Bayes" },
        ].map((nav, i) => (
          <Link key={i} to={nav.to}
            className="bg-gray-900 border border-gray-800 rounded-3xl p-6
              hover:border-emerald-500/30 transition-all group hover:bg-gray-800/50">
            <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{nav.icon}</div>
            <h3 className="font-bold text-white mb-1 group-hover:text-emerald-400 transition">
              {nav.title}
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">{nav.desc}</p>
          </Link>
        ))}
      </div>

      {/* Spam words */}
      {spamWords.length > 0 && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-red-500 text-xl">🚫</span>
            <h2 className="font-bold text-white tracking-tight">Top mots indicateurs de spam (Naïve Bayes)</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {spamWords.map((w, i) => (
              <span key={i}
                className="px-4 py-2 rounded-xl text-xs font-mono bg-red-500/5
                  text-red-400 border border-red-500/10 hover:border-red-500/40 transition-colors">
                {w.word} <span className="opacity-40 text-[10px] ml-1">{w.score.toFixed(2)}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}