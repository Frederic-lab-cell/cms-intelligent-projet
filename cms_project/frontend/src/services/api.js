import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:5000/api" });

/**
 * 1. INJECTION DU TOKEN JWT
 */
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

/**
 * 2. GESTION DU REFRESH AUTOMATIQUE
 */
api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const originalRequest = err.config;
    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(
            "http://localhost:5000/api/auth/refresh",
            {},
            { headers: { Authorization: `Bearer ${refresh}` } }
          );
          localStorage.setItem("token", data.access_token);
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.clear();
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(err);
  }
);

// ── AUTHENTIFICATION ──────────────────────────────────────────────────────────
export const authAPI = {
  login:    (data) => api.post("/auth/login", data),
  register: (data) => api.post("/auth/register", data),
  me:       ()     => api.get("/auth/me"),
};

// ── PRODUITS ─────────────────────────────────────────────────────────────────
export const productsAPI = {
  list:       (params) => api.get("/products/", { params }),
  get:        (id)     => api.get(`/products/${id}/`),
  latest:     ()       => api.get("/products/latest/"), 
  categories: ()       => api.get("/products/categories/all/"),
  
  // CORRIGÉ : Ajout de l'argument "config" pour permettre le "Content-Type: undefined"
  create: (formData, config = {}) => api.post("/products/", formData, config),
  
  // CORRIGÉ : Ajout de l'argument "config" pour permettre le "Content-Type: undefined"
  update: (id, d, config = {})  => api.put(`/products/${id}/`, d, config),
  
  delete:     (id)     => api.delete(`/products/${id}/`),
};

// ── RECOMMANDATIONS (IA : Q-LEARNING & TF-IDF) ──────────────────────────────
export const recoAPI = {
  popular:  ()    => api.get("/recommendations/popular/"),
  trending: ()    => api.get("/recommendations/trending/"),
  similar:  (pid) => api.get(`/recommendations/similar/${pid}/`),
};

// ── PANIER ────────────────────────────────────────────────────────────────────
export const cartAPI = {
  get:         ()           => api.get("/cart/"),
  add:         (pid, qty=1) => api.post("/cart/add", { product_id: pid, quantity: qty }),
  updateItem: (iid, qty)    => api.put(`/cart/item/${iid}`, { quantity: qty }),
  removeItem: (iid)         => api.delete(`/cart/item/${iid}`),
  clear:       ()           => api.delete("/cart/clear"),
};

// ── COMMANDES ─────────────────────────────────────────────────────────────────
export const ordersAPI = {
  checkout: (data) => api.post("/orders/checkout", data),
  list:     ()     => api.get("/orders/"),
  get:      (id)   => api.get(`/orders/${id}/`),
};

// ── MESSAGES CLIENTS ──────────────────────────────────────────────────────────
export const messagesAPI = {
  send: (data) => api.post("/messages/send", data),
  list: ()     => api.get("/messages/"),
};

// ── ADMINISTRATION (MAINTENANCE IA & SÉCURITÉ) ────────────────────────────────
export const adminAPI = {
  dashboard:      ()         => api.get("/admin/dashboard/"),
  orders:         (params)   => api.get("/admin/orders/", { params }),
  updateOrder:    (id, data) => api.put(`/admin/orders/${id}/status/`, data),
  
  messages:       (params)   => api.get("/admin/messages/", { params }),
  markRead:       (id)       => api.patch(`/admin/messages/${id}/read/`),
  
  feedbackSpam:   (id, isSpam) => api.put(`/admin/messages/${id}/feedback/`, { is_spam: isSpam }),
  clearSpam:      ()         => api.delete("/admin/messages/clear-spam/"),
  
  runRL:          (data)     => api.post("/admin/rl/episode/", data),
  rlMetrics:      ()         => api.get("/admin/rl/metrics/"),
  recomputeTFIDF: ()         => api.post("/admin/tfidf/recompute/"),
  users:          ()         => api.get("/admin/users/"),
  spamWords:      ()         => api.get("/admin/spam/words/"),
};

export default api;