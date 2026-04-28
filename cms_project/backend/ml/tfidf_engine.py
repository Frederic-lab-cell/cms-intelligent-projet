"""ml/tfidf_engine.py — TF-IDF sans sklearn ni nltk"""
import math
from collections import Counter

FRENCH_STOP_WORDS = {
    "le","la","les","de","du","des","un","une","et","en","au","aux",
    "est","sont","avec","pour","par","sur","dans","qui","que","qu",
    "se","sa","son","ses","ce","cet","cette","ces","je","tu","il",
    "elle","nous","vous","ils","elles","mon","ton","leur","leurs",
    "pas","plus","aussi","comme","mais","ou","donc","car","ni","si"
}

def tokenize(text):
    text = text.lower()
    tokens = []
    word = ""
    for c in text:
        if c.isalnum():
            word += c
        else:
            if word and word not in FRENCH_STOP_WORDS and len(word) > 2:
                tokens.append(word)
            word = ""
    if word and word not in FRENCH_STOP_WORDS and len(word) > 2:
        tokens.append(word)
    return tokens

class TFIDFEngine:
    def __init__(self):
        self.products = []
        self.tfidf_matrix = []
        self.feature_names = []
        self.vectorizer = self  # compatibilité avec app.py

    def fit_from_db(self):
        try:
            from models.database import Product
            products = Product.query.filter_by(is_active=True).all()
            self._fit([p for p in products])
        except Exception as e:
            print(f"Erreur fit_from_db: {e}")

    def _fit(self, products):
        self.products = products
        corpus = []
        for p in products:
            text = f"{p.name} {p.description or ''}"
            corpus.append(tokenize(text))

        # Vocabulaire
        vocab = {}
        for tokens in corpus:
            for t in set(tokens):
                vocab[t] = vocab.get(t, 0) + 1

        self.feature_names = [w for w, c in vocab.items() if c >= 1]
        vocab_index = {w: i for i, w in enumerate(self.feature_names)}
        N = len(corpus)

        # TF-IDF
        self.tfidf_matrix = []
        for tokens in corpus:
            tf = Counter(tokens)
            total = max(len(tokens), 1)
            vec = [0.0] * len(self.feature_names)
            for word, idx in vocab_index.items():
                if tf[word] > 0:
                    tf_val = tf[word] / total
                    idf_val = math.log(N / (vocab.get(word, 0) + 1)) + 1
                    vec[idx] = tf_val * idf_val
            self.tfidf_matrix.append(vec)

    def similar_products(self, product_id, top_n=6):
        try:
            ids = [p.id for p in self.products]
            if product_id not in ids:
                return []
            idx = ids.index(product_id)
            vec = self.tfidf_matrix[idx]

            scores = []
            for i, other_vec in enumerate(self.tfidf_matrix):
                if i == idx:
                    continue
                dot = sum(a*b for a, b in zip(vec, other_vec))
                norm1 = math.sqrt(sum(a**2 for a in vec))
                norm2 = math.sqrt(sum(b**2 for b in other_vec))
                sim = dot / (norm1 * norm2) if norm1 * norm2 > 0 else 0
                scores.append((sim, i))

            scores.sort(reverse=True)
            return [self.products[i].to_dict() for _, i in scores[:top_n]]
        except Exception as e:
            print(f"Erreur similar_products: {e}")
            return []

    def extract_tags(self, text, top_n=5):
        try:
            tokens = tokenize(text)
            freq = Counter(tokens)
            return [w for w, _ in freq.most_common(top_n)]
        except Exception as e:
            print(f"Erreur extraction tags: {e}")
            return []

    def transform(self, texts):
        """Compatibilité sklearn"""
        return self

    def toarray(self):
        return [self.tfidf_matrix[-1]] if self.tfidf_matrix else [[]]