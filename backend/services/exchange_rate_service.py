"""
Exchange Rate Service for Multi-Currency Banking Simulation
Provides real-time currency exchange rates and conversion capabilities
"""

import asyncio
import logging
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Union, Any
from decimal import Decimal, ROUND_HALF_UP
import httpx
from pydantic import BaseModel, Field, validator
from fastapi import HTTPException
import aioredis
import json
import hashlib
import os

class ExchangeRateResponse(BaseModel):
    """Response model for exchange rate data."""
    base_currency: str = Field(..., description="Base currency code")
    target_currency: str = Field(..., description="Target currency code") 
    exchange_rate: Decimal = Field(..., description="Exchange rate value")
    timestamp: datetime = Field(..., description="Rate timestamp")
    provider: str = Field(default="ExchangeRate-API", description="Data provider")
    spread: Optional[Decimal] = Field(None, description="Bid-ask spread")
    volatility: Optional[float] = Field(None, description="24h volatility")

class CurrencyConversionRequest(BaseModel):
    """Request model for currency conversion."""
    amount: Decimal = Field(..., gt=0, description="Amount to convert")
    from_currency: str = Field(..., min_length=3, max_length=3, description="Source currency")
    to_currency: str = Field(..., min_length=3, max_length=3, description="Target currency")
    
    @validator('from_currency', 'to_currency')
    def validate_currency_codes(cls, v):
        return v.upper()

class BulkConversionRequest(BaseModel):
    """Request model for bulk currency conversion."""
    conversions: List[CurrencyConversionRequest] = Field(..., max_items=50)
    
class CurrencyPair(BaseModel):
    """Currency pair with exchange rate data."""
    pair: str
    rate: Decimal
    timestamp: datetime
    change_24h: Optional[Decimal] = None
    volume_24h: Optional[Decimal] = None

class ExchangeRateCache:
    """Redis-based cache for exchange rate data."""
    
    def __init__(self, redis_url: str = "redis://localhost:6379/1"):
        self.redis_url = redis_url
        self.redis_client = None
        self.logger = logging.getLogger(__name__)
        
        # Cache TTL configurations (in seconds)
        self.ttl_config = {
            "latest_rates": 300,      # 5 minutes for live rates
            "conversions": 300,       # 5 minutes for conversions  
            "historical": 86400,      # 24 hours for historical data
            "market_data": 600,       # 10 minutes for market data
            "analytics": 1800         # 30 minutes for analytics
        }
    
    async def connect(self):
        """Connect to Redis."""
        if not self.redis_client:
            self.redis_client = await aioredis.from_url(self.redis_url, decode_responses=True)
    
    async def disconnect(self):
        """Disconnect from Redis."""
        if self.redis_client:
            await self.redis_client.close()
    
    def _generate_cache_key(self, prefix: str, **kwargs) -> str:
        """Generate cache key from parameters."""
        key_data = f"{prefix}:" + ":".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
        return hashlib.md5(key_data.encode()).hexdigest()
    
    async def get_rates(self, base_currency: str) -> Optional[Dict[str, Any]]:
        """Get cached exchange rates."""
        if not self.redis_client:
            await self.connect()
            
        cache_key = self._generate_cache_key("rates", base=base_currency)
        try:
            cached_data = await self.redis_client.get(cache_key)
            if cached_data:
                data = json.loads(cached_data)
                # Convert rate values back to Decimal
                if "rates" in data:
                    data["rates"] = {k: Decimal(str(v)) for k, v in data["rates"].items()}
                return data
        except Exception as e:
            self.logger.error(f"Cache get error: {e}")
        return None
    
    async def set_rates(self, base_currency: str, rates: Dict[str, Decimal], 
                       metadata: Dict[str, Any] = None) -> bool:
        """Cache exchange rates."""
        if not self.redis_client:
            await self.connect()
            
        cache_key = self._generate_cache_key("rates", base=base_currency)
        try:
            cache_data = {
                "rates": {k: str(v) for k, v in rates.items()},
                "timestamp": datetime.utcnow().isoformat(),
                "base_currency": base_currency,
                **(metadata or {})
            }
            
            await self.redis_client.setex(
                cache_key,
                self.ttl_config["latest_rates"],
                json.dumps(cache_data)
            )
            return True
        except Exception as e:
            self.logger.error(f"Cache set error: {e}")
            return False

