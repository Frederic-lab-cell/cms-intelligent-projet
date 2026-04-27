"""
routes/auth.py — Inscription / Connexion / Profil
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)
from models.database import db, User

auth_bp = Blueprint("auth", __name__)

@auth_bp.post("/register")
def register():
    data = request.get_json()
    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email déjà utilisé"}), 409
    user = User(email=data["email"], name=data["name"])
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "Compte créé", "user": user.to_dict()}), 201

@auth_bp.post("/login")
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data["email"]).first()
    if not user or not user.check_password(data["password"]):
        return jsonify({"error": "Identifiants invalides"}), 401
    access  = create_access_token(identity=str(user.id))
    refresh = create_refresh_token(identity=str(user.id))
    return jsonify({"access_token": access, "refresh_token": refresh,
                    "user": user.to_dict()})

@auth_bp.get("/me")
@jwt_required()
def me():
    user = User.query.get(int(get_jwt_identity()))
    return jsonify(user.to_dict())

@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    token = create_access_token(identity=get_jwt_identity())
    return jsonify({"access_token": token})
# --- À AJOUTER DANS routes/auth.py ---

def forgot_password():
    """
    Logique pour gérer l'oubli de mot de passe.
    Appelée par le bridge dans app.py.
    """
    data = request.get_json()
    email = data.get("email")
    
    if not email:
        return jsonify({"error": "Email manquant"}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user:
        # On renvoie un succès (ou erreur 404 selon votre choix de sécurité)
        # pour éviter l'énumération d'utilisateurs
        return jsonify({"message": "Si cet email existe, un lien a été envoyé."}), 200
        
    # --- INSÉREZ VOTRE LOGIQUE D'ENVOI D'EMAIL ICI ---
    # Exemple :
    # token = serializer.dumps(user.email, salt='recover-password')
    # msg = Message("Réinitialisation", recipients=[user.email], body=f"Token: {token}")
    # mail.send(msg)
    
    return jsonify({"message": "Email de récupération envoyé"}), 200