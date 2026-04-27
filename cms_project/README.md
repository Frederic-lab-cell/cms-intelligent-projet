# CMS Intelligent — IA pour la Gestion de Contenu
### Séance 4 : TF-IDF · Similarité Cosinus · Naïve Bayes · Q-Learning

---

## Architecture du projet

```
cms_project/
├── backend/                    # Flask + MySQL
│   ├── app.py                  # Point d'entrée, initialisation IA
│   ├── config.py               # Configuration (DB, JWT, ML)
│   ├── seed.py                 # Données initiales
│   ├── models/
│   │   └── database.py         # SQLAlchemy : User, Product, Cart, Order, Message, Tag
│   ├── routes/
│   │   ├── auth.py             # POST /api/auth/login|register, GET /api/auth/me
│   │   ├── products.py         # CRUD produits + recherche TF-IDF
│   │   ├── cart.py             # Panier intelligent (stock-aware)
│   │   ├── orders.py           # Checkout + décrémentation stock
│   │   ├── messages.py         # Messagerie + Naïve Bayes
│   │   ├── admin.py            # Dashboard, RL épisodes, stats
│   │   └── recommendations.py  # Popular, similar, trending
│   └── ml/
│       ├── tfidf_engine.py     # TF-IDF + similarité cosinus (Séance 4, M1+M2)
│       ├── spam_detector.py    # Naïve Bayes + réponse auto (Séance 4, M3)
│       └── rl_agent.py         # Q-Learning pour scoring produit
│
└── frontend/                   # React + Vite + Tailwind CSS
    └── src/
        ├── App.jsx             # Router + providers
        ├── context/
        │   ├── AuthContext.jsx # JWT auto-refresh
        │   └── CartContext.jsx # Panier temps réel
        ├── services/
        │   └── api.js          # Axios + interceptors JWT
        ├── components/
        │   ├── Navbar.jsx
        │   └── ProductCard.jsx # Tags TF-IDF + stock badge
        └── pages/
            ├── HomePage.jsx        # Suggestions RL + tendances
            ├── CatalogPage.jsx     # Recherche sémantique TF-IDF
            ├── ProductPage.jsx     # Tunnel achat 3 étapes + similarité
            ├── CartPage.jsx        # Panier intelligent
            ├── CheckoutPage.jsx    # Commande + validation stock
            ├── OrdersPage.jsx      # Historique client
            ├── ContactPage.jsx     # Messagerie Naïve Bayes
            ├── LoginPage.jsx
            ├── RegisterPage.jsx
            └── admin/
                ├── AdminDashboard.jsx  # KPIs + mots spam NB + RL
                ├── AdminProducts.jsx   # CRUD + tags TF-IDF auto
                ├── AdminOrders.jsx     # Statuts commandes
                └── AdminMessages.jsx  # Messages + spam + réponses auto
```

---

## Installation

### Prérequis
- Python 3.10+
- Node.js 18+
- MySQL 8.0+

### 1. Base de données MySQL

```sql
CREATE DATABASE cms_intelligent CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend Flask

```bash
cd backend

# Environnement virtuel
python -m venv venv
source venv/bin/activate          # Windows : venv\Scripts\activate

# Dépendances
pip install flask flask-cors flask-jwt-extended flask-sqlalchemy \
            pymysql scikit-learn

# Variables d'environnement
cp .env.example .env
# Modifier DATABASE_URL dans .env

# Initialiser la base + seed
python seed.py

