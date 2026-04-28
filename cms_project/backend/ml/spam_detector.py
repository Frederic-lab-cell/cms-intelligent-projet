"""
Détecteur de spam — Naïve Bayes pur Python (sans sklearn)
"""
import re
import math
import unicodedata
from collections import defaultdict

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

AUTO_REPLIES = {
    "commande": "Bonjour ! Merci pour votre message concernant votre commande. Notre équipe va vérifier le statut et vous répondra sous 24h.",
    "retour": "Bonjour ! Notre politique de retour vous permet de retourner tout article dans les 14 jours suivant la réception.",
    "livraison": "Bonjour ! Les délais de livraison standard sont de 3 à 5 jours ouvrés.",
    "compte": "Bonjour ! Pour toute question relative à votre compte, utilisez le lien 'Mot de passe oublié' sur la page de connexion.",
    "produit": "Bonjour ! Merci de l'intérêt pour nos produits. Notre équipe reste disponible pour toute question spécifique.",
    "default": "Bonjour ! Merci pour votre message. Notre équipe support vous contactera dans les plus brefs délais (< 24h). Numéro de ticket : #{ticket_id}",
}

INTENT_KEYWORDS = {
    "commande":  ["commande","livré","expédié","numéro","reçu","suivi"],
    "retour":    ["retour","rembours","défectueux","cassé","échangé","annul"],
    "livraison": ["livraison","délai","adresse","transport","colis"],
    "compte":    ["compte","connecter","mot de passe","login","accès"],
    "produit":   ["produit","caractéristiques","stock","disponible","détails"],
}


class SpamDetector:
    def __init__(self):
        self.word_counts = {0: defaultdict(int), 1: defaultdict(int)}
        self.class_counts = {0: 0, 1: 0}
        self.vocab = set()
        self._trained = False
        self.extra_texts = []
        self.extra_labels = []

    def _clean(self, text: str) -> str:
        text = text.lower()
        text = unicodedata.normalize("NFKD", text)
        text = re.sub(r"[^\w\s]", " ", text)
        return re.sub(r"\s+", " ", text).strip()

    def _tokenize(self, text: str) -> list:
        return [w for w in text.split() if len(w) >= 2]

    def train(self, extra_texts=None, extra_labels=None):
        texts = SPAM_EXAMPLES + NORMAL_EXAMPLES
        labels = LABELS[:]
        if extra_texts and extra_labels:
            texts += extra_texts
            labels += extra_labels
        if self.extra_texts and self.extra_labels:
            texts += self.extra_texts
            labels += self.extra_labels

        self.word_counts = {0: defaultdict(int), 1: defaultdict(int)}
        self.class_counts = {0: 0, 1: 0}
        self.vocab = set()

        for text, label in zip(texts, labels):
            tokens = self._tokenize(self._clean(text))
            self.class_counts[label] += 1
            for token in tokens:
                self.word_counts[label][token] += 1
                self.vocab.add(token)

        self._trained = True
        print(f"[SpamDetector] Entraîné sur {len(texts)} exemples")

    def _log_prob(self, tokens, label):
        total = sum(self.word_counts[label].values())
        vocab_size = len(self.vocab)
        log_p = 0.0
        for token in tokens:
            count = self.word_counts[label].get(token, 0)
            log_p += math.log((count + 0.5) / (total + 0.5 * vocab_size))
        return log_p

    def analyze(self, text: str, ticket_id: int = 0) -> dict:
        if not self._trained:
            self.train()

        text_clean = self._clean(text)
        tokens = self._tokenize(text_clean)

        total = sum(self.class_counts.values())
        log_prior_spam = math.log(self.class_counts[1] / total)
        log_prior_normal = math.log(self.class_counts[0] / total)

        log_spam = log_prior_spam + self._log_prob(tokens, 1)
        log_normal = log_prior_normal + self._log_prob(tokens, 0)

        # Softmax
        max_log = max(log_spam, log_normal)
        spam_exp = math.exp(log_spam - max_log)
        normal_exp = math.exp(log_normal - max_log)
        spam_proba = spam_exp / (spam_exp + normal_exp)

        is_spam = spam_proba >= 0.55
        intent = self._detect_intent(text_clean)
        auto_reply = ""

        if not is_spam:
            template = AUTO_REPLIES.get(intent, AUTO_REPLIES["default"])
            auto_reply = template.replace("{ticket_id}", str(ticket_id or "—"))

        return {
            "is_spam": is_spam,
            "spam_proba": round(spam_proba, 4),
            "intent": intent,
            "auto_reply": auto_reply,
        }

    def update_model(self, text: str, label: int):
        self.extra_texts.append(self._clean(text))
        self.extra_labels.append(int(label))
        self.train()

    def _detect_intent(self, text: str) -> str:
        text_lower = text.lower()
        for intent, keywords in INTENT_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                return intent
        return "default"

    def get_top_spam_words(self, n: int = 10) -> list:
        if not self._trained:
            return []
        scores = []
        for word in self.vocab:
            s = self.word_counts[1].get(word, 0) - self.word_counts[0].get(word, 0)
            scores.append({"word": word, "score": s})
        scores.sort(key=lambda x: x["score"], reverse=True)
        return scores[:n]