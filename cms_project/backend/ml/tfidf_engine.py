import nltk
from nltk.corpus import stopwords
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from models.database import db, Product, Tag
from config import Config

# --- CONFIGURATION NLTK ---
# On s'assure que les stopwords sont téléchargés une seule fois
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

class TFIDFEngine:
    def __init__(self):
        # Récupération de la liste des mots vides français
        self.french_stop_words = stopwords.words('french')
        
        # CORRECTION : On passe la LISTE french_stop_words au lieu de la chaîne 'french'
        self.vectorizer = TfidfVectorizer(
            stop_words=self.french_stop_words, 
            token_pattern=r'(?u)\b\w\w+\b',
            max_features=Config.TFIDF_MAX_FEATURES,
            strip_accents='unicode',
            ngram_range=(1, 2),
        )
        self.is_fitted = False
        self.tfidf_matrix = None
        self.feature_names = []
        self.product_ids = []

    def fit_from_db(self):
        """Réentraîne le modèle sur tous les produits existants."""
        products = Product.query.all()
        if not products:
            self.is_fitted = False
            return False

        texts = [f"{p.name} {p.description or ''}" for p in products]

        try:
            self.vectorizer.fit(texts)
            self.tfidf_matrix = self.vectorizer.transform(texts)
            self.feature_names = self.vectorizer.get_feature_names_out()
            self.product_ids = [p.id for p in products]
            self.is_fitted = True
        except Exception as e:
            print(f"Erreur TF-IDF fit_from_db : {e}")
            self.is_fitted = False
            return False

        # Mise à jour des Tags en base de données
        try:
            Tag.query.delete()
            for i, product in enumerate(products):
                row = self.tfidf_matrix.getrow(i).toarray()[0]
                top_indices = row.argsort()[-Config.TFIDF_MAX_TAGS:][::-1]

                for idx in top_indices:
                    if row[idx] > 0:
                        new_tag = Tag(
                            product_id=product.id,
                            term=self.feature_names[idx],
                            tfidf_score=float(row[idx])
                        )
                        db.session.add(new_tag)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            print(f"Erreur TF-IDF tag update : {e}")
            return False

    def fit_single(self, product_id: int):
        """Réentraîne l'index après ajout / modification de produit."""
        return self.fit_from_db()

    def search(self, text, top_k=24):
        """Recherche sémantique TF-IDF sur tout le catalogue."""
        if not self.is_fitted and not self.fit_from_db():
            return []

        try:
            query_vec = self.vectorizer.transform([text])
            similarities = cosine_similarity(self.tfidf_matrix, query_vec).flatten()
            top_indices = similarities.argsort()[::-1][:top_k]

            results = []
            for idx in top_indices:
                if similarities[idx] <= 0:
                    continue
                product = Product.query.get(self.product_ids[idx])
                if product:
                    data = product.to_dict()
                    data["score"] = float(similarities[idx])
                    results.append(data)
            return results
        except Exception as e:
            print(f"Erreur TF-IDF search : {e}")
            return []

    def similar_products(self, product_id: int, top_n: int = None):
        """Retourne les produits les plus proches par similarité cosinus."""
        if not self.is_fitted and not self.fit_from_db():
            return []

        if product_id not in self.product_ids:
            return []

        try:
            idx = self.product_ids.index(product_id)
            query_vec = self.tfidf_matrix.getrow(idx)
            similarities = cosine_similarity(self.tfidf_matrix, query_vec).flatten()
            similarities[idx] = -1 # S'exclure lui-même

            top_n = top_n or Config.SIMILARITY_TOP_N
            top_indices = similarities.argsort()[::-1][:top_n]

            results = []
            for i in top_indices:
                if similarities[i] <= 0:
                    continue
                product = Product.query.get(self.product_ids[i])
                if product:
                    data = product.to_dict()
                    data["score"] = float(similarities[i])
                    results.append(data)
            return results
        except Exception as e:
            print(f"Erreur TF-IDF similar_products : {e}")
            return []

    def extract_tags(self, text, top_n=None):
        """Extrait des tags pour un nouveau produit."""
        if top_n is None:
            top_n = Config.TFIDF_MAX_TAGS

        if not self.is_fitted and not self.fit_from_db():
            return []

        try:
            row = self.vectorizer.transform([text]).toarray()[0]
            top_indices = row.argsort()[-top_n:][::-1]
            tags = [self.feature_names[i] for i in top_indices if row[i] > 0]
            return tags
        except Exception as e:
            print(f"Erreur extraction tags: {e}")
            return []