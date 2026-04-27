"""routes/admin.py — Dashboard admin avec Feedback IA"""
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from models.database import db, User, Product, Order, OrderItem, Message, Category

admin_bp = Blueprint("admin", __name__)

def _require_admin():
    verify_jwt_in_request()
    u = User.query.get(int(get_jwt_identity()))
    if not u or u.role != "admin":
        from flask import abort; abort(403)
    return u

# --- DASHBOARD & STATS ---

@admin_bp.get("/dashboard")
def dashboard():
    _require_admin()
    total_users    = User.query.filter_by(role="client").count()
    total_products = Product.query.count()
    total_orders   = Order.query.count()
    
    revenue = db.session.query(db.func.sum(Order.total))\
                .filter(Order.status != "cancelled").scalar() or 0
    
    # Statistiques de messagerie & Sécurité IA
    pending_msgs   = Message.query.filter_by(is_read=False, is_spam=False).count()
    total_spams    = Message.query.filter_by(is_spam=True).count()
    
    low_stock = Product.query.filter(Product.stock <= 5,
                                    Product.is_active == True).count()
    
    return jsonify({
        "total_users": total_users, 
        "total_products": total_products,
        "total_orders": total_orders, 
        "revenue": round(revenue, 2),
        "pending_messages": pending_msgs,
        "total_spams_detected": total_spams,
        "low_stock_alerts": low_stock,
    })

# --- GESTION DES COMMANDES ---

@admin_bp.get("/orders")
def all_orders():
    _require_admin()
    status = request.args.get("status")
    q = Order.query.order_by(Order.created_at.desc())
    if status:
        q = q.filter_by(status=status)
    orders = q.limit(50).all()
    return jsonify([o.to_dict() for o in orders])

@admin_bp.put("/orders/<int:oid>/status")
def update_order_status(oid):
    _require_admin()
    order = Order.query.get_or_404(oid)
    data  = request.get_json()
    order.status = data["status"]
    db.session.commit()
    return jsonify(order.to_dict())

# --- GESTION DES MESSAGES & IA SPAM ---

@admin_bp.get("/messages")
def all_messages():
    _require_admin()
    show_spam = request.args.get("spam", "false") == "true"
    q = Message.query.order_by(Message.created_at.desc())
    if not show_spam:
        q = q.filter_by(is_spam=False)
    return jsonify([m.to_dict() for m in q.limit(100).all()])

@admin_bp.put("/messages/<int:mid>/read")
def mark_read(mid):
    _require_admin()
    msg = Message.query.get_or_404(mid)
    msg.is_read = True
    db.session.commit()
    return jsonify(msg.to_dict())

@admin_bp.put("/messages/<int:mid>/feedback")
def feedback_spam_correction(mid):
    """Boucle de Feedback pour corriger l'IA (Faux Positifs/Négatifs)"""
    _require_admin()
    msg = Message.query.get_or_404(mid)
    data = request.get_json()
    
    new_status = data.get("is_spam")
    if new_status is None:
        return jsonify({"error": "Donnée is_spam manquante"}), 400

    # 1. Mise à jour MySQL
    msg.is_spam = new_status
    
    # 2. Apprentissage Dynamique (Online Learning)
    if hasattr(current_app, 'spam_detector'):
        try:
            # On demande au modèle d'apprendre de son erreur
            current_app.spam_detector.update_model(msg.content, new_status)
        except Exception as e:
            print(f"Erreur update ML: {e}")

    db.session.commit()
    return jsonify({
        "message": "IA corrigée avec succès",
        "is_spam": msg.is_spam
    })

@admin_bp.get("/spam/words")
def spam_words():
    _require_admin()
    words = current_app.spam_detector.get_top_spam_words(15)
    return jsonify(words)

# --- MOTEURS IA (RL & TF-IDF) ---

@admin_bp.post("/rl/episode")
def run_rl_episode():
    _require_admin()
    data = request.get_json() or {}
    cat_id = data.get("category_id")
    q = Product.query.filter_by(is_active=True)
    if cat_id:
        q = q.filter_by(category_id=cat_id)
    products = q.all()

    payload = []
    for p in products:
        top_tag = p.tags[0].tfidf_score if p.tags else 0.0
        payload.append({
            "id": p.id, 
            "priority": p.category.slug if p.category else "med",
            "views": p.views, 
            "sales": p.sales, 
            "top_tfidf": top_tag
        })

    results = current_app.rl_agent.run_episode(payload)
    for p in products:
        if p.id in results:
            delta = results[p.id]["score_delta"]
            p.rl_score = max(0, min(100, p.rl_score + delta))
    db.session.commit()
    return jsonify({
        "episode_results": results,
        "products_updated": len(results),
        "epsilon": round(current_app.rl_agent.epsilon, 4),
        "episodes": current_app.rl_agent.episodes,
    })

@admin_bp.get("/rl/metrics")
def rl_metrics():
    _require_admin()
    agent = current_app.rl_agent
    recent_window = datetime.utcnow() - timedelta(days=14)

    rows = (db.session.query(
        db.func.date(Order.created_at).label("day"),
        db.func.sum(OrderItem.quantity).label("qty")
    )
    .join(Order, OrderItem.order_id == Order.id)
    .filter(Order.created_at >= recent_window)
    .group_by(db.func.date(Order.created_at))
    .order_by(db.func.date(Order.created_at))
    .all())

    day_map = {row.day.strftime("%Y-%m-%d"): int(row.qty or 0) for row in rows}
    sales_history = []
    for i in range(14):
        day = (recent_window + timedelta(days=i)).strftime("%Y-%m-%d")
        sales_history.append({"date": day, "qty": day_map.get(day, 0)})

    top_products = Product.query.filter_by(is_active=True)\
                        .order_by(Product.rl_score.desc(), Product.sales.desc())\
                        .limit(6).all()

    return jsonify({
        "epsilon": round(agent.epsilon, 4),
        "episodes": agent.episodes,
        "sales_history": sales_history,
        "top_products": [p.to_dict() for p in top_products],
    })

@admin_bp.post("/tfidf/recompute")
def recompute_tfidf():
    _require_admin()
    current_app.tfidf_engine.fit_from_db()
    return jsonify({"message": "TF-IDF recalculé"})

# --- GESTION UTILISATEURS & CATÉGORIES ---

@admin_bp.get("/users")
def list_users():
    _require_admin()
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users])

@admin_bp.post("/categories")
def create_category():
    _require_admin()
    data = request.get_json()
    cat  = Category(name=data["name"], slug=data["slug"],
                    icon=data.get("icon", "📦"))
    db.session.add(cat)
    db.session.commit()
    return jsonify(cat.to_dict()), 201