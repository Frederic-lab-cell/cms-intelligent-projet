import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // On affiche le même message peu importe si le mail existe ou non (Sécurité)
      toast.success("Si cet email est enregistré, un lien de réinitialisation vous a été envoyé.");
    } catch (error) {
      toast.error("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-16 text-white">
      <h1 className="text-2xl font-bold mb-6">Mot de passe oublié</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Entrez votre email" 
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3"
          required
        />
        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-3 bg-emerald-600 rounded-xl font-semibold disabled:opacity-50"
        >
          {loading ? "Envoi en cours..." : "Envoyer le lien"}
        </button>
      </form>
      <div className="mt-4 text-center">
        <Link to="/login" className="text-sm text-emerald-400">Retour à la connexion</Link>
      </div>
    </div>
  );
}