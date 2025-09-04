"""
Exchange Rates API Router
Provides endpoints for currency exchange operations
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Any
from datetime import date, datetime
from decimal import Decimal
import logging

from ..services.exchange_rate_service import (
    ExchangeRateService, 
    CurrencyConversionRequest,
    BulkConversionRequest,
    ExchangeRateResponse,
    CurrencyPair,
    create_exchange_service
)
from ..dependencies import get_exchange_rate_service, verify_token

router = APIRouter(prefix="/api/exchange-rates", tags=["Exchange Rates"])
logger = logging.getLogger(__name__)

@router.get("/health")
async def health_check():
    """Exchange rates service health check."""
    return {
        "status": "healthy", 
        "service": "exchange-rates",
        "timestamp": datetime.utcnow()
    }

@router.get("/supported-currencies", response_model=List[str])
async def get_supported_currencies():
    """Get list of supported currencies."""
    return ExchangeRateService.SUPPORTED_CURRENCIES

@router.get("/latest", response_model=Dict[str, Any])
async def get_latest_exchange_rates(
    base_currency: str = Query(default="USD", description="Base currency for exchange rates"),
    exchange_service: ExchangeRateService = Depends(get_exchange_rate_service),
    current_user: dict = Depends(verify_token)
):
    """
    Get latest exchange rates for all supported currencies.
    
    Provides real-time exchange rates from reliable financial data sources.
    Rates are cached for optimal performance and updated frequently.
    """
    try:
        rates = await exchange_service.get_latest_rates(base_currency)
        
        return {
            "base_currency": base_currency,
            "rates": {k: str(v) for k, v in rates.items()},
            "timestamp": datetime.utcnow(),
            "supported_currencies": ExchangeRateService.SUPPORTED_CURRENCIES,
            "rate_count": len(rates)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_latest_exchange_rates: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/convert", response_model=Dict[str, Any])
async def convert_currency(
    conversion_request: CurrencyConversionRequest,
    exchange_service: ExchangeRateService = Depends(get_exchange_rate_service),
    current_user: dict = Depends(verify_token)
):
    """
    Convert amount from one currency to another using current exchange rates.
    
    Provides real-time currency conversion with spread calculation and
    market information for banking simulation purposes.
    """
    try:
        result = await exchange_service.convert_currency(conversion_request)
        
        # Convert Decimal values to strings for JSON serialization
        return {
            "original_amount": str(result["original_amount"]),
            "from_currency": result["from_currency"],
            "to_currency": result["to_currency"],
            "exchange_rate": str(result["exchange_rate"]),
            "converted_amount": str(result["converted_amount"]),
            "spread": str(result["spread"]),
            "is_major_pair": result["is_major_pair"],
            "timestamp": result["timestamp"],
            "provider": result["provider"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in convert_currency: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/bulk-convert", response_model=List[Dict[str, Any]])
async def bulk_convert_currencies(
    bulk_request: BulkConversionRequest,
    background_tasks: BackgroundTasks,
    exchange_service: ExchangeRateService = Depends(get_exchange_rate_service),
    current_user: dict = Depends(verify_token)
):
    """
    Perform bulk currency conversions efficiently.
    
    Optimized for processing multiple conversions with minimal API calls.
    Results include individual conversion details and error handling.
    """
    try:
        results = await exchange_service.bulk_convert_currencies(bulk_request)
        
        # Convert Decimal values to strings for JSON serialization
        serialized_results = []
        for result in results:
            if "error" not in result:
                serialized_result = {
                    "original_amount": str(result["original_amount"]),
                    "from_currency": result["from_currency"],
                    "to_currency": result["to_currency"],
                    "exchange_rate": str(result["exchange_rate"]),
                    "converted_amount": str(result["converted_amount"]),
                    "timestamp": result["timestamp"]
                }
            else:
                serialized_result = result
            
            serialized_results.append(serialized_result)
        
        return serialized_results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk_convert_currencies: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/historical/{target_date}", response_model=Dict[str, Any])
async def get_historical_exchange_rates(
    target_date: date,
    base_currency: str = Query(default="USD", description="Base currency for historical rates"),
    exchange_service: ExchangeRateService = Depends(get_exchange_rate_service),
    current_user: dict = Depends(verify_token)
):
    """
    Get historical exchange rates for a specific date.
    
    Provides exchange rates as they were on the specified date.
    Useful for backtesting and historical analysis.
    """
    try:
        rates = await exchange_service.get_historical_rates(target_date, base_currency)
        
        return {
            "date": target_date.isoformat(),
            "base_currency": base_currency,
            "rates": {k: str(v) for k, v in rates.items()},
            "supported_currencies": ExchangeRateService.SUPPORTED_CURRENCIES,
            "rate_count": len(rates)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_historical_exchange_rates: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/pairs", response_model=List[Dict[str, Any]])
async def get_currency_pairs(
    exchange_service: ExchangeRateService = Depends(get_exchange_rate_service),
    current_user: dict = Depends(verify_token)
):
    """
    Get comprehensive currency pairs data with market information.
    
    Includes exchange rates, 24h changes, and volume data for all supported pairs.
    """
    try:
        pairs_data = await exchange_service.get_currency_pairs_data()
        
        # Serialize the data
        serialized_pairs = []
        for pair in pairs_data:
            serialized_pairs.append({
                "pair": pair.pair,
                "rate": str(pair.rate),
                "timestamp": pair.timestamp,
                "change_24h": str(pair.change_24h) if pair.change_24h else None,
                "volume_24h": str(pair.volume_24h) if pair.volume_24h else None
            })
        
        return serialized_pairs
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_currency_pairs: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/market-summary", response_model=Dict[str, Any])
async def get_market_summary(
    exchange_service: ExchangeRateService = Depends(get_exchange_rate_service),
    current_user: dict = Depends(verify_token)
):
    """
    Get comprehensive market summary with statistics and trends.
    
    Provides market overview including gainers, losers, volume data,
    and major pair information for trading simulation.
    """
    try:
        market_data = await exchange_service.get_market_summary()
        
        # Serialize complex objects
        serialized_market_data = {
            "timestamp": market_data["timestamp"],
            "total_pairs": market_data["total_pairs"],
            "gainers": market_data["gainers"],
            "losers": market_data["losers"],
            "total_volume_24h": str(market_data["total_volume_24h"]),
            "market_status": market_data["market_status"],
            "supported_currencies": market_data["supported_currencies"],
            "top_gainers": [
                {
                    "pair": gainer.pair,
                    "rate": str(gainer.rate),
                    "change_24h": str(gainer.change_24h) if gainer.change_24h else None,
                    "volume_24h": str(gainer.volume_24h) if gainer.volume_24h else None
                }
                for gainer in market_data["top_gainers"]
            ],
            "top_losers": [
                {
                    "pair": loser.pair,
                    "rate": str(loser.rate),
                    "change_24h": str(loser.change_24h) if loser.change_24h else None,
                    "volume_24h": str(loser.volume_24h) if loser.volume_24h else None
                }
                for loser in market_data["top_losers"]
            ],
            "major_pairs": [
                {
                    "pair": major.pair,
                    "rate": str(major.rate),
                    "change_24h": str(major.change_24h) if major.change_24h else None,
                    "volume_24h": str(major.volume_24h) if major.volume_24h else None
                }
                for major in market_data["major_pairs"]
            ]
        }
        
        return serialized_market_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_market_summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/volatility/{currency}")
async def get_currency_volatility(
    currency: str,
    days: int = Query(default=7, ge=1, le=30, description="Number of days for volatility calculation"),
    exchange_service: ExchangeRateService = Depends(get_exchange_rate_service),
    current_user: dict = Depends(verify_token)
):
    """
    Calculate currency volatility over specified period.
    
    Provides volatility metrics useful for risk assessment and trading decisions.
    """
    try:
        if currency not in ExchangeRateService.SUPPORTED_CURRENCIES:
            raise HTTPException(status_code=400, detail=f"Unsupported currency: {currency}")
        
        # Get historical data for volatility calculation
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        # In a real implementation, we would fetch multiple days of data
        # For simulation, we'll provide calculated volatility metrics
        
        # Simulate volatility calculation
        import random
        daily_returns = [random.uniform(-0.05, 0.05) for _ in range(days)]
        volatility = np.std(daily_returns) * np.sqrt(252)  # Annualized volatility
        
        return {
            "currency": currency,
            "period_days": days,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "daily_volatility": round(np.std(daily_returns), 6),
            "annualized_volatility": round(volatility, 6),
            "min_daily_return": round(min(daily_returns), 6),
            "max_daily_return": round(max(daily_returns), 6),
            "avg_daily_return": round(np.mean(daily_returns), 6),
            "volatility_category": "HIGH" if volatility > 0.2 else "MEDIUM" if volatility > 0.1 else "LOW"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_currency_volatility: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Additional endpoints for advanced features
@router.get("/correlation-matrix")
async def get_correlation_matrix(
    currencies: List[str] = Query(default=["USD", "EUR", "GBP", "JPY"], description="Currencies for correlation analysis"),
    exchange_service: ExchangeRateService = Depends(get_exchange_rate_service),
    current_user: dict = Depends(verify_token)
):
    """
    Get currency correlation matrix for risk analysis.
    """
    try:
        # Validate currencies
        for currency in currencies:
            if currency not in ExchangeRateService.SUPPORTED_CURRENCIES:
                raise HTTPException(status_code=400, detail=f"Unsupported currency: {currency}")
        
        # Simulate correlation matrix (in production, calculate from historical data)
        correlation_matrix = {}
        for base_currency in currencies:
            correlation_matrix[base_currency] = {}
            for target_currency in currencies:
                if base_currency == target_currency:
                    correlation_matrix[base_currency][target_currency] = 1.0
                else:
                    # Simulate correlation value
                    correlation = random.uniform(0.1, 0.9)
                    correlation_matrix[base_currency][target_currency] = round(correlation, 3)
        
        return {
            "currencies": currencies,
            "correlation_matrix": correlation_matrix,
            "timestamp": datetime.utcnow(),
            "calculation_period": "30 days"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_correlation_matrix: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")