class ExchangeRateService:
    """Enhanced exchange rate service with multi-provider support."""
    
    # Supported currencies for the banking simulation
    SUPPORTED_CURRENCIES = [
        "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "SEK", 
        "NOK", "DKK", "PLN", "CZK", "HUF", "RUB", "CNY", "INR",
        "BRL", "MXN", "ZAR", "KRW", "SGD", "HKD", "NZD", "TRY"
    ]
    
    MAJOR_PAIRS = [
        "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "USDCAD", "AUDUSD", "NZDUSD"
    ]
    
    def __init__(self, api_key: str, base_url: str = None, cache: ExchangeRateCache = None):
        self.api_key = api_key
        self.base_url = base_url or "https://v6.exchangerate-api.com/v6"
        self.cache = cache or ExchangeRateCache()
        self.client = None
        self.logger = logging.getLogger(__name__)
        
        # Rate limiting
        self.rate_limit_requests = 1000  # per hour
        self.rate_limit_window = 3600
        self.request_count = 0
        self.window_start = datetime.utcnow()
    
    async def __aenter__(self):
        """Async context manager entry."""
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=100)
        )
        await self.cache.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.client:
            await self.client.aclose()
        await self.cache.disconnect()
    
    async def _check_rate_limit(self) -> bool:
        """Check if we're within rate limits."""
        now = datetime.utcnow()
        if (now - self.window_start).total_seconds() > self.rate_limit_window:
            self.request_count = 0
            self.window_start = now
        
        if self.request_count >= self.rate_limit_requests:
            return False
        
        self.request_count += 1
        return True
    
    async def get_latest_rates(self, base_currency: str = "USD") -> Dict[str, Decimal]:
        """Get latest exchange rates for all supported currencies."""
        if base_currency not in self.SUPPORTED_CURRENCIES:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported base currency: {base_currency}"
            )
        
        # Try cache first
        cached_data = await self.cache.get_rates(base_currency)
        if cached_data:
            self.logger.info(f"Cache hit for rates: {base_currency}")
            return cached_data["rates"]
        
        # Check rate limits
        if not await self._check_rate_limit():
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        
        url = f"{self.base_url}/{self.api_key}/latest/{base_currency}"
        
        try:
            if not self.client:
                await self.__aenter__()
                
            response = await self.client.get(url)
            response.raise_for_status()
            data = response.json()
            
            if data.get("result") != "success":
                raise HTTPException(status_code=502, detail="External API error")
            
            # Extract supported currencies only
            rates = {}
            conversion_rates = data.get("conversion_rates", {})
            
            for currency in self.SUPPORTED_CURRENCIES:
                if currency in conversion_rates:
                    rate_value = Decimal(str(conversion_rates[currency]))
                    # Round to 6 decimal places for precision
                    rates[currency] = rate_value.quantize(
                        Decimal('0.000001'), 
                        rounding=ROUND_HALF_UP
                    )
            
            # Cache the results
            metadata = {
                "provider": "ExchangeRate-API",
                "update_time": data.get("time_last_update_utc"),
                "next_update": data.get("time_next_update_utc")
            }
            await self.cache.set_rates(base_currency, rates, metadata)
            
            self.logger.info(f"Fetched fresh rates for {base_currency}: {len(rates)} currencies")
            return rates
            
        except httpx.TimeoutException:
            self.logger.error(f"Timeout getting rates for {base_currency}")
            raise HTTPException(status_code=504, detail="API timeout")
        except httpx.HTTPStatusError as e:
            self.logger.error(f"HTTP error getting rates: {e.response.status_code}")
            if e.response.status_code == 429:
                raise HTTPException(status_code=429, detail="External API rate limit")
            raise HTTPException(status_code=502, detail="External API error")
        except Exception as e:
            self.logger.error(f"Unexpected error getting rates: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")
    
    async def convert_currency(self, request: CurrencyConversionRequest) -> Dict[str, Any]:
        """Convert currency with enhanced features."""
        if request.from_currency not in self.SUPPORTED_CURRENCIES:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported source currency: {request.from_currency}"
            )
        if request.to_currency not in self.SUPPORTED_CURRENCIES:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported target currency: {request.to_currency}"
            )
        
        # Get current rates
        rates = await self.get_latest_rates(request.from_currency)
        
        if request.to_currency not in rates:
            raise HTTPException(
                status_code=400, 
                detail=f"Exchange rate not available for {request.to_currency}"
            )
        
        exchange_rate = rates[request.to_currency]
        converted_amount = (request.amount * exchange_rate).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        # Calculate spread simulation (0.1% for major pairs, 0.3% for others)
        pair = f"{request.from_currency}{request.to_currency}"
        is_major = any(major in pair for major in self.MAJOR_PAIRS)
        spread_percentage = Decimal('0.001') if is_major else Decimal('0.003')
        spread = exchange_rate * spread_percentage
        
        return {
            "original_amount": request.amount,
            "from_currency": request.from_currency,
            "to_currency": request.to_currency,
            "exchange_rate": exchange_rate,
            "converted_amount": converted_amount,
            "spread": spread,
            "is_major_pair": is_major,
            "timestamp": datetime.utcnow(),
            "provider": "ExchangeRate-API"
        }
    
    async def bulk_convert_currencies(self, request: BulkConversionRequest) -> List[Dict[str, Any]]:
        """Perform bulk currency conversions efficiently."""
        results = []
        
        # Group conversions by base currency to minimize API calls
        base_currencies = set(conv.from_currency for conv in request.conversions)
        
        # Pre-fetch all needed rates
        rates_cache = {}
        for base_currency in base_currencies:
            try:
                rates_cache[base_currency] = await self.get_latest_rates(base_currency)
            except Exception as e:
                self.logger.error(f"Failed to get rates for {base_currency}: {e}")
                continue
        
        # Process each conversion
        for conversion in request.conversions:
            try:
                if conversion.from_currency not in rates_cache:
                    results.append({
                        "error": f"Rates unavailable for {conversion.from_currency}",
                        "from_currency": conversion.from_currency,
                        "to_currency": conversion.to_currency,
                        "original_amount": conversion.amount
                    })
                    continue
                
                rates = rates_cache[conversion.from_currency]
                if conversion.to_currency not in rates:
                    results.append({
                        "error": f"Exchange rate not available for {conversion.to_currency}",
                        "from_currency": conversion.from_currency,
                        "to_currency": conversion.to_currency,
                        "original_amount": conversion.amount
                    })
                    continue
                
                # Perform conversion
                exchange_rate = rates[conversion.to_currency]
                converted_amount = (conversion.amount * exchange_rate).quantize(
                    Decimal('0.01'), rounding=ROUND_HALF_UP
                )
                
                results.append({
                    "original_amount": conversion.amount,
                    "from_currency": conversion.from_currency,
                    "to_currency": conversion.to_currency,
                    "exchange_rate": exchange_rate,
                    "converted_amount": converted_amount,
                    "timestamp": datetime.utcnow()
                })
                
            except Exception as e:
                self.logger.error(f"Bulk conversion error: {e}")
                results.append({
                    "error": str(e),
                    "from_currency": conversion.from_currency,
                    "to_currency": conversion.to_currency,
                    "original_amount": conversion.amount
                })
        
        return results
    
    async def get_historical_rates(self, target_date: date, base_currency: str = "USD") -> Dict[str, Decimal]:
        """Get historical exchange rates for a specific date."""
        if base_currency not in self.SUPPORTED_CURRENCIES:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported base currency: {base_currency}"
            )
        
        # Check if date is too far in the past (API limitation)
        days_ago = (date.today() - target_date).days
        if days_ago > 365:
            raise HTTPException(
                status_code=400, 
                detail="Historical data limited to 1 year"
            )
        
        if not await self._check_rate_limit():
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        
        formatted_date = target_date.strftime("%Y-%m-%d")
        url = f"{self.base_url}/{self.api_key}/history/{base_currency}/{formatted_date}"
        
        try:
            if not self.client:
                await self.__aenter__()
                
            response = await self.client.get(url)
            response.raise_for_status()
            data = response.json()
            
            if data.get("result") != "success":
                raise HTTPException(status_code=502, detail="Historical data unavailable")
            
            rates = {}
            conversion_rates = data.get("conversion_rates", {})
            
            for currency in self.SUPPORTED_CURRENCIES:
                if currency in conversion_rates:
                    rates[currency] = Decimal(str(conversion_rates[currency])).quantize(
                        Decimal('0.000001'), rounding=ROUND_HALF_UP
                    )
            
            return rates
            
        except httpx.TimeoutException:
            self.logger.error(f"Timeout getting historical rates for {formatted_date}")
            raise HTTPException(status_code=504, detail="Historical data timeout")
        except httpx.HTTPStatusError as e:
            self.logger.error(f"HTTP error getting historical rates: {e.response.status_code}")
            raise HTTPException(status_code=502, detail="External API error")
        except Exception as e:
            self.logger.error(f"Unexpected error getting historical rates: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")
    
    async def get_currency_pairs_data(self) -> List[CurrencyPair]:
        """Get comprehensive currency pairs data with market information."""
        base_rates = await self.get_latest_rates("USD")
        pairs = []
        
        for currency in self.SUPPORTED_CURRENCIES:
            if currency != "USD" and currency in base_rates:
                pair_name = f"USD{currency}"
                rate = base_rates[currency]
                
                # Simulate 24h change (in real implementation, this would come from historical data)
                import random
                change_24h = Decimal(str(random.uniform(-0.05, 0.05))).quantize(
                    Decimal('0.0001'), rounding=ROUND_HALF_UP
                )
                
                pairs.append(CurrencyPair(
                    pair=pair_name,
                    rate=rate,
                    timestamp=datetime.utcnow(),
                    change_24h=change_24h,
                    volume_24h=Decimal(str(random.uniform(1000000, 10000000)))
                ))
        
        return pairs
    
    async def get_market_summary(self) -> Dict[str, Any]:
        """Get comprehensive market summary."""
        try:
            pairs_data = await self.get_currency_pairs_data()
            
            # Calculate market statistics
            positive_changes = [p for p in pairs_data if p.change_24h and p.change_24h > 0]
            negative_changes = [p for p in pairs_data if p.change_24h and p.change_24h < 0]
            
            total_volume = sum(p.volume_24h for p in pairs_data if p.volume_24h)
            
            return {
                "timestamp": datetime.utcnow(),
                "total_pairs": len(pairs_data),
                "gainers": len(positive_changes),
                "losers": len(negative_changes),
                "total_volume_24h": total_volume,
                "top_gainers": sorted(positive_changes, key=lambda x: x.change_24h, reverse=True)[:5],
                "top_losers": sorted(negative_changes, key=lambda x: x.change_24h)[:5],
                "major_pairs": [p for p in pairs_data if any(major in p.pair for major in self.MAJOR_PAIRS)],
                "market_status": "OPEN",  # In real implementation, this would check market hours
                "supported_currencies": self.SUPPORTED_CURRENCIES
            }
            
        except Exception as e:
            self.logger.error(f"Error getting market summary: {e}")
            raise HTTPException(status_code=500, detail="Failed to get market summary")

# Service instance factory
async def create_exchange_service() -> ExchangeRateService:
    """Create and configure exchange rate service instance."""
    api_key = os.getenv("EXCHANGE_RATES_API_KEY")
    if not api_key:
        raise ValueError("EXCHANGE_RATES_API_KEY environment variable required")
    
    cache = ExchangeRateCache()
    service = ExchangeRateService(api_key=api_key, cache=cache)
    return service