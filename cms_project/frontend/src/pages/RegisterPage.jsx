// src/pages/RegisterPage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      await login(form.email, form.password);
      toast.success("Compte créé !");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.error || "Erreur lors de l'inscription");
    } finally { setLoading(false); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <span className="text-4xl">◆</span>
        <h1 className="text-2xl font-bold text-white mt-3">Créer un compte</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { label: "Nom complet", key: "name", type: "text", ph: "Jean Frederic" },
          { label: "Email", key: "email", type: "email", ph: "jean@email.com" },
          { label: "Mot de passe", key: "password", type: "password", ph: "8 caractères min." },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-sm text-gray-400 mb-1.5">{f.label}</label>
            <input type={f.type} value={form[f.key]} onChange={set(f.key)}
              required placeholder={f.ph}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3
                text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500/60"/>
          </div>
        ))}
        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500
            text-white font-semibold transition disabled:opacity-50">
          {loading ? "Création..." : "Créer le compte"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Déjà un compte ?{" "}
        <Link to="/login" className="text-emerald-400 hover:text-emerald-300">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
