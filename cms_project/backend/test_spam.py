import requests
import sys

# Configuration de l'URL de base de ton API Flask
BASE_URL = "http://localhost:5000/api"

def test_message(content, sender="TestUser"):
    payload = {
        "sender_name": sender,
        "content": content,
        "email": f"{sender.lower()}@example.com"
    }
    
    print(f"Envoi de : '{content[:40]}...' ", end="", flush=True)
    
    try:
        # Envoi de la requête POST
        response = requests.post(f"{BASE_URL}/messages/send", json=payload, timeout=5)
        
        # Vérification si le serveur a répondu avec une erreur (ex: 500)
        if response.status_code != 200 and response.status_code != 201:
            print(f"❌ Erreur Serveur ({response.status_code})")
            return

        data = response.json()
        
        # Détermination du statut basé sur le retour de ton IA (is_spam)
        is_spam = data.get('is_spam', False)
        status = "🚩 SPAM DÉTECTÉ" if is_spam else "✅ MESSAGE SAIN"
        
        print(f"-> {status}")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERREUR : Le serveur Flask n'est pas lancé sur http://localhost:5000")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERREUR INATTENDUE : {e}")

# --- SCÉNARIOS DE TEST ---
if __name__ == "__main__":
    print("="*50)
    print("🧪 TEST DU SYSTÈME ANTI-SPAM (NAÏVE BAYES)")
    print("="*50 + "\n")

    # 1. Test Message Normal (Ham)
    test_message("Bonjour, je souhaiterais avoir plus d'informations sur la garantie.", "ClientRéel")

    # 2. Test Spam Évident
    test_message("PROMO EXCEPTIONNELLE ! Gagnez un iPhone gratuit immédiatement !!!", "Spammer01")

    # 3. Test Spam Discret (Sémantique douteuse)
    test_message("Gagnez de l'argent rapidement depuis chez vous, offre limitée.", "Spammer02")

    print("\n" + "="*50)
    print("💡 Vérifiez votre Dashboard Admin pour voir les statistiques.")
    print("="*50)