import os
import time
import uuid
from flask import Blueprint, request, jsonify, current_app, abort
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from werkzeug.utils import secure_filename
from models.database import db, Product, Category, User

products_bp = Blueprint("products", __name__)

def _admin_required():
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        u = User.query.get(int(user_id))
        if not u or u.role != "admin":
            abort(403, description="Accès réservé aux administrateurs.")
        return u
    except Exception:
        abort(401, description="Session invalide ou expirée.")

@products_bp.post("/")
def create_product():
    _admin_required()
    
    # 1. Extraction des données formulaire
    name = request.form.get("name")
    price = request.form.get("price")
    description = request.form.get("description", "")
    stock = request.form.get("stock", 0)
    category_id = request.form.get("category_id")

    if not name or not price:
        return jsonify({"error": "Données incomplètes (nom et prix requis)"}), 400

    # 2. Gestion de l'upload image
    image_url = "default.png"
    file = request.files.get('image')
    if file and file.filename != '':
        ext = os.path.splitext(secure_filename(file.filename))[1]
        unique_filename = f"main_{int(time.time())}_{uuid.uuid4().hex[:8]}{ext}"
        save_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(save_path)
        image_url = unique_filename

    # 3. Sauvegarde DB
    try:
        p = Product(
            name=name, 
            description=description,
            price=float(price), 
            stock=int(stock),
            category_id=int(category_id) if category_id else None,
            image_url=image_url,
            is_active=True
        )
        
        db.session.add(p)
        db.session.flush() # Nécessaire pour l'ID
        
        if hasattr(current_app, 'tfidf_engine'):
            current_app.tfidf_engine.fit_single(p.id)
            
        db.session.commit()
        return jsonify(p.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# ... (Gardez vos autres routes GET, PUT, DELETE ici)