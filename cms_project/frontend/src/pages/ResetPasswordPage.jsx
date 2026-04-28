import { useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token"); // Récupère le jeton dans ?token=XYZ

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Nouveau mot de passe pour le token:", token);
    // Ici, vous envoyez le token et le nouveau mot de passe à votre backend
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-16 text-white">
      <h1 className="text-2xl font-bold mb-6">Nouveau mot de passe</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nouveau mot de passe" 
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3"
          required
        />
        <button type="submit" className="w-full py-3 bg-emerald-600 rounded-xl font-semibold">
          Enregistrer
        </button>
      </form>
    </div>
  );
}