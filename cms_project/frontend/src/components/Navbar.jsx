// src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <nav className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <span className="text-emerald-400">◆</span>
          <span>CMS<span className="text-emerald-400">IA</span></span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/">Accueil</NavLink>
          <NavLink to="/catalogue">Catalogue</NavLink>
          <NavLink to="/contact">Contact</NavLink>
          {isAdmin && <NavLink to="/admin" accent>Admin</NavLink>}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* BOUTON AJOUT PRODUIT (ADMIN UNIQUEMENT) */}
              {isAdmin && (
                <Link 
                  to="/admin/add" 
                  className="hidden lg:flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider 
                             text-emerald-400 border border-emerald-400/30 px-3 py-1.5 rounded-lg 
                             hover:bg-emerald-400 hover:text-black transition-all duration-300"
                >
                  <span className="text-lg">+</span> Produit
                </Link>
              )}

              {/* Cart */}
              <Link to="/panier"
                className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition">
                <CartIcon />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-500 text-black text-xs
                    font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </Link>

              {/* Orders */}
              <Link to="/commandes"
                className="hidden sm:block text-sm text-gray-400 hover:text-white transition">
                Commandes
              </Link>

              {/* User menu */}
              <div className="flex items-center gap-2">
                <span className="hidden sm:block text-sm text-gray-400 border-l border-gray-800 pl-3 ml-1">
                  {user.name.split(" ")[0]}
                </span>
                <button onClick={handleLogout}
                  className="text-sm px-3 py-1.5 rounded-lg border border-gray-700
                    text-gray-400 hover:text-white hover:border-gray-500 transition">
                  Déconnexion
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login"
                className="text-sm text-gray-400 hover:text-white transition px-3 py-1.5">
                Connexion
              </Link>
              <Link to="/register"
                className="text-sm px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500
                  text-white font-medium transition">
                S'inscrire
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, children, accent }) {
  return (
    <Link to={to}
      className={`px-3 py-1.5 rounded-lg text-sm transition font-medium
        ${accent
          ? "text-emerald-400 hover:bg-emerald-400/10"
          : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
      {children}
    </Link>
  );
}

function CartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184
        1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}