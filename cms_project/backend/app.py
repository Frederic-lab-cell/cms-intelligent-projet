import os
import re
import time
import uuid
import traceback
import cloudinary
import cloudinary.uploader
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from werkzeug.utils import secure_filename
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import IntegrityError
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer
from services.workflow_engine import WorkflowEngine

# 1. Importations des modèles
from models.database import db, Product, Category, Tag, Message, User, Order
try:
    from models.database import CartItem, OrderItem
except ImportError:
    CartItem, OrderItem = None, None

# 2. Configuration
try:
    from config import Config
except ImportError:
    class Config:
        SQLALCHEMY_DATABASE_URI = "mysql+pymysql://root:@localhost/cms_intelligent"
        SQLALCHEMY_TRACK_MODIFICATIONS = False
        JWT_SECRET_KEY = "frederic-master-2-cybersecurity-key-2026-super-long"
        UPLOAD_FOLDER = os.path.abspath(os.path.join(os.getcwd(), 'static', 'uploads'))
        MAX_CONTENT_LENGTH = 10 * 1024 * 1024
        # FIX #1 — Valeurs par défaut pour les attributs ML manquants dans la Config fallback
        TFIDF_MAX_TAGS = 5
        RL_LEARNING_RATE = 0.01
        RL_DISCOUNT = 0.9
        RL_EPSILON = 1.0
        RL_EPSILON_DECAY = 0.995
        RL_MIN_EPSILON = 0.01

# 3. Configuration Cloudinary
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME", "dfxhm9k3i"),
    api_key=os.environ.get("CLOUDINARY_API_KEY", "217318259948251"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET", "kTT1ctAQ4ocFHkdVOoSkOlHfNDI")
)

# Importation des Blueprints
from routes.auth import auth_bp
from routes.cart import cart_bp
from routes.orders import orders_bp
from routes.messages import messages_bp
from routes.admin import admin_bp
from routes.recommendations import reco_bp
from routes.products import products_bp

CATEGORY_KEYWORDS = {
    "informatique": [
        "ordinateur", "portable", "pc", "laptop", "gaming", "asus", "hp", "dell", "macbook",
        "intel", "amd", "nvidia", "ssd", "ram", "performance"
    ],
    "automobile": [
        "voiture", "auto", "suv", "hybride", "renault", "peugeot", "citroen", "audi", "bmw", "mercedes",
        "route", "berline", "sportive"
    ],
    "moto": [
        "moto", "125r", "xtreme", "scooter", "street", "ducati", "kawasaki", "yamaha", "honda", "ct125"
    ],
    "smartphone": [
        "smartphone", "iphone", "android", "samsung", "telephone", "xiaomi", "huawei", "pixel", "apple"
    ],
}


def _normalize_text(text: str) -> str:
    return re.sub(r"[^\w\s]", " ", (text or "").lower()).strip()


def _get_default_category_id():
    # FIX #2 — Category.query.get() est déprécié en SQLAlchemy 2.x, utiliser db.session.get()
    category = db.session.get(Category, 1)
    if category:
        return category.id
    first = Category.query.first()
    return first.id if first else 1


def infer_category_id(name: str, description: str) -> int:
    text = _normalize_text(f"{name} {description}")
    if not text:
        return _get_default_category_id()

    best_label = None
    best_score = 0
    for label, keywords in CATEGORY_KEYWORDS.items():
        score = sum(text.count(keyword) for keyword in keywords)
        if score > best_score:
            best_score = score
            best_label = label

    if not best_label or best_score == 0:
        return _get_default_category_id()

    category = Category.query.filter(Category.name.ilike(f"%{best_label}%"))\
                             .order_by(Category.id.asc()).first()
    if category:
        return category.id

    return _get_default_category_id()


def upload_to_cloudinary(file, folder="cms_intelligent"):
    """Upload un fichier sur Cloudinary et retourne l'URL sécurisée."""
    try:
        result = cloudinary.uploader.upload(
            file,
            folder=folder,
            resource_type="image"
        )
        return result["secure_url"]
    except Exception as e:
        print(f"Erreur Cloudinary upload: {e}")
        return None


