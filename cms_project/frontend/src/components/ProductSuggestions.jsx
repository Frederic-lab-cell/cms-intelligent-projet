import React, { useEffect, useState } from 'react';
import axios from 'axios';

// Utilise une variable d'environnement ou une constante pour l'URL de base
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ProductSuggestions = ({ productId }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!productId) return;

        setLoading(true);
        axios.get(`${API_BASE_URL}/api/products/suggestions/${productId}`)
            .then(res => {
                setSuggestions(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Erreur suggestions IA:", err);
                setLoading(false);
            });
    }, [productId]);

    if (loading) return <div className="text-center my-3 small text-muted">Analyse des préférences par l'IA...</div>;
    if (suggestions.length === 0) return null;

    return (
        <div className="mt-5 pt-4 border-top">
            <h3 className="mb-4">
                <span className="badge bg-info me-2">IA</span>
                Produits suggérés pour vous
            </h3>
            <div className="row g-3">
                {suggestions.map(p => (
                    <div key={p.id} className="col-6 col-md-3">
                        <div className="card h-100 shadow-sm border-0 hover-zoom">
                            <img 
                                src={`${API_BASE_URL}/static/uploads/${p.image_url}`} 
                                className="card-img-top object-fit-cover" 
                                style={{ height: '150px' }}
                                alt={p.name} 
                                onError={(e) => e.target.src = 'https://via.placeholder.com/150'}
                            />
                            <div className="card-body p-2 text-center">
                                <h6 className="card-title mb-1 text-truncate" title={p.name}>{p.name}</h6>
                                <p className="fw-bold text-primary mb-0">{p.price} €</p>
                                {p.ia_score && (
                                    <div className="progress mt-2" style={{ height: '4px' }}>
                                        <div 
                                            className="progress-bar bg-info" 
                                            style={{ width: `${p.ia_score * 100}%` }}
                                        ></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProductSuggestions;