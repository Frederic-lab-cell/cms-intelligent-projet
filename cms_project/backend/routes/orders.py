from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.database import db, Order, OrderItem, Cart, CartItem, Product

orders_bp = Blueprint("orders", __name__)

@orders_bp.post("/checkout")
@jwt_required()
def checkout():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    cart = Cart.query.filter_by(user_id=user_id).first()

    if not cart or not cart.items:
        return jsonify({"error": "Panier vide"}), 400

    # Vérification stock et création commande
    # Note : On initialise le status à 'pending' pour que le BPM puisse gérer la suite
    order = Order(
        user_id=user_id, 
        total=cart.total,
        address=data.get("address", ""),
        status="pending"  # <-- Initialisation pour le BPM
    )
    db.session.add(order)
    db.session.flush()

    for item in cart.items:
        p = item.product
        if not p.in_stock or p.stock < item.quantity:
            db.session.rollback()
            return jsonify({"error": f"Stock insuffisant pour {p.name}"}), 400
        
        # Décrémenter stock
        p.stock -= item.quantity
        p.sales += item.quantity
        if p.stock == 0:
            p.is_active = False
            
        # RL feedback
        current_app.rl_agent.on_purchase(p.id)
        
        db.session.add(OrderItem(
            order_id=order.id, product_id=p.id,
            quantity=item.quantity, unit_price=p.price
        ))
    
    # Vider le panier
    CartItem.query.filter_by(cart_id=cart.id).delete()
    db.session.commit()
    
    # Recalcul TF-IDF après changements
    current_app.tfidf_engine.fit_from_db()
    
    return jsonify(order.to_dict()), 201

# --- NOUVELLE ROUTE BPM ---
@orders_bp.route('/<int:order_id>/update-status', methods=['POST'])
@jwt_required() # Protection par JWT
def update_order_status(order_id):
    """
    Met à jour le statut d'une commande via le WorkflowEngine.
    """
    data = request.get_json()
    new_status = data.get('status')

    if not new_status:
        return jsonify({"error": "Statut requis"}), 400

    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Commande introuvable"}), 404

    # Utilisation du moteur BPM injecté dans l'app
    success, message = current_app.workflow_engine.process_order_update(order, new_status)

    if success:
        db.session.commit()
        return jsonify({"message": f"Statut mis à jour vers {new_status}"}), 200
    else:
        return jsonify({"error": message}), 400

@orders_bp.get("/")
@jwt_required()
def my_orders():
    user_id = int(get_jwt_identity())
    orders = Order.query.filter_by(user_id=user_id)\
                     .order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders])

@orders_bp.get("/<int:oid>")
@jwt_required()
def get_order(oid):
    order = Order.query.get_or_404(oid)
    return jsonify(order.to_dict())