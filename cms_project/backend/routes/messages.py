"""routes/messages.py — Messagerie intelligente (Naïve Bayes)"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from models.database import db, Message

messages_bp = Blueprint("messages", __name__)

@messages_bp.post("/send")
def send_message():
    data    = request.get_json()
    content = data.get("content", "").strip()
    email   = data.get("email", "anonymous@visitor.com")

    if not content:
        return jsonify({"error": "Message vide"}), 400

    # Essayer de récupérer l'utilisateur si connecté
    user_id = None
    try:
        verify_jwt_in_request(optional=True)
        from flask_jwt_extended import get_jwt_identity
        uid = get_jwt_identity()
        if uid:
            user_id = int(uid)
    except Exception:
        pass

    # Analyse spam + intention
    result = current_app.spam_detector.analyze(content, ticket_id=0)

    msg = Message(
        user_id=user_id,
        sender_email=email,
        content=content,
        is_spam=result["is_spam"],
        spam_proba=result["spam_proba"],
        auto_reply=result["auto_reply"],
    )
    db.session.add(msg)
    db.session.commit()

    response = {
        "message_id": msg.id,
        "is_spam":    result["is_spam"],
        "intent":     result["intent"],
    }
    if not result["is_spam"]:
        response["auto_reply"] = result["auto_reply"]
    else:
        response["notice"] = "Votre message a été signalé comme spam."

    return jsonify(response), 201

@messages_bp.get("/")
@jwt_required()
def my_messages():
    user_id = int(get_jwt_identity())
    msgs    = Message.query.filter_by(user_id=user_id)\
                     .order_by(Message.created_at.desc()).all()
    return jsonify([m.to_dict() for m in msgs])
