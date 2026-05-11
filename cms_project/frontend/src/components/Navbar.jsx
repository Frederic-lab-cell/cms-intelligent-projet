import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Fermer le menu si on change de page (sécurité supplémentaire)
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate("/");
    setMenuOpen(false);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        
        {/* --- LOGO --- */}
        <Link to="/" onClick={closeMenu} className="text-xl font-bold text-white flex items-center gap-2 flex-shrink-0">
          <span className="text-emerald-400">◆</span>
          <span>CMS<span className="text-emerald-400">IA</span></span>
        </Link>

        {/* --- DESKTOP NAVIGATION --- */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/" active={location.pathname === "/"}>Accueil</NavLink>
          <NavLink to="/catalogue" active={location.pathname.startsWith("/catalogue")}>Catalogue</NavLink>
          <NavLink to="/contact" active={location.pathname === "/contact"}>Contact</NavLink>
          {isAdmin && (
            <NavLink to="/admin" accent active={location.pathname.startsWith("/admin")}>Admin</NavLink>
          )}
        </div>

        {/* --- ACTIONS DROITE --- */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Panier (Toujours visible) */}
              <Link to="/panier" className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition">
                <CartIcon />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-500 text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-gray-900">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </Link>

              {/* Utilisateur PC */}
              <div className="hidden sm:flex items-center gap-4">
                <span className="text-sm text-gray-400 border-l border-gray-800 pl-4">
                  {user.name?.split(" ")[0] || "Compte"}
                </span>
                <button onClick={handleLogout} className="text-sm font-medium text-red-400 hover:text-red-300 transition">
                  Quitter
                </button>
              </div>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-3">
              <Link to="/login" className="text-sm text-gray-400 hover:text-white px-3">Connexion</Link>
              <Link to="/register" className="text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition">
                S'inscrire
              </Link>
            </div>
          )}

          {/* --- BOUTON HAMBURGER (Mobile) --- */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* --- MENU MOBILE DÉROULANT --- */}
      {menuOpen && (
        <div className="md:hidden bg-gray-900 border-t border-gray-800 px-4 py-6 space-y-2 shadow-2xl animate-in">
          <MobileLink to="/" onClick={closeMenu}>Accueil</MobileLink>
          <MobileLink to="/catalogue" onClick={closeMenu}>Catalogue</MobileLink>
          <MobileLink to="/contact" onClick={closeMenu}>Contact</MobileLink>
          
          {isAdmin && (
            <MobileLink to="/admin" onClick={closeMenu} accent>⚡ Tableau de Bord Admin</MobileLink>
          )}

          <div className="pt-4 border-t border-gray-800 mt-4">
            {user ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 uppercase px-4">Session : {user.email}</p>
                <MobileLink to="/commandes" onClick={closeMenu}>Mes Commandes</MobileLink>
                <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-red-400 font-medium">
                  Déconnexion
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-2">
                <Link to="/login" onClick={closeMenu} className="text-center py-3 rounded-xl border border-gray-700 text-gray-300">Connexion</Link>
                <Link to="/register" onClick={closeMenu} className="text-center py-3 rounded-xl bg-emerald-600 text-white font-medium">S'inscrire</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

// --- SOUS-COMPOSANTS ---

function NavLink({ to, children, accent, active }) {
  return (
    <Link to={to} className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 font-medium ${
      accent ? "text-emerald-400 hover:bg-emerald-400/10" : 
      active ? "text-white bg-gray-800" : "text-gray-400 hover:text-white hover:bg-gray-800"
    }`}>
      {children}
    </Link>
  );
}

function MobileLink({ to, children, onClick, accent }) {
  return (
    <Link to={to} onClick={onClick} className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors ${
      accent ? "text-emerald-400 bg-emerald-400/5" : "text-gray-300 hover:bg-gray-800 hover:text-white"
    }`}>
      {children}
    </Link>
  );
}

function CartIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}