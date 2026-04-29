import os
from datetime import timedelta

class Config:
    # --- 1. BASE CONFIGURATION ---
    # SECRET_KEY ampiasaina amin'ny fiarovana ny session
    SECRET_KEY = os.environ.get("SECRET_KEY", "cms-secret-key-change-in-prod")
    
    # DEBUG dia tokony ho False foana rehefa any amin'ny internet (Render)
    DEBUG = os.environ.get("DEBUG", "False").lower() == "true"

    # --- 2. MYSQL DATABASE (FILESS.IO) ---
    # Maka ny mombamomba ny base de données avy amin'ny "Environment Variables" ao amin'ny Render
    DB_USER = os.environ.get("DB_USER", "cms_intelligent_silencelie")
    DB_PASSWORD = os.environ.get("DB_PASSWORD", "f8cfeb80710fc0a104ab253c8e2a675609417c8a")
    DB_HOST = os.environ.get("DB_HOST", "0das1z.h.filess.io")
    DB_PORT = os.environ.get("DB_PORT", "61002")
    DB_NAME = os.environ.get("DB_NAME", "cms_intelligent_silencelie")

    # Manangana ny URI ofisialy ho an'ny SQLAlchemy mampiasa an'ireo variables ireo
    SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    
    # --- 3. VAHAOLANA HO AN'NY MAX_USER_CONNECTIONS ---
    # Ferana ho 2 ihany ny fifandraisana (connections) mba tsy hihoatra ny 5 (limit an'ny Filess.io)
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 2,           # Fifandraisana 2 ihany no tazonina ho velona
        "max_overflow": 0,        # Tsy avela hisy fifandraisana fanampiny mihoatra
        "pool_recycle": 280,      # Averina jerena isaky ny 280s mba tsy ho tapaka
        "pool_pre_ping": True     # Hamarinina aloha raha mbola velona ny connection
    }

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # --- 4. JWT AUTHENTICATION ---
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "jwt-secret-key-secure")
    JWT_ACCESS_TOKEN_EXPIRES  = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # --- 5. UPLOAD & ML ---
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "static/uploads")
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024
    TFIDF_MAX_FEATURES = 500
    TFIDF_MAX_TAGS     = 5
    SIMILARITY_TOP_N   = 4
    RL_LEARNING_RATE   = 0.15
    RL_DISCOUNT        = 0.9
    RL_EPSILON         = 0.6
    RL_EPSILON_DECAY   = 0.96
    RL_MIN_EPSILON     = 0.05