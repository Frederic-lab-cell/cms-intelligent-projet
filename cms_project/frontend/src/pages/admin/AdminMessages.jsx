import { useEffect, useState } from "react";
import { adminAPI } from "../../services/api";
import toast from "react-hot-toast";
import Swal from 'sweetalert2';
import { useNavigate } from "react-router-dom";

export default function AdminMessages() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [showSpam, setShowSpam] = useState(false);
  const [loading, setLoading] = useState(false);

  const swalConfig = {
    background: '#0b1120',
    color: '#fff',
    confirmButtonColor: '#10b981',
    customClass: {
      popup: 'border border-gray-800 rounded-3xl'
    }
  };

  const load = () => {
    adminAPI.messages({ spam: showSpam ? "true" : "false" })
      .then(r => setMessages(r.data))
      .catch(() => toast.error("Erreur de synchronisation"));
  };

  useEffect(load, [showSpam]);

  const markRead = async (id) => {
    await adminAPI.markRead(id);
    toast.success("Statut mis à jour");
    load();
  };

  const handleFeedback = async (msg) => {
    const newStatus = !msg.is_spam;
    const actionText = newStatus ? "marquer comme SPAM" : "réhabiliter comme SAIN";

    const result = await Swal.fire({
      ...swalConfig,
      title: 'Feedback IA',
      text: `Voulez-vous ${actionText} ce message ? Le modèle sera ré-entraîné.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Appliquer',
      cancelButtonText: 'Annuler'
    });

    if (!result.isConfirmed) return;

    try {
      await adminAPI.feedbackSpam(msg.id, newStatus);
      toast.success("IA mise à jour");
      load();
    } catch (err) {
      toast.error("Erreur lors de l'entraînement");
    }
  };

  const unread = messages.filter(m => !m.is_read).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 min-h-screen text-white font-sans bg-[#020617]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <button 
          onClick={() => navigate(-1)} 
          className="px-4 py-2 bg-red-900/20 text-red-500 border border-red-900/50 hover:bg-red-900/40 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all"
        >
          ← Retour
        </button>
        <div>
          <h1 className="text-4xl font-black tracking-tighter italic uppercase text-emerald-500">Inbox OS</h1>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">
            {unread} messages en attente de lecture
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-end mb-8">
        <button onClick={() => setShowSpam(s => !s)}
          className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-lg
            ${showSpam
              ? "bg-red-500/10 border-red-500/30 text-red-400"
              : "bg-[#0b1120] border-gray-800 text-gray-500 hover:text-white hover:border-emerald-500/30"}`}>
          {showSpam ? "🚫 Voir les SPAMS" : "✉️ Voir la boîte de réception"}
        </button>
      </div>

      {/* Messages */}
      <div className="space-y-4">
        {messages.length > 0 ? messages.map(m => (
          <div key={m.id}
            className={`bg-[#0b1120] border rounded-3xl p-6 transition-all shadow-lg
              ${m.is_spam ? "border-red-900/30" : m.is_read ? "border-gray-800" : "border-emerald-500/30"}`}>

            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white text-base tracking-tight">{m.sender_email}</span>
                  {!m.is_read && !m.is_spam && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  )}
                </div>
                <span className="text-[10px] text-gray-600 font-mono mt-1 block">
                  {new Date(m.created_at).toLocaleString("fr-FR")}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`text-[9px] px-3 py-1 rounded-lg font-black uppercase tracking-wider border
                  ${m.is_spam
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                  {m.is_spam ? `Spam ${(m.spam_proba*100).toFixed(0)}%` : "Normal"}
                </span>
                
                <button onClick={() => handleFeedback(m)}
                  title="Corriger l'IA"
                  className={`text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-lg border transition-all ${
                    m.is_spam 
                    ? "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10" 
                    : "border-red-500/30 text-red-500 hover:bg-red-500/10"
                  }`}>
                  {m.is_spam ? "Réhabiliter" : "Signaler Spam"}
                </button>
              </div>
            </div>

            <div className="bg-gray-900/50 rounded-2xl p-4 mb-4 border border-gray-800">
              <p className="text-sm text-gray-300 leading-relaxed">{m.content}</p>
            </div>

            {m.auto_reply && (
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4">
                <p className="text-[9px] font-black text-emerald-500/50 uppercase tracking-[0.2em] mb-2">
                  Auto-réponse (Naïve Bayes)
                </p>
                <p className="text-sm text-emerald-400/80 italic">{m.auto_reply}</p>
              </div>
            )}
            
            {!m.is_read && (
              <div className="mt-4 pt-4 border-t border-gray-800 flex justify-end">
                 <button onClick={() => markRead(m.id)}
                    className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition">
                    Marquer comme lu
                  </button>
              </div>
            )}
          </div>
        )) : (
          <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-3xl">
            <p className="text-gray-600 font-bold uppercase tracking-[0.2em]">Aucun message</p>
          </div>
        )}
      </div>
    </div>
  );
}