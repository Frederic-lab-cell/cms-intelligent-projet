// src/pages/ContactPage.jsx — Messagerie intelligente Naïve Bayes
import { useState } from "react";
import { messagesAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function ContactPage() {
  const { user } = useAuth();
  const [email,   setEmail]   = useState(user?.email || "");
  const [content, setContent] = useState("");
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await messagesAPI.send({ email, content });
      setResult(data);
      setContent("");
    } catch { setResult({ error: "Erreur lors de l'envoi" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Contact et Support</h1>
        <p className="text-gray-400 text-sm">
          Notre système IA (Naïve Bayes) analyse votre message et génère une réponse
          automatique adaptée à votre demande.
        </p>
      </div>

      {/* Info IA */}
      <div className="flex gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl
        p-4 mb-6">
        <span className="text-xl">🤖</span>
        <div>
          <p className="text-sm font-medium text-purple-300">Messagerie intelligente</p>
          <p className="text-xs text-purple-400/70 mt-0.5">
            Naïve Bayes détecte le spam et identifie l'intention de votre message
            (commande, retour, livraison, compte…) pour une réponse instantanée.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            required placeholder="votre@email.com"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5
              text-white text-sm placeholder-gray-500 focus:outline-none
              focus:border-emerald-500/60"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Message</label>
          <textarea
            value={content} onChange={e => setContent(e.target.value)}
            required rows={5}
            placeholder="Décrivez votre demande (commande, livraison, retour, problème...)"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3
              text-white text-sm placeholder-gray-500 focus:outline-none
              focus:border-emerald-500/60 resize-none"
          />
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500
            text-white font-semibold transition disabled:opacity-50">
          {loading ? "Analyse en cours..." : "Envoyer le message"}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className={`mt-6 rounded-2xl p-5 border
          ${result.is_spam
            ? "bg-red-500/10 border-red-500/25"
            : "bg-emerald-500/10 border-emerald-500/25"}`}>

          {result.is_spam ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-red-400 text-lg">🚫</span>
                <span className="font-semibold text-red-400">Message détecté comme spam</span>
              </div>
              <p className="text-sm text-red-400/70">{result.notice}</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-emerald-400 text-lg">✓</span>
                <span className="font-semibold text-emerald-400">Message reçu</span>
                <span className="ml-auto text-xs bg-emerald-500/20 text-emerald-400
                  px-2 py-0.5 rounded-full font-mono">
                  intention: {result.intent}
                </span>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-2 font-mono uppercase tracking-wider">
                  Réponse automatique Naïve Bayes
                </p>
                <p className="text-sm text-gray-200 leading-relaxed">{result.auto_reply}</p>
              </div>

              <p className="text-xs text-gray-500 mt-3">
                Ticket #{result.message_id} — Notre équipe suivra si nécessaire
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
