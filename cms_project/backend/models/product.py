import os
import time
import uuid
from flask import Blueprint, request, jsonify, current_app, abort
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from werkzeug.utils import secure_filename
from models.database import db, Product, Category, User

products_bp = Blueprint("products", __name__)

def _admin_required():
    """Vérifie l'authentification et le rôle admin."""
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        u = User.query.get(int(user_id))
        if not u or u.role != "admin":
            abort(403, description="Accès réservé aux administrateurs.")
        return u
    except Exception:
        abort(401, description="Session invalide ou expirée.")

@products_bp.route("/", methods=["POST"])
def create_product():
    _admin_required()
    
    # 1. Extraction des données (multipart/form-data)
    name = request.form.get("name")
    price_raw = request.form.get("price")
    description = request.form.get("description", "")
    stock_raw = request.form.get("stock", 0)
    category_id_raw = request.form.get("category_id")

    # Validation de base
    if not name or not price_raw:
        return jsonify({"error": "Le nom et le prix sont obligatoires"}), 400

    # 2. Gestion de l'image
    image_url = "default.png"
    file = request.files.get('image')
    
    if file and file.filename != '':
        try:
            filename = secure_filename(file.filename)
            ext = os.path.splitext(filename)[1]
            unique_filename = f"prod_{int(time.time())}_{uuid.uuid4().hex[:8]}{ext}"
            
            upload_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(upload_path)
            image_url = unique_filename
        except Exception as e:
            print(f"Erreur Upload: {e}")
            # On continue avec l'image par défaut si l'upload échoue

    # 3. Insertion en Base de Données
    try:
        # Conversion sécurisée des types
        price = float(price_raw)
        stock = int(stock_raw)
        category_id = int(category_id_raw) if category_id_raw and category_id_raw != 'null' else None

        new_p = Product(
            name=name,
            description=description,
            price=price,
            stock=stock,
            category_id=category_id,
            image_url=image_url,
            is_active=True,
            views=0
        )

        db.session.add(new_p)
        db.session.flush() # Pour générer l'ID avant le commit

        # 4. Mise à jour IA (TF-IDF)
        if hasattr(current_app, 'tfidf_engine'):
            try:
                current_app.tfidf_engine.fit_single(new_p.id)
            except Exception as e:
                print(f"Erreur IA fit_single: {e}")

        db.session.commit()
        return jsonify(new_p.to_dict()), 201

    except ValueError as e:
        db.session.rollback()
        return jsonify({"error": "Format de prix ou de stock invalide"}), 400
    except Exception as e:
        db.session.rollback()
        print(f"ERREUR SERVEUR (500): {str(e)}") # Vérifiez votre console Flask pour ce message
        return jsonify({"error": str(e)}), 500

# Conservez vos autres routes (get, delete, update) en dessous...