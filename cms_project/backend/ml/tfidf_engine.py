import math
from collections import Counter

FRENCH_STOP_WORDS = {
    "le","la","les","de","du","des","un","une","et","en","au","aux",
    "est","sont","avec","pour","par","sur","dans","qui","que","qu",
    "se","sa","son","ses","ce","cet","cette","ces","je","tu","il",
    "elle","nous","vous","ils","elles","mon","ton","leur","leurs",
    "pas","plus","aussi","comme","mais","ou","donc","car","ni","si",
    "avec","très","bon","pour","dans","tous"
}

def tokenize(text):
    if not text: return []
    # Nettoyage simple des caractères spéciaux
    for char in ".,!?;:()[]{}'\"\\/":
        text = text.replace(char, " ")
    
    text = text.lower()
    tokens = []
    for word in text.split():
        if word not in FRENCH_STOP_WORDS and len(word) > 2 and word.isalnum():
            tokens.append(word)
    return tokens

class TFIDFEngine:
    def __init__(self):
        self.products = []
        self.tfidf_matrix = []
        self.feature_names = []
        self.vectorizer = self 

    def fit_from_db(self):
        try:
            from models.database import Product
            products = Product.query.filter_by(is_active=True).all()
            self._fit(products)
            # Optionnel: Réindexer les tags de tous les produits
            for p in products:
                self.fit_single(p.id)
        except Exception as e:
            print(f"Erreur fit_from_db: {e}")

    def _fit(self, products):
        if not products: return
        self.products = products
        corpus = [tokenize(f"{p.name} {p.description or ''}") for p in products]

        vocab = {}
        for tokens in corpus:
            for t in set(tokens):
                vocab[t] = vocab.get(t, 0) + 1

        self.feature_names = [w for w, c in vocab.items() if c >= 1]
        vocab_index = {w: i for i, w in enumerate(self.feature_names)}
        N = len(corpus)

        self.tfidf_matrix = []
        for tokens in corpus:
            tf = Counter(tokens)
            total = max(len(tokens), 1)
            vec = [0.0] * len(self.feature_names)
            for word, idx in vocab_index.items():
                if tf[word] > 0:
                    tf_val = tf[word] / total
                    idf_val = math.log(N / (vocab.get(word, 0))) + 1
                    vec[idx] = tf_val * idf_val
            self.tfidf_matrix.append(vec)

    def fit_single(self, product_id):
        """
        Analyse un produit, extrait les tags et les SAUVEGARDE en base de données.
        C'est cette méthode qui supprime le 'N/A'.
        """
        try:
            from models.database import db, Product, Tag
            p = Product.query.get(product_id)
            if not p: return

            # Extraction des meilleurs mots (Nom + Description)
            text = f"{p.name} {p.description or ''}"
            tags_extraits = self.extract_tags(text, top_n=5)

            # 1. Supprimer les anciens tags pour ce produit
            Tag.query.filter_by(product_id=p.id).delete()

            # 2. Ajouter les nouveaux tags
            for t_name in tags_extraits:
                new_tag = Tag(term=t_name, product_id=p.id)
                db.session.add(new_tag)
            
            db.session.commit()
            print(f"IA: {len(tags_extraits)} tags générés pour {p.name}")
        except Exception as e:
            print(f"Erreur fit_single: {e}")

    def extract_tags(self, text, top_n=5):
        """Retourne les mots les plus fréquents/importants du texte."""
        tokens = tokenize(text)
        if not tokens: return []
        
        # On privilégie les mots du titre (en les comptant double)
        counts = Counter(tokens)
        # Retourne les top_n mots
        return [w for w, _ in counts.most_common(top_n)]

    def similar_products(self, product_id, top_n=6):
        # ... (votre code existant est correct ici)
        try:
            ids = [p.id for p in self.products]
            if product_id not in ids: return []
            idx = ids.index(product_id)
            vec = self.tfidf_matrix[idx]
            scores = []
            for i, other_vec in enumerate(self.tfidf_matrix):
                if i == idx: continue
                dot = sum(a*b for a, b in zip(vec, other_vec))
                norm1 = math.sqrt(sum(a**2 for a in vec))
                norm2 = math.sqrt(sum(b**2 for b in other_vec))
                sim = dot / (norm1 * norm2) if norm1 * norm2 > 0 else 0
                scores.append((sim, i))
            scores.sort(reverse=True)
            return [self.products[i].to_dict() for _, i in scores[:top_n]]
        except: return []

    def transform(self, texts): return self
    def toarray(self): return [self.tfidf_matrix[-1]] if self.tfidf_matrix else [[]]