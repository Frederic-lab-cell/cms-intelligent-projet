import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // FIX #1 — État du menu hamburger mobile
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
    setMenuOpen(false);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" onClick={closeMenu} className="text-lg font-bold text-white tracking-tight flex items-center gap-2 flex-shrink-0">
          <span className="text-emerald-400">◆</span>
          <span>CMS<span className="text-emerald-400">IA</span></span>
        </Link>

        {/* Nav links — Desktop uniquement */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/" active={location.pathname === "/"}>Accueil</NavLink>
          <NavLink to="/catalogue" active={location.pathname.startsWith("/catalogue")}>Catalogue</NavLink>
          <NavLink to="/contact" active={location.pathname === "/contact"}>Contact</NavLink>
          {/* FIX #2 — isAdmin vérifié explicitement */}
          {isAdmin === true && (
            <NavLink to="/admin" accent active={location.pathname.startsWith("/admin")}>Admin</NavLink>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {isAdmin === true && (
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

              {/* Commandes — masqué sur très petit écran, visible dans menu mobile */}
              <Link to="/commandes"
                className="hidden sm:block text-sm text-gray-400 hover:text-white transition">
                Commandes
              </Link>

              {/* User + logout — Desktop */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm text-gray-400 border-l border-gray-800 pl-3 ml-1">
                  {user.name?.split(" ")[0] || "Compte"}
                </span>
                <button onClick={handleLogout}
                  className="text-sm px-3 py-1.5 rounded-lg border border-gray-700
                    text-gray-400 hover:text-white hover:border-gray-500 transition">
                  Déconnexion
                </button>
              </div>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
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

          {/* FIX #3 — Bouton hamburger visible UNIQUEMENT sur mobile */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
            aria-label="Menu"
          >
            {menuOpen ? (
              // Icône ✕
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              // Icône ☰
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* FIX #4 — Menu mobile déroulant */}
      {menuOpen && (
        <div className="md:hidden bg-gray-900 border-t border-gray-800 px-4 py-4 space-y-1 shadow-xl">

          {/* Liens de navigation */}
          <MobileLink to="/" onClick={closeMenu}>Accueil</MobileLink>
          <MobileLink to="/catalogue" onClick={closeMenu}>Catalogue</MobileLink>
          <MobileLink to="/contact" onClick={closeMenu}>Contact</MobileLink>

          {/* FIX #5 — Admin visible sur mobile si isAdmin */}
          {isAdmin === true && (
            <MobileLink to="/admin" onClick={closeMenu} accent>
              ⚡ Admin
            </MobileLink>
          )}

          {user ? (
            <>
              <MobileLink to="/panier" onClick={closeMenu}>
                🛒 Panier {itemCount > 0 && `(${itemCount})`}
              </MobileLink>
              <MobileLink to="/commandes" onClick={closeMenu}>Commandes</MobileLink>

              {isAdmin === true && (
                <MobileLink to="/admin/add" onClick={closeMenu}>
                  + Ajouter un produit
                </MobileLink>
              )}

              <div className="pt-3 border-t border-gray-800 mt-3">
                <p className="text-xs text-gray-600 mb-2 uppercase tracking-widest">
                  Connecté en tant que
                </p>
                <p className="text-sm text-white font-medium mb-3">
                  {user.name || user.email}
                  {isAdmin === true && (
                    <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                      ADMIN
                    </span>
                  )}
                </p>
                <button
                  onClick={handleLogout}
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-red-800/50
                    text-red-400 hover:bg-red-900/20 transition font-medium"
                >
                  Déconnexion
                </button>
              </div>
            </>
          ) : (
            <div className="pt-3 border-t border-gray-800 mt-3 space-y-2">
              <Link to="/login" onClick={closeMenu}
                className="block text-center w-full text-sm py-2.5 rounded-xl border border-gray-700
                  text-gray-300 hover:text-white hover:border-gray-500 transition">
                Connexion
              </Link>
              <Link to="/register" onClick={closeMenu}
                className="block text-center w-full text-sm py-2.5 rounded-xl bg-emerald-600
                  hover:bg-emerald-500 text-white font-medium transition">
                S'inscrire
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

// ── Composants internes ───────────────────────────────────────────────────────

function NavLink({ to, children, accent, active }) {
  return (
    <Link to={to}
      className={`px-3 py-1.5 rounded-lg text-sm transition font-medium
        ${accent
          ? "text-emerald-400 hover:bg-emerald-400/10"
          : active
            ? "text-white bg-gray-800"
            : "text-gray-400 hover:text-white hover:bg-gray-800"
        }`}>
      {children}
    </Link>
  );
}

function MobileLink({ to, children, onClick, accent }) {
  return (
    <Link to={to} onClick={onClick}
      className={`block px-4 py-3 rounded-xl text-sm font-medium transition
        ${accent
          ? "text-emerald-400 bg-emerald-400/5 hover:bg-emerald-400/10"
          : "text-gray-300 hover:text-white hover:bg-gray-800"
        }`}>
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