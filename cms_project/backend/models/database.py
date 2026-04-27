"""
Modèles SQLAlchemy — CMS Intelligent (MySQL)
Optimisé pour l'intégration IA (TF-IDF, RL) et la gestion e-commerce multi-images.
"""
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

# ─── UTILISATEURS ─────────────────────────────────────────────────────────────

class User(db.Model):
    __tablename__ = "users"

    id         = db.Column(db.Integer, primary_key=True)
    email      = db.Column(db.String(120), unique=True, nullable=False)
    password   = db.Column(db.String(255), nullable=False)
    name       = db.Column(db.String(100), nullable=False)
    role       = db.Column(db.Enum("admin", "client"), default="client")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active  = db.Column(db.Boolean, default=True)

    carts    = db.relationship("Cart", backref="user", lazy=True, cascade="all,delete-orphan")
    orders   = db.relationship("Order", backref="user", lazy=True)
    messages = db.relationship("Message", backref="user", lazy=True)

    def set_password(self, pw):
        self.password = generate_password_hash(pw)

    def check_password(self, pw):
        return check_password_hash(self.password, pw)

    def to_dict(self):
        return {"id": self.id, "email": self.email, "name": self.name, "role": self.role}


# ─── CATÉGORIES ───────────────────────────────────────────────────────────────

class Category(db.Model):
    __tablename__ = "categories"

    id       = db.Column(db.Integer, primary_key=True)
    name     = db.Column(db.String(80), unique=True, nullable=False)
    slug     = db.Column(db.String(80), unique=True, nullable=False)
    icon     = db.Column(db.String(10), default="📦")
    
    products = db.relationship("Product", backref="category", lazy=True)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "slug": self.slug, "icon": self.icon}


# ─── PRODUITS (INTEGRATION IA & MULTI-IMAGES) ────────────────────────────────

class Product(db.Model):
    __tablename__ = "products"

    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    price       = db.Column(db.Float, nullable=False)
    stock       = db.Column(db.Integer, default=0)
    image_url   = db.Column(db.String(255), default="default.png")
    
    # 🔄 Stockage des angles (Face, Dos, etc.) sous forme de texte CSV pour MySQL
    _images_list = db.Column(db.Text, nullable=True, default="")

    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False, default=1)
    
    # Stats & Intelligence Artificielle
    is_active   = db.Column(db.Boolean, default=True)
    views       = db.Column(db.Integer, default=0)
    sales       = db.Column(db.Integer, default=0)
    rl_score    = db.Column(db.Float, default=50.0) 
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    # Relations
    tags        = db.relationship("Tag", backref="product", lazy='selectin', cascade="all,delete-orphan")
    cart_items  = db.relationship("CartItem", backref="product", lazy=True)
    order_items = db.relationship("OrderItem", backref="product", lazy=True)

    # --- LOGIQUE MULTI-IMAGES (Pivotement) ---
    @property
    def images_list(self):
        """Convertit la chaîne 'img1,img2' en tableau ['img1', 'img2'] pour le Frontend"""
        if not self._images_list:
            return [self.image_url] if self.image_url else []
        return self._images_list.split(',')

    @images_list.setter
    def images_list(self, value):
        """Convertit le tableau reçu de l'API en chaîne CSV pour MySQL"""
        if isinstance(value, list):
            self._images_list = ",".join(value)
        else:
            self._images_list = value

    @property
    def in_stock(self):
        return self.stock > 0 and self.is_active

    def to_dict(self, include_tags=True):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "stock": self.stock,
            "image_url": self.image_url,
            # 🤖 On envoie le tableau d'images pour permettre le pivotement en React
            "images_list": self.images_list, 
            "category_id": self.category_id,
            "category_name": self.category.name if self.category else "Général",
            "is_active": self.is_active,
            "in_stock": self.in_stock,
            "views": self.views,
            "sales": self.sales,
            "rl_score": round(self.rl_score or 50.0, 1),
            "tags": [t.term for t in self.tags] if include_tags else []
        }


# ─── TAGS TF-IDF ──────────────────────────────────────────────────────────────

class Tag(db.Model):
    __tablename__ = "tags"

    id          = db.Column(db.Integer, primary_key=True)
    product_id  = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    term        = db.Column(db.String(80), nullable=False)
    tfidf_score = db.Column(db.Float, default=0.0)

    def to_dict(self):
        return {"term": self.term, "score": round(self.tfidf_score, 4)}


# ─── PANIER & COMMANDES ───────────────────────────────────────────────────────

class Cart(db.Model):
    __tablename__ = "carts"
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    items      = db.relationship("CartItem", backref="cart", lazy=True, cascade="all,delete-orphan")

    @property
    def total(self):
        return sum(i.quantity * (i.product.price if i.product else 0) for i in self.items)

    def to_dict(self):
        return {
            "id": self.id,
            "items": [i.to_dict() for i in self.items],
            "total": round(self.total, 2),
            "count": sum(i.quantity for i in self.items)
        }

class CartItem(db.Model):
    __tablename__ = "cart_items"
    id         = db.Column(db.Integer, primary_key=True)
    cart_id    = db.Column(db.Integer, db.ForeignKey("carts.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    quantity   = db.Column(db.Integer, default=1)

    def to_dict(self):
        return {
            "id": self.id,
            "product": self.product.to_dict(include_tags=False) if self.product else None,
            "quantity": self.quantity,
            "subtotal": round(self.quantity * (self.product.price if self.product else 0), 2)
        }

class Order(db.Model):
    __tablename__ = "orders"
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    total      = db.Column(db.Float, nullable=False)
    status     = db.Column(db.Enum("pending","confirmed","shipped","delivered","cancelled"), default="pending")
    address    = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    items      = db.relationship("OrderItem", backref="order", lazy=True, cascade="all,delete-orphan")

    def to_dict(self):
        return {
            "id": self.id, "total": self.total, "status": self.status,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M"),
            "items": [i.to_dict() for i in self.items]
        }

class OrderItem(db.Model):
    __tablename__ = "order_items"
    id         = db.Column(db.Integer, primary_key=True)
    order_id   = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    quantity   = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            "product_name": self.product.name if self.product else "Produit supprimé",
            "quantity": self.quantity,
            "unit_price": self.unit_price,
            "subtotal": round(self.quantity * self.unit_price, 2)
        }


# ─── MESSAGERIE (SPAM DETECTION) ──────────────────────────────────────────────

class Message(db.Model):
    __tablename__ = "messages"

    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    sender_email = db.Column(db.String(120), nullable=False)
    content      = db.Column(db.Text, nullable=False)
    is_spam      = db.Column(db.Boolean, default=False)
    spam_proba   = db.Column(db.Float, default=0.0)
    auto_reply   = db.Column(db.Text, default="")
    is_read      = db.Column(db.Boolean, default=False)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id, 
            "sender": self.sender_email,
            "content": self.content, 
            "is_spam": self.is_spam,
            "spam_proba": round(self.spam_proba, 3),
            "is_read": self.is_read,
            "date": self.created_at.isoformat()
        }
        
        # ─── LOGS D'ANALYTIQUE (Suggestions IA) ───────────────────────────────────────

class RecommendationLog(db.Model):
    __tablename__ = "recommendation_logs"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    strategy = db.Column(db.String(50), nullable=False)  # 'tfidf', 'tags', ou 'category'
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    # Index pour accélérer les requêtes d'analyse (group_by)
    __table_args__ = (db.Index('idx_strategy', 'strategy'),)

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "strategy": self.strategy,
            "timestamp": self.timestamp.isoformat()
        }