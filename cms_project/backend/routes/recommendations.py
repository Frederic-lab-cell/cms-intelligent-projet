"""routes/recommendations.py — Suggestions RL + TF-IDF"""
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, current_app, request
from models.database import db, Order, OrderItem, Product

reco_bp = Blueprint("recommendations", __name__)

@reco_bp.get("/popular")
def popular():
    """Top produits par score RL (suggestions visiteur) avec mise en avant des nouveautés."""
    category_id = request.args.get("category_id", type=int)
    query = Product.query.filter_by(is_active=True)
    if category_id:
        query = query.filter_by(category_id=category_id)

    recent_window = datetime.utcnow() - timedelta(days=7)
    recent_candidates = (query.filter(Product.created_at >= recent_window)
                               .order_by(Product.created_at.desc())
                               .limit(2)
                               .all())

    popular_products = query.order_by(Product.rl_score.desc(), Product.views.desc())\
                            .limit(6).all()

    recent_to_add = [p for p in recent_candidates if p.id not in {x.id for x in popular_products}]
    products = popular_products + recent_to_add
    if len(products) < 8:
        extra = query.filter(Product.id.notin_([p.id for p in products]))\
                     .order_by(Product.created_at.desc())\
                     .limit(8 - len(products)).all()
        products.extend(extra)

    return jsonify([p.to_dict() for p in products[:8]])

@reco_bp.get("/similar/<int:pid>")
def similar(pid):
    """Produits similaires par similarité cosinus TF-IDF."""
    results = current_app.tfidf_engine.similar_products(pid)
    return jsonify(results)

@reco_bp.get("/trending")
def trending():
    """Tendances : produits les plus vendus sur les dernières semaines."""
    category_id = request.args.get("category_id", type=int)
    recent_window = datetime.utcnow() - timedelta(days=14)

    recent_sales = (db.session.query(
        OrderItem.product_id,
        db.func.sum(OrderItem.quantity).label("qty")
    )
    .join(Order, OrderItem.order_id == Order.id)
    .filter(Order.created_at >= recent_window)
    .group_by(OrderItem.product_id)
    .order_by(db.desc("qty"))
    .limit(8)
    .subquery())

    query = Product.query.join(recent_sales, Product.id == recent_sales.c.product_id)
    if category_id:
        query = query.filter(Product.category_id == category_id)

    products = query.filter(Product.is_active.is_(True))\
                    .order_by(recent_sales.c.qty.desc())\
                    .limit(8).all()

    if not products:
        fallback = Product.query.filter_by(is_active=True)
        if category_id:
            fallback = fallback.filter_by(category_id=category_id)
        products = fallback.order_by(Product.sales.desc())\
                        .limit(8).all()
    else:
        recent_window = datetime.utcnow() - timedelta(days=7)
        recent_products = Product.query.filter(
            Product.is_active.is_(True),
            Product.created_at >= recent_window,
            ~Product.id.in_([p.id for p in products])
        )
        if category_id:
            recent_products = recent_products.filter(Product.category_id == category_id)
        recent_products = recent_products.order_by(Product.created_at.desc()).limit(8 - len(products)).all()
        products.extend(recent_products)

    if not products:
        products = Product.query.filter_by(is_active=True)\
                        .order_by(Product.created_at.desc())\
                        .limit(8).all()

    return jsonify([p.to_dict() for p in products])
