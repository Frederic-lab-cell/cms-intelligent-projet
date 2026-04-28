import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // Assure-toi que ce fichier existe pour le style Tailwind

// Utilisation de la nouvelle API de React 18+
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("L'élément racine #root n'a pas été trouvé. Vérifie ton index.html");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    {/* App contient déjà BrowserRouter, AuthProvider et CartProvider */}
    <App />
  </React.StrictMode>
);