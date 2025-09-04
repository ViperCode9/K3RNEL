"""
Analytics Service for Banking Simulation
Provides transaction analytics, risk scoring, and fraud detection
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import DBSCAN
import json
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
import uuid

class TransactionAnalytics(BaseModel):
    """Transaction analytics data model."""
    total_transactions: int
    total_volume: Decimal
    avg_transaction_size: Decimal
    currency_distribution: Dict[str, int]
    daily_volume: List[Dict[str, Any]]
    hourly_pattern: Dict[int, int]
    top_corridors: List[Dict[str, Any]]
    risk_distribution: Dict[str, int]

class RiskScore(BaseModel):
    """Risk score model."""
    transfer_id: str
    risk_score: float = Field(..., ge=0.0, le=1.0)
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    risk_factors: List[str]
    confidence: float = Field(..., ge=0.0, le=1.0)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class FraudAlert(BaseModel):
    """Fraud detection alert model."""
    alert_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transfer_id: str
    alert_type: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    description: str
    anomaly_score: float
    risk_indicators: List[str]
    recommended_action: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: str = "ACTIVE"  # ACTIVE, INVESTIGATING, RESOLVED, FALSE_POSITIVE

class MarketAnalysis(BaseModel):
    """Market analysis data."""
    timestamp: datetime
    volatility_index: float
    market_trend: str  # BULLISH, BEARISH, SIDEWAYS
    currency_correlations: Dict[str, Dict[str, float]]
    volume_analysis: Dict[str, Any]
    price_movements: Dict[str, float]

class AnalyticsService:
    """Advanced analytics service for banking simulation."""
    
    def __init__(self, db_client: AsyncIOMotorClient, db_name: str):
        self.db = db_client[db_name]
        self.logger = logging.getLogger(__name__)
        
        # ML models (in production, these would be loaded from saved models)
        self.fraud_detector = None
        self.risk_scorer = None
        self.scaler = StandardScaler()
        
        # Risk thresholds
        self.risk_thresholds = {
            "LOW": 0.3,
            "MEDIUM": 0.6,
            "HIGH": 0.8,
            "CRITICAL": 0.9
        }
        
        # Initialize ML models
        asyncio.create_task(self._initialize_ml_models())
    
    async def _initialize_ml_models(self):
        """Initialize machine learning models."""
        try:
            # In production, load pre-trained models
            self.fraud_detector = IsolationForest(
                contamination=0.1,
                random_state=42,
                n_estimators=100
            )
            
            self.risk_scorer = RandomForestClassifier(
                n_estimators=100,
                random_state=42,
                class_weight='balanced'
            )
            
            # Train with synthetic data for demonstration
            await self._train_models_with_synthetic_data()
            
            self.logger.info("ML models initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize ML models: {e}")
    
    async def _train_models_with_synthetic_data(self):
        """Train models with synthetic data for demonstration."""
        try:
            # Generate synthetic training data
            n_samples = 1000
            
            # Features: amount, hour, is_weekend, velocity, etc.
            np.random.seed(42)
            features = np.random.rand(n_samples, 8)
            
            # Simulate normal and anomalous patterns
            normal_mask = np.random.rand(n_samples) > 0.1
            features[~normal_mask] *= 3  # Make anomalies more extreme
            
            # Train fraud detector
            self.fraud_detector.fit(features)
            
            # Train risk scorer with synthetic labels
            risk_labels = np.random.choice([0, 1, 2, 3], n_samples, p=[0.6, 0.25, 0.1, 0.05])
            self.risk_scorer.fit(features, risk_labels)
            
            self.logger.info("Models trained with synthetic data")
            
        except Exception as e:
            self.logger.error(f"Failed to train models: {e}")
    
    async def get_transaction_analytics(self, 
                                      start_date: Optional[datetime] = None,
                                      end_date: Optional[datetime] = None) -> TransactionAnalytics:
        """Generate comprehensive transaction analytics."""
        try:
            # Set default date range if not provided
            if not end_date:
                end_date = datetime.utcnow()
            if not start_date:
                start_date = end_date - timedelta(days=30)
            
            # Build query
            query = {
                "date": {
                    "$gte": start_date.isoformat(),
                    "$lte": end_date.isoformat()
                }
            }
            
            # Get all transactions in date range
            transfers = await self.db.transfers.find(query).to_list(None)
            
            if not transfers:
                return TransactionAnalytics(
                    total_transactions=0,
                    total_volume=Decimal('0'),
                    avg_transaction_size=Decimal('0'),
                    currency_distribution={},
                    daily_volume=[],
                    hourly_pattern={},
                    top_corridors=[],
                    risk_distribution={}
                )
            
            # Convert to DataFrame for analysis
            df = pd.DataFrame(transfers)
            
            # Basic statistics
            total_transactions = len(df)
            total_volume = Decimal(str(df['amount'].sum()))
            avg_transaction_size = total_volume / total_transactions if total_transactions > 0 else Decimal('0')
            
            # Currency distribution
            currency_dist = df['currency'].value_counts().to_dict()
            
            # Daily volume analysis
            df['date_only'] = pd.to_datetime(df['date']).dt.date
            daily_volume = []
            for date, group in df.groupby('date_only'):
                daily_volume.append({
                    "date": date.isoformat(),
                    "volume": float(group['amount'].sum()),
                    "count": len(group)
                })
            
            # Hourly pattern analysis
            df['hour'] = pd.to_datetime(df['date']).dt.hour
            hourly_pattern = df['hour'].value_counts().to_dict()
            
            # Top corridors (sender-receiver pairs)
            df['corridor'] = df['sender_bic'] + ' -> ' + df['receiver_bic']
            top_corridors = []
            for corridor, group in df.groupby('corridor'):
                top_corridors.append({
                    "corridor": corridor,
                    "volume": float(group['amount'].sum()),
                    "count": len(group),
                    "avg_amount": float(group['amount'].mean())
                })
            top_corridors = sorted(top_corridors, key=lambda x: x['volume'], reverse=True)[:10]
            
            # Risk distribution (if risk scores exist)
            risk_distribution = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
            # This would be populated from actual risk scores in production
            
            return TransactionAnalytics(
                total_transactions=total_transactions,
                total_volume=total_volume,
                avg_transaction_size=avg_transaction_size,
                currency_distribution=currency_dist,
                daily_volume=daily_volume,
                hourly_pattern=hourly_pattern,
                top_corridors=top_corridors,
                risk_distribution=risk_distribution
            )
            
        except Exception as e:
            self.logger.error(f"Failed to generate transaction analytics: {e}")
            raise
    
    async def calculate_risk_score(self, transfer_data: Dict[str, Any]) -> RiskScore:
        """Calculate risk score for a transfer using ML models."""
        try:
            # Extract features for risk scoring
            features = self._extract_risk_features(transfer_data)
            
            if self.risk_scorer is None:
                await self._initialize_ml_models()
            
            # Scale features
            features_scaled = self.scaler.fit_transform([features])
            
            # Predict risk score
            risk_probabilities = self.risk_scorer.predict_proba(features_scaled)[0]
            risk_class = self.risk_scorer.predict(features_scaled)[0]
            confidence = max(risk_probabilities)
            
            # Convert class to risk level
            risk_levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
            risk_level = risk_levels[min(risk_class, len(risk_levels) - 1)]
            
            # Calculate numerical risk score (0-1)
            risk_score = float(risk_class) / (len(risk_levels) - 1)
            
            # Identify risk factors
            risk_factors = self._identify_risk_factors(transfer_data, features)
            
            return RiskScore(
                transfer_id=transfer_data.get("transfer_id", ""),
                risk_score=risk_score,
                risk_level=risk_level,
                risk_factors=risk_factors,
                confidence=confidence
            )
            
        except Exception as e:
            self.logger.error(f"Failed to calculate risk score: {e}")
            # Return default low risk if calculation fails
            return RiskScore(
                transfer_id=transfer_data.get("transfer_id", ""),
                risk_score=0.1,
                risk_level="LOW",
                risk_factors=["Unable to calculate risk"],
                confidence=0.5
            )
    
    def _extract_risk_features(self, transfer_data: Dict[str, Any]) -> List[float]:
        """Extract numerical features for risk scoring."""
        features = []
        
        # Amount (normalized)
        amount = float(transfer_data.get("amount", 0))
        features.append(min(amount / 1000000, 10.0))  # Cap at 10M for normalization
        
        # Time-based features
        transfer_time = datetime.fromisoformat(transfer_data.get("date", datetime.utcnow().isoformat()))
        features.append(transfer_time.hour / 24.0)  # Hour of day (0-1)
        features.append(transfer_time.weekday() / 6.0)  # Day of week (0-1)
        
        # Currency risk (major vs minor currencies)
        major_currencies = ["USD", "EUR", "GBP", "JPY", "CHF"]
        currency = transfer_data.get("currency", "USD")
        features.append(1.0 if currency in major_currencies else 0.0)
        
        # Transfer type risk
        transfer_type = transfer_data.get("transfer_type", "")
        high_risk_types = ["SWIFT-MT", "SWIFT-MX"]
        features.append(1.0 if transfer_type in high_risk_types else 0.0)
        
        # Geographic risk (simplified - based on BIC patterns)
        sender_bic = transfer_data.get("sender_bic", "")
        receiver_bic = transfer_data.get("receiver_bic", "")
        
        # High-risk country codes (simplified example)
        high_risk_countries = ["XX", "YY", "ZZ"]  # Placeholder
        sender_country = sender_bic[4:6] if len(sender_bic) >= 6 else "US"
        receiver_country = receiver_bic[4:6] if len(receiver_bic) >= 6 else "US"
        
        features.append(1.0 if sender_country in high_risk_countries else 0.0)
        features.append(1.0 if receiver_country in high_risk_countries else 0.0)
        
        # Cross-border indicator
        features.append(1.0 if sender_country != receiver_country else 0.0)
        
        return features
    
    def _identify_risk_factors(self, transfer_data: Dict[str, Any], features: List[float]) -> List[str]:
        """Identify specific risk factors based on transfer data."""
        risk_factors = []
        
        amount = float(transfer_data.get("amount", 0))
        if amount > 100000:
            risk_factors.append("High value transaction")
        
        transfer_time = datetime.fromisoformat(transfer_data.get("date", datetime.utcnow().isoformat()))
        if transfer_time.hour < 6 or transfer_time.hour > 22:
            risk_factors.append("Off-hours transaction")
        
        if transfer_time.weekday() >= 5:  # Weekend
            risk_factors.append("Weekend transaction")
        
        currency = transfer_data.get("currency", "USD")
        minor_currencies = ["PLN", "CZK", "HUF", "RUB"]
        if currency in minor_currencies:
            risk_factors.append("Minor currency")
        
        transfer_type = transfer_data.get("transfer_type", "")
        if "SWIFT" in transfer_type:
            risk_factors.append("SWIFT network transfer")
        
        # Add geographic risk factors
        sender_bic = transfer_data.get("sender_bic", "")
        receiver_bic = transfer_data.get("receiver_bic", "")
        if len(sender_bic) >= 6 and len(receiver_bic) >= 6:
            if sender_bic[4:6] != receiver_bic[4:6]:
                risk_factors.append("Cross-border transaction")
        
        return risk_factors
    
    async def detect_fraud(self, transfer_data: Dict[str, Any]) -> Optional[FraudAlert]:
        """Detect potential fraud using anomaly detection."""
        try:
            # Extract features for fraud detection
            features = self._extract_risk_features(transfer_data)
            
            if self.fraud_detector is None:
                await self._initialize_ml_models()
            
            # Predict anomaly
            anomaly_score = self.fraud_detector.decision_function([features])[0]
            is_anomaly = self.fraud_detector.predict([features])[0] == -1
            
            if is_anomaly:
                # Determine severity based on anomaly score
                normalized_score = abs(anomaly_score)
                if normalized_score > 0.7:
                    severity = "CRITICAL"
                elif normalized_score > 0.5:
                    severity = "HIGH"
                elif normalized_score > 0.3:
                    severity = "MEDIUM"
                else:
                    severity = "LOW"
                
                # Determine alert type and description
                alert_type, description, indicators, action = self._analyze_anomaly(
                    transfer_data, features, normalized_score
                )
                
                return FraudAlert(
                    transfer_id=transfer_data.get("transfer_id", ""),
                    alert_type=alert_type,
                    severity=severity,
                    description=description,
                    anomaly_score=normalized_score,
                    risk_indicators=indicators,
                    recommended_action=action
                )
            
            return None
            
        except Exception as e:
            self.logger.error(f"Failed to detect fraud: {e}")
            return None
    
    def _analyze_anomaly(self, transfer_data: Dict[str, Any], 
                        features: List[float], 
                        anomaly_score: float) -> Tuple[str, str, List[str], str]:
        """Analyze the type of anomaly detected."""
        amount = float(transfer_data.get("amount", 0))
        currency = transfer_data.get("currency", "USD")
        
        # Determine alert type
        if amount > 500000:
            alert_type = "HIGH_VALUE_ANOMALY"
            description = f"Unusually high transaction amount: {currency} {amount:,.2f}"
            action = "Manual review required - verify transaction legitimacy"
        elif features[1] < 0.25 or features[1] > 0.92:  # Off hours
            alert_type = "TIMING_ANOMALY"
            description = "Transaction during unusual hours"
            action = "Verify with sender - confirm transaction authorization"
        else:
            alert_type = "PATTERN_ANOMALY"
            description = "Transaction pattern deviates from normal behavior"
            action = "Enhanced due diligence recommended"
        
        # Risk indicators
        indicators = []
        if amount > 100000:
            indicators.append("High transaction amount")
        if features[2] >= 0.8:  # Weekend
            indicators.append("Weekend transaction")
        if features[4] == 1.0:  # High-risk transfer type
            indicators.append("High-risk transfer method")
        if features[7] == 1.0:  # Cross-border
            indicators.append("Cross-border transaction")
        
        return alert_type, description, indicators, action
    
    async def generate_market_analysis(self, exchange_rates: Dict[str, Decimal]) -> MarketAnalysis:
        """Generate market analysis from exchange rate data."""
        try:
            # Calculate volatility index (simplified)
            rates_array = np.array([float(rate) for rate in exchange_rates.values()])
            volatility_index = float(np.std(rates_array) / np.mean(rates_array))
            
            # Determine market trend (simplified)
            if volatility_index > 0.1:
                trend = "VOLATILE"
            elif volatility_index > 0.05:
                trend = "SIDEWAYS"
            else:
                trend = "STABLE"
            
            # Calculate currency correlations (simplified)
            correlations = {}
            major_currencies = ["USD", "EUR", "GBP", "JPY"]
            
            for base_curr in major_currencies:
                correlations[base_curr] = {}
                for target_curr in major_currencies:
                    if base_curr != target_curr:
                        # Simplified correlation calculation
                        base_rate = float(exchange_rates.get(base_curr, 1.0))
                        target_rate = float(exchange_rates.get(target_curr, 1.0))
                        correlation = abs(base_rate - target_rate) / max(base_rate, target_rate)
                        correlations[base_curr][target_curr] = round(1.0 - correlation, 3)
            
            # Volume analysis (simulated)
            volume_analysis = {
                "total_volume": sum(float(rate) * 1000000 for rate in exchange_rates.values()),
                "top_volume_pairs": [
                    {"pair": "EURUSD", "volume": 2500000000},
                    {"pair": "GBPUSD", "volume": 1800000000},
                    {"pair": "USDJPY", "volume": 1600000000}
                ]
            }
            
            # Price movements (24h change simulation)
            price_movements = {}
            for currency, rate in exchange_rates.items():
                if currency != "USD":
                    # Simulate 24h change
                    change = np.random.uniform(-0.03, 0.03)
                    price_movements[currency] = round(change, 4)
            
            return MarketAnalysis(
                timestamp=datetime.utcnow(),
                volatility_index=volatility_index,
                market_trend=trend,
                currency_correlations=correlations,
                volume_analysis=volume_analysis,
                price_movements=price_movements
            )
            
        except Exception as e:
            self.logger.error(f"Failed to generate market analysis: {e}")
            raise
    
    async def get_fraud_alerts(self, 
                              start_date: Optional[datetime] = None,
                              end_date: Optional[datetime] = None,
                              severity: Optional[str] = None) -> List[FraudAlert]:
        """Retrieve fraud alerts with optional filtering."""
        try:
            query = {}
            
            if start_date or end_date:
                query["timestamp"] = {}
                if start_date:
                    query["timestamp"]["$gte"] = start_date
                if end_date:
                    query["timestamp"]["$lte"] = end_date
            
            if severity:
                query["severity"] = severity
            
            alerts = await self.db.fraud_alerts.find(query).sort("timestamp", -1).to_list(100)
            return [FraudAlert(**alert) for alert in alerts]
            
        except Exception as e:
            self.logger.error(f"Failed to retrieve fraud alerts: {e}")
            return []
    
    async def store_fraud_alert(self, alert: FraudAlert) -> bool:
        """Store fraud alert in database."""
        try:
            await self.db.fraud_alerts.insert_one(alert.dict())
            return True
        except Exception as e:
            self.logger.error(f"Failed to store fraud alert: {e}")
            return False
    
    async def update_alert_status(self, alert_id: str, status: str, notes: str = "") -> bool:
        """Update fraud alert status."""
        try:
            result = await self.db.fraud_alerts.update_one(
                {"alert_id": alert_id},
                {
                    "$set": {
                        "status": status,
                        "resolution_notes": notes,
                        "resolved_at": datetime.utcnow()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            self.logger.error(f"Failed to update alert status: {e}")
            return False