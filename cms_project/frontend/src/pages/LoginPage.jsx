import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FiEye, FiEyeOff } from "react-icons/fi"; 
import toast from "react-hot-toast";

export default function LoginPage() {
  // 1. Vérification des Hooks
  const auth = useAuth();
  const navigate = useNavigate();

  // 2. Initialisation des états
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 3. Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.email || !form.password) {
      return toast.error("Veuillez remplir tous les champs");
    }

    setLoading(true);
    try {
      // Sécurité au cas où login n'est pas encore chargé
      if (!auth || !auth.login) {
        throw new Error("Service d'authentification indisponible");
      }

      const user = await auth.login(
        form.email.trim(),
        form.password.trim()
      );

      toast.success(`Bienvenue ${user?.name || ''} 👋`);
      
      if (user?.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("Erreur Login:", err);
      toast.error(err?.response?.data?.message || "Identifiants incorrects");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <span className="text-4xl text-emerald-500 font-bold">◆</span>
        <h1 className="text-2xl font-bold text-white mt-3">Connexion</h1>
        <p className="text-gray-500 text-sm mt-1">Accédez à votre compte</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* EMAIL */}
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            autoComplete="email"
            placeholder="admin@cms.com"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3
              text-white text-sm placeholder-gray-500
              focus:outline-none focus:border-emerald-500/60 transition-all"
          />
        </div>

        {/* MOT DE PASSE */}
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Mot de passe</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3
                text-white text-sm placeholder-gray-500
                focus:outline-none focus:border-emerald-500/60 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-1"
              aria-label={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
            </button>
          </div>

          <div className="flex justify-between mt-3">
            <label className="flex items-center text-xs text-gray-400 cursor-pointer group">
              <input type="checkbox" className="mr-2 accent-emerald-500" />
              <span className="group-hover:text-gray-300 transition">Se souvenir de moi</span>
            </label>
            <Link to="/forgot-password" size={18} className="text-xs text-emerald-400 hover:text-emerald-300 transition">
              Mot de passe oublié ?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500
            text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed
            shadow-lg shadow-emerald-900/20 active:scale-[0.98]"
        >
          {loading ? "Connexion en cours..." : "Se connecter"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Pas de compte ?{" "}
        <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-medium ml-1">
          S'inscrire
        </Link>
      </p>
    </div>
  );
}