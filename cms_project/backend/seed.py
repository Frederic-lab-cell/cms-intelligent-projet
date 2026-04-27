"""
seed.py — Données initiales pour MySQL
Lance : python seed.py
"""
from app import create_app
from models.database import db, User, Category, Product

def seed():
    app = create_app()
    with app.app_context():
        db.drop_all()
        db.create_all()

        # Admin
        admin = User(email="admin@cms.com", name="Administrateur", role="admin")
        admin.set_password("Admin1234!")
        db.session.add(admin)

        # Client test
        client = User(email="client@cms.com", name="Jean Dupont", role="client")
        client.set_password("Client1234!")
        db.session.add(client)

        # Catégories
        cats = [
            Category(name="Voiture",  slug="car",   icon="🚗"),
            Category(name="PC",       slug="pc",    icon="💻"),
            Category(name="Téléphone",slug="phone", icon="📱"),
        ]
        for c in cats:
            db.session.add(c)
        db.session.flush()

        car_id, pc_id, ph_id = cats[0].id, cats[1].id, cats[2].id

        # Produits
        products_data = [
            # Voiture
            dict(name="Vidange moteur synthétique", category_id=car_id, price=45.0, stock=25,
                 description="Vidange complète huile synthétique 5W40 avec remplacement filtre. "
                              "Entretien périodique automobile lubrification moteur protection"),
            dict(name="Assurance tous risques", category_id=car_id, price=189.0, stock=100,
                 description="Contrat assurance tous risques couverture sinistre accident vol "
                              "incendie responsabilité civile garantie étendue protection complète"),
            dict(name="GPS TomTom GO 6200", category_id=car_id, price=199.0, stock=8,
                 description="Navigation GPS intégré cartographie Europe trafic temps réel mise "
                              "à jour carte connectée bluetooth guidage vocal satellite"),
            dict(name="Pneus Michelin CrossClimate", category_id=car_id, price=320.0, stock=0,
                 description="Pneumatique toutes saisons adhérence route mouillée sécurité "
                              "résistance aquaplaning longévité performance grip freinage"),
            dict(name="Dashcam 4K WiFi", category_id=car_id, price=89.0, stock=15,
                 description="Caméra embarquée enregistrement 4K GPS WiFi grand angle détection "
                              "collision stationnement surveillance nuit vision"),
            # PC
            dict(name="SSD Samsung 1TB NVMe", category_id=pc_id, price=89.0, stock=30,
                 description="Disque dur solide SSD NVMe 1TB lecture 3500Mo/s écriture 3300Mo/s "
                              "stockage rapide installation Windows gaming performance"),
            dict(name="Antivirus Kaspersky Premium", category_id=pc_id, price=49.0, stock=999,
                 description="Protection antivirus malware ransomware firewall sécurité "
                              "informatique détection temps réel scan menaces protection données"),
            dict(name="RAM Corsair 32GB DDR5", category_id=pc_id, price=149.0, stock=12,
                 description="Mémoire vive DDR5 32GB 5600MHz performances gaming multitâche "
                              "overclocking fréquence bande passante latence faible"),
            dict(name="Windows 11 Pro OEM", category_id=pc_id, price=145.0, stock=50,
                 description="Licence Windows 11 Pro OEM activation système exploitation "
                              "interface bureau productivité mise jour sécurité BitLocker"),
            dict(name="Écran LG 27 4K IPS", category_id=pc_id, price=399.0, stock=6,
                 description="Moniteur 27 pouces résolution 4K UHD IPS dalle couleur précision "
                              "calibration HDR400 USB-C design bureautique créatif"),
            # Phone
            dict(name="Coque iPhone 15 renforcée", category_id=ph_id, price=19.0, stock=45,
                 description="Protection coque iPhone 15 antichoc militaire MIL-STD-810 "
                              "résistante chutes silicone robuste durable étanche bords renforcés"),
            dict(name="Forfait 5G 100Go illimité", category_id=ph_id, price=29.0, stock=999,
                 description="Abonnement forfait 5G illimité appels SMS internet 100Go débit "
                              "très haut vitesse réseau national couverture streaming 4K"),
            dict(name="Samsung Galaxy S24 Ultra", category_id=ph_id, price=1299.0, stock=4,
                 description="Smartphone Samsung Galaxy S24 Ultra Snapdragon 8 Gen3 stylet S-Pen "
                              "caméra 200MP zoom 100x batterie 5000mAh charge rapide"),
            dict(name="Chargeur sans fil 65W MagSafe", category_id=ph_id, price=59.0, stock=20,
                 description="Chargeur sans fil induction rapide 65W compatible MagSafe iPhone "
                              "Qi2 charge magnétique bureau station multi-appareils universel"),
            dict(name="Filtre écran anti-espion", category_id=ph_id, price=12.0, stock=0,
                 description="Protection écran filtre confidentialité antireflet lumière bleue "
                              "regard indiscret protection yeux verre trempé haute résistance"),
        ]

        for d in products_data:
            p = Product(**d)
            if p.stock == 0:
                p.is_active = False
            db.session.add(p)

        db.session.commit()

        # Recalcul TF-IDF initial (via current_app dans le contexte)
        from flask import current_app
        current_app.tfidf_engine.fit_from_db()
        current_app.spam_detector.train()

        print("=" * 50)
        print("  CMS Intelligent — Base initialisée")
        print("=" * 50)
        print(f"  Admin  : admin@cms.com  / Admin1234!")
        print(f"  Client : client@cms.com / Client1234!")
        print(f"  Produits : {len(products_data)} (dont 2 en rupture de stock)")
        print(f"  TF-IDF : calculé sur {len(products_data)} descriptions")
        print("=" * 50)

if __name__ == "__main__":
    seed()
