// src/pages/HomePage.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { recoAPI, productsAPI } from "../services/api";
import ProductCard from "../components/ProductCard";

const API_URL = "http://localhost:5000";

export default function HomePage() {
  const [data, setData] = useState({
    popular: [],
    trending: [],
    newArrivals: [],
    loading: true
  });
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [resPop, resTrend, resNew] = await Promise.all([
          recoAPI.popular().catch(() => ({ data: [] })),
          recoAPI.trending().catch(() => ({ data: [] })),
          productsAPI.latest().catch(() => ({ data: [] }))
        ]);

        setData({
          popular: resPop?.data?.slice(0, 4) || [],
          trending: resTrend?.data?.slice(0, 4) || [],
          newArrivals: resNew?.data?.slice(0, 3) || [],
          loading: false
        });
      } catch (err) {
        console.error("Error loading data:", err);
        setData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchAllData();
  }, []);

  useEffect(() => {
    if (data.newArrivals.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % data.newArrivals.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [data.newArrivals.length]);

  const handleAddToCart = (product) => {
    if (!product) return;

    try {
      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      const existingIndex = cart.findIndex(item => item.id === product.id);

      if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
      } else {
        cart.push({ ...product, quantity: 1 });
      }

      localStorage.setItem("cart", JSON.stringify(cart));
    } catch (error) {
      console.error("Storage Error:", error);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-12">

        {/* Hero Section avec Carousel */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 mb-16 relative overflow-hidden">
          {data.loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : data.newArrivals.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-12 items-center min-h-[400px]">
              <div>
                <div className="mb-6">
                  <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                    Nouveau produit
                  </span>
                </div>

                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  {data.newArrivals[currentSlide]?.name}
                </h1>

                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  {data.newArrivals[currentSlide]?.description || "Découvrez notre dernière nouveauté avec des technologies d'IA avancées."}
                </p>

                <div className="flex items-center gap-4 mb-8">
                  <span className="text-3xl font-bold text-blue-600">
                    {Number(data.newArrivals[currentSlide]?.price).toLocaleString()} Ar
                  </span>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => handleAddToCart(data.newArrivals[currentSlide])}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                  >
                    Ajouter au panier
                  </button>
                  <Link
                    to={`/product/${data.newArrivals[currentSlide]?.id}`}
                    className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3 rounded-lg font-medium transition-colors"
                  >
                    Voir détails
                  </Link>
                </div>
              </div>

              <div className="relative">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={`${API_URL}/static/uploads/${data.newArrivals[currentSlide]?.image_url}`}
                    alt={data.newArrivals[currentSlide]?.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex justify-center gap-2 mt-6">
                  {data.newArrivals.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentSlide ? 'bg-blue-600 w-8' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                CMS Intelligent
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Plateforme e-commerce alimentée par l'intelligence artificielle pour des recommandations personnalisées et une expérience client optimale.
              </p>
              <div className="flex justify-center gap-4">
                <Link
                  to="/catalogue"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  Explorer le catalogue
                </Link>
                <Link
                  to="/login"
                  className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  Se connecter
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className="grid md:grid-cols-3 gap-8 mb-16">
          {[
            {
              icon: "🏷️",
              title: "TF-IDF Tagging",
              desc: "Extraction automatique de mots-clés sémantiques pour une classification intelligente des produits."
            },
            {
              icon: "🔍",
              title: "Similarité Cosinus",
              desc: "Recommandations basées sur la proximité vectorielle pour des suggestions pertinentes."
            },
            {
              icon: "🛡️",
              title: "Filtrage Naïve Bayes",
              desc: "Protection proactive contre les messages indésirables grâce à l'apprentissage automatique."
            },
          ].map((feature, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </section>

        {['popular', 'trending'].map((type) => (
          <section key={type} className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                {type === 'popular' ? 'Produits populaires' : 'Tendances actuelles'}
              </h2>
              <Link
                to="/catalogue"
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                Voir tout →
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {data.loading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 h-80 animate-pulse" />
                ))
              ) : (
                data[type].map(product => (
                  <ProductCard key={product.id} product={product} />
                ))
              )}
            </div>
          </section>
        ))}

      </div>
    </div>
  );
}