# FIX #3 — Fonction utilitaire de conversion sécurisée pour price/stock
def _safe_float(value, default=0.0):
    """Convertit en float sans planter sur chaîne vide ou None."""
    try:
        return float(value) if value not in (None, "", "null") else default
    except (TypeError, ValueError):
        return default


def _safe_int(value, default=0):
    """Convertit en int sans planter sur chaîne vide ou None."""
    try:
        return int(value) if value not in (None, "", "null") else default
    except (TypeError, ValueError):
        return default


def create_app():
    app = Flask(__name__)
    app.url_map.strict_slashes = False
    app.config.from_object(Config)

    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

    # --- CONFIGURATION CORS ---
    CORS(app, resources={r"/api/*": {"origins": [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://cms-intelligent-frontend.onrender.com"
    ]}},
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])

    JWTManager(app)
    db.init_app(app)

    # --- SERVIR LES IMAGES LOCALES (fallback) ---
    @app.route('/static/uploads/<filename>')
    def uploaded_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    @app.route('/<filename>')
    def serve_image_root(filename):
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(file_path):
            return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
        return jsonify({"error": f"File {filename} not found"}), 404

    # --- ROUTE LATEST ---
    @app.route('/api/products/latest', methods=['GET', 'OPTIONS'])
    def get_latest_products():
        if request.method == 'OPTIONS':
            return jsonify({}), 200
        try:
            products = Product.query.order_by(Product.id.desc()).limit(3).all()
            return jsonify([p.to_dict() for p in products]), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # --- ROUTES CATÉGORIES ---
    @app.route('/api/products/categories/all', methods=['GET', 'OPTIONS'])
    @app.route('/api/products/categories', methods=['GET', 'POST', 'OPTIONS'])
    def handle_categories_root():
        if request.method == 'OPTIONS':
            return jsonify({}), 200
        if request.method == 'POST':
            data = request.get_json()
            name = data.get('name', '').strip()
            if not name:
                return jsonify({"error": "Nom requis"}), 400
            existing = Category.query.filter_by(name=name).first()
            if existing:
                return jsonify({'id': existing.id, 'name': existing.name}), 200
            try:
                new_cat = Category(name=name, slug=name.lower().replace(" ", "-"))
                db.session.add(new_cat)
                db.session.commit()
                return jsonify({'id': new_cat.id, 'name': new_cat.name}), 201
            except IntegrityError:
                db.session.rollback()
                existing = Category.query.filter_by(name=name).first()
                return jsonify({'id': existing.id}), 200
        return jsonify([{'id': c.id, 'name': c.name} for c in Category.query.all()]), 200

    # --- ROUTES PRODUITS ---
    @app.route('/api/products', methods=['GET', 'POST', 'OPTIONS'])
    def handle_products():
        if request.method == 'OPTIONS':
            return jsonify({}), 200

        if request.method == 'POST':
            try:
                # 1. GESTION DYNAMIQUE DE LA CATÉGORIE
                new_cat_name = request.form.get('new_category_name', '').strip()
                if new_cat_name:
                    cat = Category.query.filter_by(name=new_cat_name).first()
                    if not cat:
                        cat = Category(name=new_cat_name, slug=new_cat_name.lower().replace(" ", "-"))
                        db.session.add(cat)
                        db.session.commit()
                    category_id = cat.id
                else:
                    category_id = None
                    category_id_raw = request.form.get('category_id')
                    if category_id_raw:
                        try:
                            candidate_id = int(category_id_raw)
                            # FIX #4 — Remplacer Category.query.get() déprécié
                            if db.session.get(Category, candidate_id):
                                category_id = candidate_id
                        except (TypeError, ValueError):
                            category_id = None

                    if category_id is None:
                        category_id = infer_category_id(
                            request.form.get('name', ''),
                            request.form.get('description', '')
                        )

                # 2. GESTION IMAGE PRINCIPALE — CLOUDINARY
                file = request.files.get('image')
                image_url = "default.png"
                if file and file.filename != '':
                    cloudinary_url = upload_to_cloudinary(file, folder="cms_intelligent/products")
                    if cloudinary_url:
                        image_url = cloudinary_url
                    else:
                        # Fallback local si Cloudinary échoue
                        ext = os.path.splitext(secure_filename(file.filename))[1]
                        unique_filename = f"main_{int(time.time())}_{uuid.uuid4().hex[:8]}{ext}"
                        file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))
                        image_url = unique_filename

                # 3. GESTION DES ANGLES (MULTI-IMAGES) — CLOUDINARY
                add_files = request.files.getlist('additional_images')
                images_list = [image_url]
                for a_file in add_files:
                    if a_file.filename != '':
                        cloudinary_url = upload_to_cloudinary(a_file, folder="cms_intelligent/products")
                        if cloudinary_url:
                            images_list.append(cloudinary_url)
                        else:
                            # Fallback local
                            ext = os.path.splitext(secure_filename(a_file.filename))[1]
                            a_name = f"angle_{int(time.time())}_{uuid.uuid4().hex[:8]}{ext}"
                            a_file.save(os.path.join(app.config['UPLOAD_FOLDER'], a_name))
                            images_list.append(a_name)

                # 4. CRÉATION DU PRODUIT
                # FIX #5 — Utiliser _safe_float / _safe_int pour éviter ValueError sur chaîne vide
                new_p = Product(
                    name=request.form.get('name', '').strip() or None,
                    price=_safe_float(request.form.get('price')),
                    stock=_safe_int(request.form.get('stock')),
                    description=request.form.get('description', ""),
                    category_id=category_id,
                    image_url=image_url
                )

                # FIX #6 — Vérification que le nom n'est pas vide (contrainte NOT NULL fréquente)
                if not new_p.name:
                    return jsonify({"error": "Le nom du produit est requis"}), 400

                if hasattr(new_p, 'images_list'):
                    new_p.images_list = images_list

                # FIX #7 — Vérifier que views/ia_score existent comme attributs avant d'assigner
                if hasattr(new_p, 'views'):
                    new_p.views = 0
                if hasattr(new_p, 'ia_score'):
                    new_p.ia_score = 0.5

                db.session.add(new_p)
                db.session.flush()

                # 5. GÉNÉRATION DES TAGS IA
                if hasattr(app, 'tfidf_engine'):
                    try:
                        text_content = f"{new_p.name} {new_p.description}"
                        if not app.tfidf_engine.is_fitted:
                            app.tfidf_engine.fit_from_db()

                        row = app.tfidf_engine.vectorizer.transform([text_content]).toarray()[0]
                        feature_names = app.tfidf_engine.vectorizer.get_feature_names_out()

                        # FIX #8 — getattr avec défaut pour TFIDF_MAX_TAGS
                        max_tags = getattr(Config, 'TFIDF_MAX_TAGS', 5)
                        top_indices = row.argsort()[-max_tags:][::-1]

                        for idx in top_indices:
                            if row[idx] > 0:
                                db.session.add(Tag(
                                    product_id=new_p.id,
                                    term=feature_names[idx],
                                    tfidf_score=float(row[idx])
                                ))
                    except Exception as e:
                        # FIX #9 — Ne pas laisser l'erreur IA bloquer la création du produit
                        print(f"Erreur IA Tags (non bloquant): {e}")

                db.session.commit()
                db.session.refresh(new_p)

                return jsonify(new_p.to_dict()), 201

            except Exception as e:
                db.session.rollback()
                # FIX #10 — Toujours logger le traceback complet côté serveur pour debug
                print(f"[ERREUR POST /api/products] {e}")
                print(traceback.format_exc())
                return jsonify({"error": str(e)}), 500

        # GET — liste paginée
        page = request.args.get('page', 1, type=int)
        pagination = Product.query.options(joinedload(Product.category)).order_by(
            Product.id.desc()).paginate(page=page, per_page=100, error_out=False)
        return jsonify({
            "products": [p.to_dict() for p in pagination.items],
            "total": pagination.total
        }), 200

    # --- ROUTE SUGGESTION IA ---
    @app.route('/api/products/suggestions/<int:product_id>', methods=['GET'])
    def get_ai_suggestions(product_id):
        product = db.session.get(Product, product_id)
        if not product:
            return jsonify([]), 404

        suggestions = []
        if hasattr(app, 'tfidf_engine'):
            suggestions = app.tfidf_engine.similar_products(product_id, top_n=4)

        if not suggestions:
            tags = [t.term for t in Tag.query.filter_by(product_id=product_id).all()]
            if tags:
                suggestions = Product.query.join(Tag)\
                    .filter(Tag.term.in_(tags), Product.id != product_id)\
                    .distinct()\
                    .limit(4).all()
            else:
                suggestions = Product.query.filter(
                    Product.category_id == product.category_id,
                    Product.id != product_id
                ).limit(4).all()

        if isinstance(suggestions, list) and suggestions and hasattr(suggestions[0], 'to_dict'):
            return jsonify([p.to_dict() for p in suggestions]), 200

        return jsonify(suggestions), 200

    @app.route('/api/products/<int:product_id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
    def handle_single_product(product_id):
        if request.method == 'OPTIONS':
            return jsonify({}), 200

        product = db.session.get(Product, product_id)
        if not product:
            return jsonify({"error": "Produit introuvable"}), 404

        if request.method == 'GET' and hasattr(product, 'views'):
            try:
                product.views = (product.views or 0) + 1
                db.session.commit()
            except Exception:
                db.session.rollback()

        if request.method == 'DELETE':
            try:
                if CartItem:
                    db.session.execute(db.delete(CartItem).where(CartItem.product_id == product_id))
                db.session.execute(db.delete(Tag).where(Tag.product_id == product_id))
                if OrderItem:
                    db.session.execute(db.delete(OrderItem).where(OrderItem.product_id == product_id))
                db.session.delete(product)
                db.session.commit()
                return jsonify({"message": "Supprimé"}), 200
            except Exception as e:
                db.session.rollback()
                return jsonify({"error": str(e)}), 500

        if request.method == 'PUT':
            data = request.form
            product.name = data.get('name', product.name)
            # FIX #11 — Conversion sécurisée du prix en PUT également
            product.price = _safe_float(data.get('price'), default=product.price)
            db.session.commit()
            return jsonify({"message": "Mis à jour"}), 200

        return jsonify(product.to_dict()), 200

    # --- BRIDGE POUR ROUTE OUBLIÉE ---
    @app.route('/api/forgot-password', methods=['POST', 'OPTIONS'])
    def forgot_password_bridge():
        if request.method == 'OPTIONS':
            return jsonify({}), 200
        from routes.auth import forgot_password
        return forgot_password()

    # ENREGISTREMENT BLUEPRINTS
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(cart_bp, url_prefix="/api/cart")
    app.register_blueprint(orders_bp, url_prefix="/api/orders")
    app.register_blueprint(messages_bp, url_prefix="/api/messages")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(reco_bp, url_prefix="/api/recommendations")

    with app.app_context():
        db.create_all()

        # TF-IDF Engine
        try:
            from ml.tfidf_engine import TFIDFEngine
            app.tfidf_engine = TFIDFEngine()
            app.tfidf_engine.fit_from_db()
            print("✅ TF-IDF Engine et Tags IA chargés.")
        except Exception as e:
            print(f"⚠️ Erreur TF-IDF Engine: {e}")

        # RL Agent
        try:
            from ml.rl_agent import RLAgent
            app.rl_agent = RLAgent(
                lr=getattr(Config, 'RL_LEARNING_RATE', 0.01),
                gamma=getattr(Config, 'RL_DISCOUNT', 0.9),
                epsilon=getattr(Config, 'RL_EPSILON', 1.0),
                epsilon_decay=getattr(Config, 'RL_EPSILON_DECAY', 0.995),
                min_epsilon=getattr(Config, 'RL_MIN_EPSILON', 0.01),
            )
            print("✅ RL Agent chargé.")
        except Exception:
            class DummyRL:
                def on_purchase(self, pid):
                    print(f"Achat {pid}")
            app.rl_agent = DummyRL()

        # Spam Detector
        try:
            from ml.spam_detector import SpamDetector
            app.spam_detector = SpamDetector()
            print("✅ Spam Detector chargé.")
        except Exception as e:
            print(f"⚠️ Erreur Spam Detector: {e}")

    # --- INITIALISATION BPM ---
    try:
        app.workflow_engine = WorkflowEngine()
        print("✅ Workflow Engine (BPM) chargé.")
    except Exception as e:
        print(f"⚠️ Erreur Workflow Engine: {e}")

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)