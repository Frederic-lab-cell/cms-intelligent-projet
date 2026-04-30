import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'cms-secret-key-change-in-prod')
    DEBUG = os.environ.get('DEBUG', 'True').lower() == 'true'

    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'mysql+pymysql://root:Admin123456@localhost:3306/cms_intelligent'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 2,
        'max_overflow': 1,
        'pool_timeout': 30,
        'pool_recycle': 280,
        'pool_pre_ping': True,
    }

    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-super-secret-cms-intelligent-2026-frederic')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'static/uploads')
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024

    TFIDF_MAX_FEATURES = 500
    TFIDF_MAX_TAGS = 5
    SIMILARITY_TOP_N = 4
    RL_LEARNING_RATE = 0.15
    RL_DISCOUNT = 0.9
    RL_EPSILON = 0.6
    RL_EPSILON_DECAY = 0.96
    RL_MIN_EPSILON = 0.05