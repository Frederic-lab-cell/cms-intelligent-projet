// src/pages/LoginPage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);

  // 🔹 Gestion des inputs
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  // 🔹 Submit sécurisé
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      return toast.error("Veuillez remplir tous les champs");
    }

    setLoading(true);

    try {
      const user = await login(
        form.email.trim(),
        form.password.trim()
      );

      toast.success(`Bienvenue ${user.name} 👋`);

      // 🔁 Redirection sécurisée
      if (user.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/", { replace: true });
      }

    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
        "Email ou mot de passe incorrect"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      
      {/* HEADER */}
      <div className="text-center mb-8">
        <span className="text-4xl">◆</span>
        <h1 className="text-2xl font-bold text-white mt-3">
          Connexion
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Accédez à votre compte
        </p>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* EMAIL */}
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            Email
          </label>

          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="admin@cms.com"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3
              text-white text-sm placeholder-gray-500
              focus:outline-none focus:border-emerald-500/60"
          />
        </div>

        {/* PASSWORD */}
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            Mot de passe
          </label>

          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            placeholder="••••••••"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3
              text-white text-sm placeholder-gray-500
              focus:outline-none focus:border-emerald-500/60"
          />

          {/* 🔹 Forgot password */}
          <div className="flex justify-between mt-2">
            <label className="flex items-center text-xs text-gray-400">
              <input type="checkbox" className="mr-2" />
              Se souvenir de moi
            </label>

            <Link
              to="/forgot-password"
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              Mot de passe oublié ?
            </Link>
          </div>
        </div>

        {/* BUTTON */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500
            text-white font-semibold transition disabled:opacity-50"
        >
          {loading ? "Connexion en cours..." : "Se connecter"}
        </button>
      </form>

      {/* FOOTER */}
      <p className="text-center text-sm text-gray-500 mt-6">
        Pas de compte ?{" "}
        <Link
          to="/register"
          className="text-emerald-400 hover:text-emerald-300"
        >
          S'inscrire
        </Link>
      </p>
    </div>
  );
}