# Lancer le serveur
python app.py
# → http://localhost:5000
```

### 3. Frontend React

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Comptes par défaut (après seed.py)

| Rôle  | Email             | Mot de passe |
|-------|-------------------|--------------|
| Admin | admin@cms.com     | Admin1234!   |
| Client| client@cms.com    | Client1234!  |

---

## Fonctionnalités IA intégrées (Séance 4)

### Module 1 — TF-IDF (Auto-génération de tags)
- **Où** : `ml/tfidf_engine.py` → `TFIDFEngine`
- **Quand** : À chaque création/modification de produit + au démarrage
- **Comment** : TfidfVectorizer (scikit-learn) avec stopwords français, ngrams (1,2), sublinear_tf
- **Résultat** : 5 tags discriminants par produit, stockés en base MySQL, affichés sur les cartes

### Module 2 — Similarité Cosinus (Articles similaires)
- **Où** : `ml/tfidf_engine.py` → `similar_products()` + `search()`
- **Quand** : Page produit (sidebar "Produits similaires") + barre de recherche catalogue
- **Comment** : `cosine_similarity(query_vector, corpus_matrix)` → top K résultats
- **Résultat** : Recommandations en temps réel avec score de similarité affiché

### Module 3 — Naïve Bayes (Détection spam + réponse auto)
- **Où** : `ml/spam_detector.py` → `SpamDetector`
- **Quand** : À chaque message envoyé via le formulaire contact
- **Comment** : `MultinomialNB` + `CountVectorizer`, pipeline scikit-learn
- **Résultat** :
  - Spam détecté → message bloqué, probabilité enregistrée
  - Normal → réponse automatique selon l'intention (commande / retour / livraison / compte)

### Bonus — Q-Learning (Scoring produit)
- **Où** : `ml/rl_agent.py` → `RLAgent`
- **Quand** : Bouton "Épisode RL" dans le dashboard admin, feedback après chaque achat
- **Comment** : Q-table (product_id, action) → Bellman update avec reward = vues + ventes + TF-IDF bonus
- **Résultat** : `rl_score` par produit influence le classement des suggestions

---

## Cas d'utilisation

### Visiteur / Client
1. **Parcourir** le catalogue (filtre catégorie, recherche sémantique TF-IDF)
2. **Consulter** un produit (tags auto, produits similaires, stock en temps réel)
3. **Ajouter** au panier (vérification stock, quantité max)
4. **Acheter** via tunnel de vérification en 3 étapes
5. **Suivre** ses commandes (statuts : En attente → Livré)
6. **Contacter** le support (réponse automatique intelligente)

### Administrateur
1. **Dashboard** : KPIs temps réel (revenus, stock faible, messages non lus)
2. **Produits** : CRUD complet, tags TF-IDF auto, activation/désactivation stock
3. **Commandes** : Liste, filtres par statut, mise à jour statut
4. **Messagerie** : Messages clients, spam isolé, réponses auto Naïve Bayes
5. **IA** : Lancer épisode RL, recalculer TF-IDF, voir mots-clés spam

---

## API REST — Résumé des endpoints

```
POST   /api/auth/register          Inscription
POST   /api/auth/login             Connexion → JWT
GET    /api/auth/me                Profil connecté

GET    /api/products/              Liste (filtre, pagination, recherche TF-IDF)
GET    /api/products/:id           Détail + similarité cosinus + stats RL
POST   /api/products/              [Admin] Créer produit
PUT    /api/products/:id           [Admin] Modifier produit
DELETE /api/products/:id           [Admin] Supprimer produit

GET    /api/cart/                  Panier utilisateur
POST   /api/cart/add               Ajouter au panier (check stock)
PUT    /api/cart/item/:id          Modifier quantité
DELETE /api/cart/item/:id          Retirer article
DELETE /api/cart/clear             Vider le panier

POST   /api/orders/checkout        Passer commande (décrémente stock)
GET    /api/orders/                Mes commandes

POST   /api/messages/send          Envoyer message (Naïve Bayes)
GET    /api/messages/              Mes messages

GET    /api/recommendations/popular    Suggestions RL
GET    /api/recommendations/similar/:id Similarité cosinus
GET    /api/recommendations/trending   Top ventes

GET    /api/admin/dashboard         KPIs
GET    /api/admin/orders            Toutes les commandes
PUT    /api/admin/orders/:id/status Changer statut
GET    /api/admin/messages          Tous les messages
POST   /api/admin/rl/episode        Lancer épisode Q-Learning
POST   /api/admin/tfidf/recompute   Recalculer TF-IDF
GET    /api/admin/spam/words        Top mots spam (Naïve Bayes)
```

---

## Analyse critique et améliorations suggérées

### Points forts du projet
- Les 3 modules de la Séance 4 sont directement opérationnels en production
- TF-IDF recalculé automatiquement à chaque changement de produit
- Naïve Bayes avec détection d'intention (pas seulement spam/non-spam)
- Stock désactivé automatiquement à zéro (badge visuel + bouton désactivé)
- JWT avec refresh token transparent pour l'utilisateur
- Panier persistant en base MySQL (survit aux déconnexions)

### Améliorations recommandées pour la suite

| Priorité | Amélioration | Justification |
|----------|--------------|---------------|
| Haute | Paiement Stripe / PayPal | Actuellement simulé |
| Haute | Upload image produit (S3/local) | Actuellement URL externe |
| Haute | Email de confirmation commande (Flask-Mail) | Expérience client |
| Moyenne | BERT/sentence-transformers pour la recherche | Meilleure sémantique |
| Moyenne | Redis pour le cache TF-IDF | Performance à l'échelle |
| Moyenne | WebSocket pour stock temps réel | Éviter la désynchronisation |
| Basse | Tests unitaires (pytest) | Couverture ML critique |
| Basse | Docker Compose | Déploiement simplifié |

---

## Variables d'environnement (.env)

```env
SECRET_KEY=votre-secret-key-production
JWT_SECRET_KEY=votre-jwt-secret-production
DATABASE_URL=mysql+pymysql://user:password@localhost/cms_intelligent
DEBUG=False
```
