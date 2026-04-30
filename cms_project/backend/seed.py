"""
seed.py — Initialisation minimale pour MySQL
Lance : python seed.py
"""
import os

# ✅ Configuration de l'URL avant l'importation de l'application
os.environ["DATABASE_URL"] = "mysql+pymysql://cms_intelligent_silencelie:f8cfeb80710fc0a104ab253c8e2a675609417c8a@0das1z.h.filess.io:61002/cms_intelligent_silencelie"

from app import create_app
from models.database import db, User, Category

def seed():
    app = create_app()
    
    # ✅ Optimisation pour éviter l'erreur 'max_user_connections' (limite de 5)
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_size': 1,
        'max_overflow': 0
    }

    with app.app_context():
        print("🚀 Vérification de la base de données...")
        
        # ✅ Crée les tables uniquement si elles n'existent pas
        db.create_all()

        # ✅ Vérifier si l'admin existe déjà
        admin_email = "admin@cms.com"
        existing_admin = User.query.filter_by(email=admin_email).first()

        if not existing_admin:
            # Création du compte Admin avec le mot de passe sécurisé
            admin = User(
                email=admin_email, 
                name="Administrateur", 
                role="admin"
            )
            admin.set_password("Admin1234!")
            db.session.add(admin)
            print(f"✅ Compte Admin créé : {admin_email}")
        else:
            print(f"⏭️  L'administrateur '{admin_email}' existe déjà.")

        # ✅ Initialisation des catégories de base
        categories_base = [
            {"name": "Voiture",     "slug": "voiture",     "icon": "🚗"},
            {"name": "PC",          "slug": "pc",          "icon": "💻"},
            {"name": "Téléphone",   "slug": "telephone",   "icon": "📱"},
            {"name": "Moto",        "slug": "moto",        "icon": "🏍️"},
            {"name": "Accessoires", "slug": "accessoires", "icon": "🎒"},
        ]

        for cat_data in categories_base:
            existing_cat = Category.query.filter_by(slug=cat_data["slug"]).first()
            if not existing_cat:
                new_cat = Category(
                    name=cat_data["name"],
                    slug=cat_data["slug"],
                    icon=cat_data["icon"]
                )
                db.session.add(new_cat)
                print(f"✅ Catégorie '{cat_data['name']}' ajoutée.")
            else:
                print(f"⏭️  Catégorie '{cat_data['name']}' déjà présente.")

        # ✅ Sauvegarde des changements
        try:
            db.session.commit()
            print("💾 Changements enregistrés avec succès.")
        except Exception as e:
            db.session.rollback()
            print(f"❌ Erreur lors du commit : {e}")
            return

        # ✅ Entraînement du Spam Detector (IA)
        from flask import current_app
        try:
            if hasattr(current_app, 'spam_detector'):
                current_app.spam_detector.train()
                print("🧠 Spam Detector entraîné.")
        except Exception as e:
            print(f"⚠️ Spam Detector (non critique) : {e}")

        print("\n" + "="*50)
        print("🏆 INITIALISATION TERMINÉE")
        print("="*50)
        print(f"Accès Admin : {admin_email} / Admin1234!")
        print("="*50 + "\n")

if __name__ == "__main__":
    seed()