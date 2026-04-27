"""routes/cart.py"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.database import db, Cart, CartItem, Product

cart_bp = Blueprint("cart", __name__)

def _get_or_create_cart(user_id):
    cart = Cart.query.filter_by(user_id=user_id).first()
    if not cart:
        cart = Cart(user_id=user_id)
        db.session.add(cart)
        db.session.commit()
    return cart

@cart_bp.get("/")
@jwt_required()
def get_cart():
    cart = _get_or_create_cart(int(get_jwt_identity()))
    return jsonify(cart.to_dict())

@cart_bp.post("/add")
@jwt_required()
def add_to_cart():
    data    = request.get_json()
    user_id = int(get_jwt_identity())
    pid     = data["product_id"]
    qty     = data.get("quantity", 1)

    p = Product.query.get_or_404(pid)
    if not p.in_stock:
        return jsonify({"error": "Produit épuisé ou indisponible"}), 400
    if p.stock < qty:
        return jsonify({"error": f"Stock insuffisant. Disponible : {p.stock}"}), 400

    cart = _get_or_create_cart(user_id)
    item = CartItem.query.filter_by(cart_id=cart.id, product_id=pid).first()
    if item:
        new_qty = item.quantity + qty
        if new_qty > p.stock:
            return jsonify({"error": f"Stock max : {p.stock}"}), 400
        item.quantity = new_qty
    else:
        item = CartItem(cart_id=cart.id, product_id=pid, quantity=qty)
        db.session.add(item)
    db.session.commit()
    return jsonify(cart.to_dict())

@cart_bp.put("/item/<int:item_id>")
@jwt_required()
def update_item(item_id):
    data = request.get_json()
    item = CartItem.query.get_or_404(item_id)
    qty  = data.get("quantity", 1)
    if qty <= 0:
        db.session.delete(item)
    else:
        if qty > item.product.stock:
            return jsonify({"error": f"Stock max : {item.product.stock}"}), 400
        item.quantity = qty
    db.session.commit()
    cart = Cart.query.get(item.cart_id)
    return jsonify(cart.to_dict())

@cart_bp.delete("/item/<int:item_id>")
@jwt_required()
def remove_item(item_id):
    item = CartItem.query.get_or_404(item_id)
    cart_id = item.cart_id
    db.session.delete(item)
    db.session.commit()
    return jsonify(Cart.query.get(cart_id).to_dict())

@cart_bp.delete("/clear")
@jwt_required()
def clear_cart():
    cart = _get_or_create_cart(int(get_jwt_identity()))
    CartItem.query.filter_by(cart_id=cart.id).delete()
    db.session.commit()
    return jsonify({"message": "Panier vidé"})
