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
            # Génération d'un nom unique pour éviter les conflits de cache
            unique_filename = f"prod_{int(time.time())}_{uuid.uuid4().hex[:8]}{ext}"
            
            upload_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(upload_path)
            image_url = unique_filename
        except Exception as e:
            print(f"Erreur Upload: {e}")

    # 3. Insertion en Base de Données
    try:
        # Conversion sécurisée des types
        price = float(price_raw)
        stock = int(stock_raw)
        # Gestion du cas où category_id est 'null' en string ou vide
        category_id = None
        if category_id_raw and category_id_raw.lower() != 'null':
            category_id = int(category_id_raw)

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
        db.session.flush() # Génère l'ID pour l'IA avant le commit

        # 4. Mise à jour IA (TF-IDF)
        if hasattr(current_app, 'tfidf_engine'):
            try:
                # On réindexe pour que le nouveau produit ait ses tags
                current_app.tfidf_engine.fit_single(new_p.id)
            except Exception as ia_err:
                print(f"Erreur IA fit_single: {ia_err}")

        db.session.commit()
        return jsonify(new_p.to_dict()), 201

    except ValueError:
        db.session.rollback()
        return jsonify({"error": "Format de prix ou de stock invalide"}), 400
    except Exception as e:
        db.session.rollback()
        print(f"ERREUR SERVEUR: {str(e)}")
        return jsonify({"error": str(e)}), 500

# --- Catalogue public ---

@products_bp.get("/")
def list_products():
    cat_id = request.args.get("category_id", type=int)
    q_str = request.args.get("q", "").strip()
    page = request.args.get("page", 1, type=int)
    per = request.args.get("per_page", 12, type=int)

    query = Product.query.filter_by(is_active=True)
    if cat_id:
        query = query.filter_by(category_id=cat_id)
    
    # Recherche textuelle simple si présente
    if q_str:
        import sqlalchemy as sa
        query = query.filter(Product.name.ilike(f"%{q_str}%"))

    query = query.order_by(Product.rl_score.desc())
    paginated = query.paginate(page=page, per_page=per, error_out=False)
    
    return jsonify({
        "products": [p.to_dict() for p in paginated.items],
        "total": paginated.total,
        "pages": paginated.pages,
        "page": page,
    })

@products_bp.get("/<int:pid>")
def get_product(pid):
    p = Product.query.get_or_404(pid)
    p.views += 1
    db.session.commit()
    
    d = p.to_dict()
    if hasattr(current_app, 'tfidf_engine'):
        d["similar"] = current_app.tfidf_engine.similar_products(pid)
    return jsonify(d)

@products_bp.get("/categories/all")
def get_categories():
    cats = Category.query.all()
    return jsonify([c.to_dict() for c in cats])

@products_bp.delete("/<int:pid>")
def delete_product(pid):
    _admin_required()
    p = Product.query.get_or_404(pid)
    db.session.delete(p)
    db.session.commit()
    return jsonify({"message": "Produit supprimé"})