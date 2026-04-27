import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";

// Pages visiteur
import HomePage from "./pages/HomePage";
import CatalogPage from "./pages/CatalogPage";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import ContactPage from "./pages/ContactPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
// Importations pour le mot de passe
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

// Pages admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminMessages from "./pages/admin/AdminMessages";
// Vérifie que ce fichier existe bien dans src/pages/admin/AdminAddProduct.jsx
import AdminAddProduct from "./pages/admin/AdminAddProduct"; 

// Layout
import Navbar from "./components/Navbar";

/**
 * Composant de protection des routes amélioré
 */
function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  
  // 1. Attendre la fin de la vérification du token pour éviter l'écran blanc
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-emerald-500 font-bold animate-pulse">Vérification...</div>
      </div>
    );
  }
  
  // 2. Rediriger vers login si non connecté
  if (!user) return <Navigate to="/login" replace />;
  
  // 3. Rediriger vers accueil si accès admin requis mais utilisateur standard
  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-950 text-gray-100">
        <Routes>
          {/* ── Visiteur / Client ── */}
          <Route path="/" element={<HomePage />} />
          <Route path="/catalogue" element={<CatalogPage />} />
          <Route path="/produit/:id" element={<ProductPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* Routes mot de passe oublie */}
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* ── Client Protégé ── */}
          <Route path="/panier" element={
            <PrivateRoute><CartPage /></PrivateRoute>} />
          <Route path="/checkout" element={
            <PrivateRoute><CheckoutPage /></PrivateRoute>} />
          <Route path="/commandes" element={
            <PrivateRoute><OrdersPage /></PrivateRoute>} />

          {/* ── Administration ── */}
          <Route path="/admin" element={
            <PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>} />
          
          <Route path="/admin/add" element={
            <PrivateRoute adminOnly><AdminAddProduct /></PrivateRoute>} />

          <Route path="/admin/produits" element={
            <PrivateRoute adminOnly><AdminProducts /></PrivateRoute>} />
          
          <Route path="/admin/commandes" element={
            <PrivateRoute adminOnly><AdminOrders /></PrivateRoute>} />
          
          <Route path="/admin/messages" element={
            <PrivateRoute adminOnly><AdminMessages /></PrivateRoute>} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#1f2937",
                color: "#f9fafb",
                border: "1px solid #374151",
              },
            }}
          />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}