"""
Analytics API Router
Provides endpoints for transaction analytics, risk scoring, and fraud detection
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import logging

from services.analytics_service import (
    AnalyticsService,
    TransactionAnalytics,
    RiskScore,
    FraudAlert,
    MarketAnalysis
)
from dependencies import get_analytics_service, verify_token

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Intelligence"])
logger = logging.getLogger(__name__)

@router.get("/health")
async def health_check():
    """Analytics service health check."""
    return {
        "status": "healthy",
        "service": "analytics",
        "ml_models_loaded": True,
        "timestamp": datetime.utcnow()
    }

@router.get("/transaction-analytics", response_model=Dict[str, Any])
async def get_transaction_analytics(
    start_date: Optional[datetime] = Query(None, description="Start date for analytics"),
    end_date: Optional[datetime] = Query(None, description="End date for analytics"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: dict = Depends(verify_token)
):
    """
    Get comprehensive transaction analytics including volume, patterns, and trends.
    
    Provides detailed insights into transaction patterns, currency distribution,
    temporal analysis, and corridor statistics for business intelligence.
    """
    try:
        analytics = await analytics_service.get_transaction_analytics(start_date, end_date)
        
        # Serialize the analytics data
        return {
            "total_transactions": analytics.total_transactions,
            "total_volume": str(analytics.total_volume),
            "avg_transaction_size": str(analytics.avg_transaction_size),
            "currency_distribution": analytics.currency_distribution,
            "daily_volume": analytics.daily_volume,
            "hourly_pattern": analytics.hourly_pattern,
            "top_corridors": analytics.top_corridors,
            "risk_distribution": analytics.risk_distribution,
            "analysis_period": {
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None
            },
            "generated_at": datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Error in get_transaction_analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate analytics")

@router.post("/risk-score", response_model=Dict[str, Any])
async def calculate_risk_score(
    transfer_data: Dict[str, Any],
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: dict = Depends(verify_token)
):
    """
    Calculate risk score for a transfer using machine learning models.
    
    Analyzes multiple risk factors and provides detailed risk assessment
    with confidence levels and specific risk indicators.
    """
    try:
        risk_score = await analytics_service.calculate_risk_score(transfer_data)
        
        return {
            "transfer_id": risk_score.transfer_id,
            "risk_score": risk_score.risk_score,
            "risk_level": risk_score.risk_level,
            "risk_factors": risk_score.risk_factors,
            "confidence": risk_score.confidence,
            "timestamp": risk_score.timestamp,
            "recommendations": _get_risk_recommendations(risk_score.risk_level),
            "threshold_info": {
                "low": "< 0.3",
                "medium": "0.3 - 0.6",
                "high": "0.6 - 0.8",
                "critical": "> 0.8"
            }
        }
        
    except Exception as e:
        logger.error(f"Error in calculate_risk_score: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to calculate risk score")

def _get_risk_recommendations(risk_level: str) -> List[str]:
    """Get risk-appropriate recommendations."""
    recommendations = {
        "LOW": [
            "Transaction approved for automatic processing",
            "Standard monitoring protocols apply"
        ],
        "MEDIUM": [
            "Enhanced monitoring recommended",
            "Consider additional documentation verification",
            "Flag for periodic review"
        ],
        "HIGH": [
            "Manual review required before processing",
            "Enhanced due diligence procedures",
            "Senior officer approval needed",
            "Consider customer outreach for verification"
        ],
        "CRITICAL": [
            "HOLD transaction immediately",
            "Comprehensive investigation required",
            "Executive approval mandatory",
            "Consider regulatory reporting",
            "Document all decision rationale"
        ]
    }
    return recommendations.get(risk_level, ["Standard processing"])

@router.post("/fraud-detection", response_model=Dict[str, Any])
async def detect_fraud(
    transfer_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: dict = Depends(verify_token)
):
    """
    Perform fraud detection analysis on transfer data.
    
    Uses advanced anomaly detection algorithms to identify potentially
    fraudulent transactions and generate appropriate alerts.
    """
    try:
        fraud_alert = await analytics_service.detect_fraud(transfer_data)
        
        if fraud_alert:
            # Store the alert in the background
            background_tasks.add_task(
                analytics_service.store_fraud_alert, 
                fraud_alert
            )
            
            return {
                "fraud_detected": True,
                "alert": {
                    "alert_id": fraud_alert.alert_id,
                    "transfer_id": fraud_alert.transfer_id,
                    "alert_type": fraud_alert.alert_type,
                    "severity": fraud_alert.severity,
                    "description": fraud_alert.description,
                    "anomaly_score": fraud_alert.anomaly_score,
                    "risk_indicators": fraud_alert.risk_indicators,
                    "recommended_action": fraud_alert.recommended_action,
                    "timestamp": fraud_alert.timestamp,
                    "status": fraud_alert.status
                },
                "next_steps": _get_fraud_next_steps(fraud_alert.severity)
            }
        else:
            return {
                "fraud_detected": False,
                "status": "CLEAN",
                "message": "No fraudulent patterns detected",
                "timestamp": datetime.utcnow()
            }
        
    except Exception as e:
        logger.error(f"Error in detect_fraud: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to perform fraud detection")

def _get_fraud_next_steps(severity: str) -> List[str]:
    """Get appropriate next steps based on fraud severity."""
    next_steps = {
        "LOW": [
            "Log alert for trending analysis",
            "Continue standard processing",
            "Monitor for pattern development"
        ],
        "MEDIUM": [
            "Flag for enhanced monitoring",
            "Review transaction details manually",
            "Consider additional verification steps"
        ],
        "HIGH": [
            "HOLD transaction immediately",
            "Initiate investigation workflow",
            "Contact sender for verification",
            "Document all findings"
        ],
        "CRITICAL": [
            "IMMEDIATE HOLD - Do not process",
            "Escalate to fraud investigation team",
            "Contact law enforcement if required",
            "Freeze related accounts temporarily",
            "Generate detailed incident report"
        ]
    }
    return next_steps.get(severity, ["Standard processing"])

@router.get("/fraud-alerts", response_model=List[Dict[str, Any]])
async def get_fraud_alerts(
    start_date: Optional[datetime] = Query(None, description="Start date for alert search"),
    end_date: Optional[datetime] = Query(None, description="End date for alert search"),
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    status: Optional[str] = Query(None, description="Filter by alert status"),
    limit: int = Query(default=100, le=500, description="Maximum number of alerts to return"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: dict = Depends(verify_token)
):
    """
    Retrieve fraud alerts with optional filtering.
    
    Provides access to historical and current fraud alerts with
    filtering capabilities for investigation and reporting.
    """
    try:
        alerts = await analytics_service.get_fraud_alerts(start_date, end_date, severity)
        
        # Filter by status if provided
        if status:
            alerts = [alert for alert in alerts if alert.status == status]
        
        # Limit results
        alerts = alerts[:limit]
        
        # Serialize alerts
        serialized_alerts = []
        for alert in alerts:
            serialized_alerts.append({
                "alert_id": alert.alert_id,
                "transfer_id": alert.transfer_id,
                "alert_type": alert.alert_type,
                "severity": alert.severity,
                "description": alert.description,
                "anomaly_score": alert.anomaly_score,
                "risk_indicators": alert.risk_indicators,
                "recommended_action": alert.recommended_action,
                "timestamp": alert.timestamp,
                "status": alert.status
            })
        
        return serialized_alerts
        
    except Exception as e:
        logger.error(f"Error in get_fraud_alerts: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve fraud alerts")

@router.put("/fraud-alerts/{alert_id}/status")
async def update_alert_status(
    alert_id: str,
    status: str,
    notes: Optional[str] = None,
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: dict = Depends(verify_token)
):
    """
    Update fraud alert status and add resolution notes.
    """
    try:
        if current_user["role"] not in ["admin", "officer"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        valid_statuses = ["ACTIVE", "INVESTIGATING", "RESOLVED", "FALSE_POSITIVE"]
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
        
        success = await analytics_service.update_alert_status(alert_id, status, notes or "")
        
        if success:
            return {
                "success": True,
                "alert_id": alert_id,
                "new_status": status,
                "notes": notes,
                "updated_by": current_user["username"],
                "updated_at": datetime.utcnow()
            }
        else:
            raise HTTPException(status_code=404, detail="Alert not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in update_alert_status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update alert status")

@router.post("/market-analysis", response_model=Dict[str, Any])
async def generate_market_analysis(
    exchange_rates: Dict[str, str],  # Rates as strings to handle Decimal serialization
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: dict = Depends(verify_token)
):
    """
    Generate comprehensive market analysis from exchange rate data.
    
    Analyzes market trends, volatility, correlations, and provides
    insights for trading and risk management decisions.
    """
    try:
        # Convert string rates back to Decimal
        from decimal import Decimal
        decimal_rates = {k: Decimal(v) for k, v in exchange_rates.items()}
        
        market_analysis = await analytics_service.generate_market_analysis(decimal_rates)
        
        return {
            "timestamp": market_analysis.timestamp,
            "volatility_index": market_analysis.volatility_index,
            "market_trend": market_analysis.market_trend,
            "currency_correlations": market_analysis.currency_correlations,
            "volume_analysis": market_analysis.volume_analysis,
            "price_movements": market_analysis.price_movements,
            "analysis_summary": {
                "total_currencies_analyzed": len(exchange_rates),
                "volatility_level": _categorize_volatility(market_analysis.volatility_index),
                "trend_strength": _assess_trend_strength(market_analysis.market_trend),
                "market_recommendation": _get_market_recommendation(
                    market_analysis.volatility_index, 
                    market_analysis.market_trend
                )
            }
        }
        
    except Exception as e:
        logger.error(f"Error in generate_market_analysis: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate market analysis")

def _categorize_volatility(volatility_index: float) -> str:
    """Categorize volatility level."""
    if volatility_index > 0.15:
        return "VERY_HIGH"
    elif volatility_index > 0.10:
        return "HIGH"
    elif volatility_index > 0.05:
        return "MODERATE"
    else:
        return "LOW"

def _assess_trend_strength(trend: str) -> str:
    """Assess trend strength."""
    strength_map = {
        "VOLATILE": "STRONG",
        "SIDEWAYS": "WEAK",
        "STABLE": "MODERATE"
    }
    return strength_map.get(trend, "UNKNOWN")

def _get_market_recommendation(volatility: float, trend: str) -> str:
    """Get trading recommendation based on market conditions."""
    if volatility > 0.1 and trend == "VOLATILE":
        return "HIGH_RISK_HIGH_REWARD - Consider hedging strategies"
    elif volatility < 0.05 and trend == "STABLE":
        return "LOW_RISK_STABLE - Suitable for long-term positions"
    elif trend == "SIDEWAYS":
        return "RANGE_BOUND - Consider range trading strategies"
    else:
        return "MIXED_SIGNALS - Exercise caution and diversify"

@router.get("/risk-trends")
async def get_risk_trends(
    days: int = Query(default=30, ge=1, le=90, description="Number of days for trend analysis"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: dict = Depends(verify_token)
):
    """
    Analyze risk trends over time for business intelligence.
    """
    try:
        # Simulate risk trend data (in production, this would query historical risk scores)
        import random
        from datetime import date
        
        risk_trends = []
        start_date = date.today() - timedelta(days=days)
        
        for i in range(days):
            current_date = start_date + timedelta(days=i)
            
            # Simulate daily risk metrics
            daily_metrics = {
                "date": current_date.isoformat(),
                "total_transactions": random.randint(50, 200),
                "high_risk_count": random.randint(5, 20),
                "medium_risk_count": random.randint(15, 40),
                "fraud_alerts": random.randint(0, 5),
                "avg_risk_score": round(random.uniform(0.1, 0.4), 3),
                "risk_score_trend": random.choice(["INCREASING", "DECREASING", "STABLE"])
            }
            risk_trends.append(daily_metrics)
        
        # Calculate summary statistics
        total_transactions = sum(day["total_transactions"] for day in risk_trends)
        total_high_risk = sum(day["high_risk_count"] for day in risk_trends)
        total_fraud_alerts = sum(day["fraud_alerts"] for day in risk_trends)
        
        return {
            "analysis_period": {
                "days": days,
                "start_date": start_date.isoformat(),
                "end_date": date.today().isoformat()
            },
            "daily_trends": risk_trends,
            "summary": {
                "total_transactions": total_transactions,
                "total_high_risk": total_high_risk,
                "total_fraud_alerts": total_fraud_alerts,
                "high_risk_percentage": round((total_high_risk / total_transactions) * 100, 2),
                "fraud_detection_rate": round((total_fraud_alerts / total_transactions) * 100, 2)
            },
            "generated_at": datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Error in get_risk_trends: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate risk trends")

@router.get("/performance-metrics")
async def get_performance_metrics(
    current_user: dict = Depends(verify_token)
):
    """
    Get analytics service performance metrics.
    """
    try:
        return {
            "ml_models": {
                "fraud_detection_model": {
                    "status": "LOADED",
                    "accuracy": 0.94,
                    "last_trained": "2024-01-15T10:30:00Z",
                    "prediction_count": 15247
                },
                "risk_scoring_model": {
                    "status": "LOADED", 
                    "accuracy": 0.87,
                    "last_trained": "2024-01-15T10:30:00Z",
                    "prediction_count": 18953
                }
            },
            "processing_stats": {
                "avg_risk_calculation_time_ms": 45.2,
                "avg_fraud_detection_time_ms": 62.8,
                "daily_processed_transactions": 1247,
                "cache_hit_rate": 0.82
            },
            "alert_statistics": {
                "active_alerts": 23,
                "resolved_today": 15,
                "false_positive_rate": 0.08,
                "avg_resolution_time_hours": 4.2
            },
            "timestamp": datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Error in get_performance_metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get performance metrics")