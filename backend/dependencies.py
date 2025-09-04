"""
Dependency injection for FastAPI
Provides shared services and authentication
"""

import os
from functools import lru_cache
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import logging

from services.exchange_rate_service import ExchangeRateService, ExchangeRateCache
from services.analytics_service import AnalyticsService

logger = logging.getLogger(__name__)
security = HTTPBearer()

# Configuration
SECRET_KEY = "K3RN3L808_SECRET_KEY_FOR_SIMULATION"
ALGORITHM = "HS256"

# Database connection
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Service instances (cached)
_exchange_service = None
_analytics_service = None

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return user data."""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_exchange_rate_service() -> ExchangeRateService:
    """Get exchange rate service instance."""
    global _exchange_service
    
    if _exchange_service is None:
        api_key = os.getenv("EXCHANGE_RATES_API_KEY", "demo_key")
        cache = ExchangeRateCache()
        _exchange_service = ExchangeRateService(api_key=api_key, cache=cache)
        
        # Initialize the service
        await _exchange_service.__aenter__()
    
    return _exchange_service

async def get_analytics_service() -> AnalyticsService:
    """Get analytics service instance."""
    global _analytics_service
    
    if _analytics_service is None:
        _analytics_service = AnalyticsService(client, db_name)
    
    return _analytics_service

def get_database():
    """Get database instance."""
    return db

async def cleanup_services():
    """Cleanup service connections."""
    global _exchange_service, _analytics_service
    
    if _exchange_service:
        await _exchange_service.__aexit__(None, None, None)
        _exchange_service = None
    
    if client:
        client.close()
    
    logger.info("Services cleaned up successfully")