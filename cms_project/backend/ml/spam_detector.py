"""
Détecteur de spam — Séance 4, Module 3
Naïve Bayes (MultinomialNB) + CountVectorizer
+ Système de réponse automatique intelligente
"""
import re
import unicodedata
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

# ── Données d'entraînement initiales ──────────────────────────────────────────
SPAM_EXAMPLES = [
    "Gagnez de l'argent facilement cliquez maintenant",
    "Offre limitée cadeau gratuit iPhone gagnant",
    "Félicitations vous avez gagné 500 euros",
    "Cliquez ici pour votre récompense gratuite",
    "Promotion exclusive achetez maintenant réduction 90%",
    "Urgent votre compte sera suspendu confirmez",
    "Argent facile travail domicile revenus passifs",
    "Prix incroyable stock limité ne ratez pas",
    "Investissement garanti doublez votre argent",
    "Cadeau spécial pour vous cliquez immédiatement",
]

NORMAL_EXAMPLES = [
    "Bonjour je souhaite des informations sur ce produit",
    "Quand sera disponible ma commande numéro 12345",
    "Le produit que j'ai reçu est défectueux pouvez-vous m'aider",
    "Quelle est la politique de retour pour les achats",
    "Bonsoir je n'arrive pas à me connecter à mon compte",
    "Pouvez-vous me donner plus de détails sur les caractéristiques",
    "Je voudrais modifier l'adresse de livraison de ma commande",
    "Est-il possible d'avoir une facture pour mon achat",
    "Le délai de livraison estimé pour ma région",
    "Merci votre service est excellent je recommande",
]

LABELS = [1]*len(SPAM_EXAMPLES) + [0]*len(NORMAL_EXAMPLES)

# ── Réponses automatiques par intention ───────────────────────────────────────
AUTO_REPLIES = {
    "commande": (
        "Bonjour ! Merci pour votre message concernant votre commande. "
        "Notre équipe va vérifier le statut et vous répondra sous 24h. "
        "Vous pouvez également suivre votre commande dans votre espace client."
    ),
    "retour": (
        "Bonjour ! Notre politique de retour vous permet de retourner tout article "
        "dans les 14 jours suivant la réception. Rendez-vous dans "
        "Mon Compte → Mes Commandes pour initier un retour."
    ),
    "livraison": (
        "Bonjour ! Les délais de livraison standard sont de 3 à 5 jours ouvrés. "
        "Une fois votre commande expédiée, vous recevrez un email de suivi."
    ),
    "compte": (
        "Bonjour ! Pour toute question relative à votre compte, utilisez le lien "
        "'Mot de passe oublié' sur la page de connexion, ou contactez notre support."
    ),
    "produit": (
        "Bonjour ! Merci de l'intérêt pour nos produits. "
        "Consultez la fiche produit pour les caractéristiques détaillées. "
        "Notre équipe reste disponible pour toute question spécifique."
    ),
    "default": (
        "Bonjour ! Merci pour votre message. Notre équipe support a bien reçu "
        "votre demande et vous contactera dans les plus brefs délais (< 24h). "
        "Numéro de ticket : #{ticket_id}"
    ),
}

INTENT_KEYWORDS = {
    "commande":  ["commande","livré","expédié","numéro","reçu","suivi"],
    "retour":    ["retour","rembours","défectueux","cassé","échangé","annul"],
    "livraison": ["livraison","délai","adresse","transport","colis"],
    "compte":    ["compte","connecter","mot de passe","login","accès"],
    "produit":   ["produit","caractéristiques","stock","disponible","détails"],
}


class SpamDetector:
    """
    Pipeline Naïve Bayes pour classification spam/normal.
    Retourne aussi la probabilité de confiance et une réponse automatique.
    """

    def __init__(self):
        self.pipeline = Pipeline([
            ("vectorizer", CountVectorizer(
                stop_words=None,
                strip_accents="unicode",
                token_pattern=r"(?u)\b\w\w+\b",
                ngram_range=(1, 2),
                min_df=1,
                max_df=0.9,
            )),
            ("classifier", MultinomialNB(alpha=0.5)),
        ])
        self._trained = False
        self.extra_texts = []
        self.extra_labels = []
        self._classes = [0, 1]

    def train(self, extra_texts: list = None, extra_labels: list = None):
        """Entraîne le modèle. Peut être appelé avec des données supplémentaires."""
        texts  = SPAM_EXAMPLES + NORMAL_EXAMPLES
        labels = LABELS[:]

        if extra_texts and extra_labels:
            texts  += extra_texts
            labels += extra_labels

        if self.extra_texts and self.extra_labels:
            texts  += self.extra_texts
            labels += self.extra_labels

        texts = [self._clean(text) for text in texts]
        self.pipeline.fit(texts, labels)
        self._trained = True
        print(f"[SpamDetector] Entraîné sur {len(texts)} exemples")

    def analyze(self, text: str, ticket_id: int = 0) -> dict:
        """
        Analyse un message et retourne :
        - is_spam      : booléen
        - spam_proba   : probabilité d'être du spam [0-1]
        - auto_reply   : réponse automatique si non-spam
        - intent       : intention détectée
        """
        if not self._trained:
            self.train()

        text_clean = self._clean(text)
        proba      = self.pipeline.predict_proba([text_clean])[0]
        spam_proba = float(proba[1])
        is_spam    = spam_proba >= 0.55   # seuil légèrement assoupli

        intent     = self._detect_intent(text_clean)
        auto_reply = ""

        if not is_spam:
            template   = AUTO_REPLIES.get(intent, AUTO_REPLIES["default"])
            auto_reply = template.replace("{ticket_id}", str(ticket_id or "—"))

        return {
            "is_spam":    is_spam,
            "spam_proba": round(spam_proba, 4),
            "intent":     intent,
            "auto_reply": auto_reply,
        }

    # ── Méthodes privées ──────────────────────────────────────────────────────

    def _clean(self, text: str) -> str:
        text = text.lower()
        text = unicodedata.normalize("NFKD", text)
        text = re.sub(r"[^\w\s]", " ", text)
        return re.sub(r"\s+", " ", text).strip()

    def update_model(self, text: str, label: int):
        """Réentraîne le modèle avec un exemple corrigé par l'administrateur."""
        text_clean = self._clean(text)
        self.extra_texts.append(text_clean)
        self.extra_labels.append(int(label))
        self.train()
        print(f"[SpamDetector] Mise à jour avec un exemple label={label}")

    def _detect_intent(self, text: str) -> str:
        text_lower = text.lower()
        for intent, keywords in INTENT_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                return intent
        return "default"

    def get_top_spam_words(self, n: int = 10) -> list[dict]:
        """Retourne les N mots les plus indicateurs de spam."""
        if not self._trained:
            return []
        vocab    = self.pipeline.named_steps["vectorizer"].vocabulary_
        log_prob = self.pipeline.named_steps["classifier"].feature_log_prob_
        # Différence log P(mot|spam) - log P(mot|normal)
        diff  = log_prob[1] - log_prob[0]
        pairs = [(word, float(diff[idx])) for word, idx in vocab.items()]
        pairs.sort(key=lambda x: x[1], reverse=True)
        return [{"word": w, "score": round(s, 3)} for w, s in pairs[:n]]
