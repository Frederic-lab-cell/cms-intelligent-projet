"""
Agent Q-Learning — Optimisation du score produit
Récompenses basées sur : vues, ventes, priorité, score TF-IDF
"""
import random
import math

ACTIONS = ["optimiser", "promouvoir", "réviser", "archiver"]
PRIO_REWARD = {"high": 15, "med": 8, "low": 3}


class RLAgent:
    def __init__(self, lr=0.15, gamma=0.9, epsilon=0.2, epsilon_decay=0.96, min_epsilon=0.05):
        self.lr           = lr
        self.gamma        = gamma
        self.epsilon      = epsilon
        self.epsilon_decay = epsilon_decay
        self.min_epsilon  = min_epsilon
        self.episodes     = 0
        self.q_table : dict = {}   # {(product_id, action): Q-value}

    # ── Q-table helpers ───────────────────────────────────────────────────────

    def _key(self, pid, action):
        return (pid, action)

    def get_q(self, pid, action) -> float:
        return self.q_table.get(self._key(pid, action), 50.0)

    def set_q(self, pid, action, value):
        self.q_table[self._key(pid, action)] = max(0.0, min(100.0, value))

    def best_action(self, pid) -> str:
        q_values = [(a, self.get_q(pid, a)) for a in ACTIONS]
        max_q = max(q for _, q in q_values)
        best_actions = [a for a, q in q_values if q == max_q]
        return random.choice(best_actions)

    def best_q(self, pid) -> float:
        return max(self.get_q(pid, a) for a in ACTIONS)

    def choose_action(self, pid) -> tuple[str, bool]:
        """Choisit une action avec stratégie ε-greedy complète."""
        explore = random.random() < self.epsilon
        action = random.choice(ACTIONS) if explore else self.best_action(pid)
        return action, explore

    def decay_epsilon(self):
        self.epsilon = max(self.min_epsilon, self.epsilon * self.epsilon_decay)
        self.episodes += 1
        return self.epsilon

    # ── Episode ───────────────────────────────────────────────────────────────

    def run_episode(self, products: list) -> dict:
        """
        Lance un épisode RL sur une liste de dicts produits.
        Retourne les deltas de rl_score pour chaque produit.
        """
        results = {}
        for p in products:
            pid    = p["id"]
            prio   = p.get("priority", "med")
            views  = p.get("views", 0)
            sales  = p.get("sales", 0)
            tfidf  = p.get("top_tfidf", 0.0)

            action, explore = self.choose_action(pid)

            # Calcul de la récompense
            reward  = PRIO_REWARD.get(prio, 8)
            reward += (random.random() - 0.4) * 8
            reward += min(views / 20, 5)     # bonus vues
            reward += min(sales / 5, 8)      # bonus ventes
            reward += min(tfidf * 10, 4)     # bonus TF-IDF

            score_delta = 0
            if action == "optimiser":
                reward      += 8
                score_delta  = round(2 + random.random() * 4)
            elif action == "promouvoir":
                reward      += 4
                score_delta  = round(1 + random.random() * 3)
            elif action == "réviser":
                reward      += 2
                score_delta  = round(-1 + random.random() * 3)
            else:  # archiver
                reward      -= 2
                score_delta  = -round(random.random() * 2)

            # Mise à jour Q-table (Bellman)
            old_q = self.get_q(pid, action)
            new_q = old_q + self.lr * (reward + self.gamma * self.best_q(pid) - old_q)
            self.set_q(pid, action, new_q)

            results[pid] = {
                "action":      action,
                "explore":     explore,
                "reward":      round(reward, 2),
                "score_delta": score_delta,
                "new_q":       round(new_q, 2),
                "epsilon":     round(self.epsilon, 4),
            }

        self.decay_epsilon()
        return results

    # ── Feedback achat ────────────────────────────────────────────────────────

    def on_purchase(self, pid: int):
        """Renforce l'action optimiser + promouvoir après un achat."""
        self.set_q(pid, "optimiser", self.get_q(pid, "optimiser") + 12)
        self.set_q(pid, "promouvoir", self.get_q(pid, "promouvoir") + 8)

    def on_cancel(self, pid: int):
        """Pénalise légèrement après une annulation."""
        self.set_q(pid, "archiver", self.get_q(pid, "archiver") + 5)

    # ── Export Q-table ────────────────────────────────────────────────────────

    def get_product_stats(self, pid: int) -> dict:
        return {
            "best_action": self.best_action(pid),
            "q_values": {a: round(self.get_q(pid, a), 2) for a in ACTIONS},
            "epsilon": round(self.epsilon, 4),
            "episodes": self.episodes,
        }

    def reset(self):
        self.q_table.clear()
