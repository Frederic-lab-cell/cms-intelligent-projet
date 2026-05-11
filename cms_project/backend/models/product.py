from .database import db
from datetime import datetime

class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float, nullable=False)
    stock = db.Column(db.Integer, default=0)
    # Ity no sary lehibe (image principale)
    image_url = db.Column(db.String(255))
    category_id = db.Column(db.Integer)
    is_active = db.Column(db.Boolean, default=True)
    views = db.Column(db.Integer, default=0)
    sales = db.Column(db.Integer, default=0)
    rl_score = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # RELATIONSHIP: Ity no mampitohy ny vokatra iray amin'ireo sary maro
    # 'cascade' dia mampamafa ny sary raha fafanao ilay vokatra
    additional_images = db.relationship('ProductImage', backref='product', cascade="all, delete-orphan", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "price": self.price,
            "description": self.description,
            "image_url": self.image_url,
            # Ity no mamerina ireo sary maro ho an'ny Frontend (React)
            "additional_images": [img.to_dict() for img in self.additional_images],
            "rl_score": self.rl_score,
            "views": self.views,
            "stock": self.stock
        }

class ProductImage(db.Model):
    __tablename__ = 'product_images'
    
    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(255), nullable=False) # Ny lalan'ny sary
    label = db.Column(db.String(50)) # Ohatra: 'face', 'dos', 'gauche', 'droit'
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "url": self.url,
            "label": self.label
        }