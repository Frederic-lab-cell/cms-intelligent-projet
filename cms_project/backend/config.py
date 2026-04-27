import os
from datetime import timedelta

class Config:
    # Base
    SECRET_KEY = os.environ.get("SECRET_KEY", "cms-secret-key-change-in-prod")
    DEBUG = os.environ.get("DEBUG", "True") == "True"

    # MySQL
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "mysql+pymysql://root:Admin123456@localhost/cms_intelligent"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "jwt-secret-key")
    JWT_ACCESS_TOKEN_EXPIRES  = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # Upload
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "static/uploads")
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB

    # ML
    TFIDF_MAX_FEATURES = 500
    TFIDF_MAX_TAGS     = 5
    SIMILARITY_TOP_N   = 4
    RL_LEARNING_RATE   = 0.15
    RL_DISCOUNT        = 0.9
    RL_EPSILON         = 0.6
    RL_EPSILON_DECAY   = 0.96
    RL_MIN_EPSILON     = 0.05
