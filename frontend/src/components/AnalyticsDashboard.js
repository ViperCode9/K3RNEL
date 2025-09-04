import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { 
  BarChart, 
  TrendingUp, 
  AlertTriangle, 
  Shield, 
  Activity,
  DollarSign,
  Users,
  FileText,
  Eye,
  RefreshCw
} from "lucide-react";
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AnalyticsDashboard = ({ token }) => {
  const [analytics, setAnalytics] = useState(null);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [riskTrends, setRiskTrends] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/analytics/transaction-analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFraudAlerts = async () => {
    try {
      const response = await axios.get(`${API}/analytics/fraud-alerts?limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFraudAlerts(response.data);
    } catch (error) {
      console.error('Failed to fetch fraud alerts:', error);
    }
  };

  const fetchRiskTrends = async () => {
    try {
      const response = await axios.get(`${API}/analytics/risk-trends?days=${selectedTimeframe}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRiskTrends(response.data);
    } catch (error) {
      console.error('Failed to fetch risk trends:', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAnalytics();
      fetchFraudAlerts();
      fetchRiskTrends();
    }
  }, [token, selectedTimeframe]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-400 bg-red-900/20 border-red-500';
      case 'HIGH': return 'text-orange-400 bg-orange-900/20 border-orange-500';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500';
      case 'LOW': return 'text-green-400 bg-green-900/20 border-green-500';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500';
    }
  };

  if (!analytics && loading) {
    return (
      <div className="terminal-card p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-green-400 mr-2" />
          <span className="text-green-400 font-mono">LOADING ANALYTICS ENGINE...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="terminal-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 font-mono text-xs">TOTAL_VOLUME</p>
                <p className="text-xl font-bold text-green-400 font-mono">
                  €{analytics ? parseFloat(analytics.total_volume).toLocaleString() : '0'}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
            <div className="mt-2">
              <div className="h-1 bg-black border border-green-500">
                <div className="h-full bg-green-500" style={{ width: '85%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="terminal-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 font-mono text-xs">TRANSACTIONS</p>
                <p className="text-xl font-bold text-green-400 font-mono">
                  {analytics ? analytics.total_transactions.toLocaleString() : '0'}
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-400" />
            </div>
            <div className="mt-2">
              <div className="h-1 bg-black border border-green-500">
                <div className="h-full bg-green-500" style={{ width: '92%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="terminal-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 font-mono text-xs">AVG_AMOUNT</p>
                <p className="text-xl font-bold text-green-400 font-mono">
                  €{analytics ? parseFloat(analytics.avg_transaction_size).toLocaleString() : '0'}
                </p>
              </div>
              <BarChart className="h-8 w-8 text-green-400" />
            </div>
            <div className="mt-2">
              <div className="h-1 bg-black border border-green-500">
                <div className="h-full bg-green-500" style={{ width: '78%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="terminal-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 font-mono text-xs">HIGH_RISK</p>
                <p className="text-xl font-bold text-orange-400 font-mono">
                  {riskTrends ? riskTrends.summary.total_high_risk : '0'}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-400" />
            </div>
            <div className="mt-2">
              <div className="h-1 bg-black border border-orange-500">
                <div className="h-full bg-orange-500" style={{ width: '15%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Analytics */}
      {analytics && (
        <Card className="terminal-card">
          <CardHeader className="server-panel-header">
            <div className="flex items-center justify-between">
              <CardTitle className="terminal-title text-sm">
                TRANSACTION_ANALYTICS
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                  <SelectTrigger className="terminal-input text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="90">90 Days</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={fetchAnalytics}
                  disabled={loading}
                  className="terminal-button text-xs px-2 py-1"
                  size="sm"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  REFRESH
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {/* Currency Distribution */}
            <div className="mb-6">
              <h4 className="text-green-400 font-mono text-sm mb-3">CURRENCY_DISTRIBUTION</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(analytics.currency_distribution).map(([currency, count]) => (
                  <div key={currency} className="bg-black/50 border border-green-500/30 rounded p-2">
                    <div className="text-green-400 font-mono text-xs">{currency}</div>
                    <div className="text-green-300 font-mono text-lg">{count}</div>
                    <div className="text-green-600 text-xs">
                      {((count / analytics.total_transactions) * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Corridors */}
            <div>
              <h4 className="text-green-400 font-mono text-sm mb-3">TOP_CORRIDORS</h4>
              <div className="space-y-2">
                {analytics.top_corridors.slice(0, 5).map((corridor, index) => (
                  <div key={index} className="flex items-center justify-between bg-black/30 border border-green-500/20 rounded p-2">
                    <div className="text-green-400 font-mono text-xs">
                      {corridor.corridor}
                    </div>
                    <div className="text-right">
                      <div className="text-green-300 font-mono text-sm">
                        €{corridor.volume.toLocaleString()}
                      </div>
                      <div className="text-green-600 text-xs">
                        {corridor.count} transfers
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fraud Detection Center */}
      <Card className="terminal-card">
        <CardHeader className="server-panel-header">
          <CardTitle className="terminal-title text-sm flex items-center">
            <Shield className="h-4 w-4 mr-2 text-red-400" />
            FRAUD_DETECTION_CENTER
          </CardTitle>
          <CardDescription className="text-green-600 font-mono text-xs">
            Real-time fraud monitoring and alert management
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {fraudAlerts.length > 0 ? (
            <div className="space-y-3">
              {fraudAlerts.slice(0, 5).map((alert) => (
                <div 
                  key={alert.alert_id} 
                  className={`border rounded-lg p-3 ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {alert.alert_type}
                      </Badge>
                      <Badge variant="destructive" className="text-xs">
                        {alert.severity}
                      </Badge>
                    </div>
                    <div className="text-xs font-mono">
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm mb-2">{alert.description}</div>
                  <div className="text-xs">
                    <strong>Transfer:</strong> {alert.transfer_id} | 
                    <strong> Score:</strong> {alert.anomaly_score.toFixed(3)} |
                    <strong> Action:</strong> {alert.recommended_action}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <div className="text-green-400 font-mono">NO ACTIVE FRAUD ALERTS</div>
              <div className="text-green-600 text-xs mt-2">All transactions appear legitimate</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Analysis */}
      {riskTrends && (
        <Card className="terminal-card">
          <CardHeader className="server-panel-header">
            <CardTitle className="terminal-title text-sm flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-orange-400" />
              RISK_ANALYSIS_TRENDS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-green-600 font-mono text-xs">HIGH_RISK_RATE</div>
                <div className="text-orange-400 font-mono text-lg font-bold">
                  {riskTrends.summary.high_risk_percentage}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-green-600 font-mono text-xs">FRAUD_DETECTION</div>
                <div className="text-red-400 font-mono text-lg font-bold">
                  {riskTrends.summary.fraud_detection_rate}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-green-600 font-mono text-xs">TOTAL_ALERTS</div>
                <div className="text-yellow-400 font-mono text-lg font-bold">
                  {riskTrends.summary.total_fraud_alerts}
                </div>
              </div>
              <div className="text-center">
                <div className="text-green-600 font-mono text-xs">PROCESSED</div>
                <div className="text-green-400 font-mono text-lg font-bold">
                  {riskTrends.summary.total_transactions}
                </div>
              </div>
            </div>

            {/* Recent Risk Trend */}
            <div>
              <h4 className="text-green-400 font-mono text-sm mb-3">RECENT_ACTIVITY</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {riskTrends.daily_trends.slice(-5).map((trend, index) => (
                  <div key={index} className="flex items-center justify-between bg-black/30 border border-green-500/20 rounded p-2">
                    <div className="text-green-400 font-mono text-xs">
                      {trend.date}
                    </div>
                    <div className="flex items-center space-x-4 text-xs font-mono">
                      <span className="text-green-300">
                        {trend.total_transactions} txns
                      </span>
                      <span className="text-orange-400">
                        {trend.high_risk_count} high-risk
                      </span>
                      <span className="text-red-400">
                        {trend.fraud_alerts} alerts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsDashboard;