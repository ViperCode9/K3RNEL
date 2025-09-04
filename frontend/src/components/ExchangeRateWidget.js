import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { RefreshCw, TrendingUp, TrendingDown, Activity } from "lucide-react";
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ExchangeRateWidget = ({ token }) => {
  const [rates, setRates] = useState({});
  const [marketSummary, setMarketSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchExchangeRates = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/exchange-rates/latest?base_currency=USD`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRates(response.data.rates);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketSummary = async () => {
    try {
      const response = await axios.get(`${API}/exchange-rates/market-summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMarketSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch market summary:', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchExchangeRates();
      fetchMarketSummary();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(() => {
        fetchExchangeRates();
        fetchMarketSummary();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [token]);

  const majorCurrencies = ['EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];

  const formatRate = (rate) => {
    const numRate = parseFloat(rate);
    return numRate > 1 ? numRate.toFixed(4) : numRate.toFixed(6);
  };

  const getRateChange = () => {
    // Simulate rate changes (in real app, this would be calculated from historical data)
    return (Math.random() - 0.5) * 0.02; // ±1% change
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="terminal-card">
        <CardHeader className="server-panel-header">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="terminal-title text-sm flex items-center">
                <Activity className="h-4 w-4 mr-2 text-green-400" />
                LIVE_EXCHANGE_RATES
              </CardTitle>
              <CardDescription className="text-green-600 font-mono text-xs">
                Real-time currency exchange rates - Updated every 30 seconds
              </CardDescription>
            </div>
            <Button
              onClick={fetchExchangeRates}
              disabled={loading}
              className="terminal-button text-xs px-2 py-1"
              size="sm"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              REFRESH
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-xs text-green-600 font-mono mb-3">
            Base: USD | Last Update: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Loading...'}
          </div>
          
          {/* Major Currency Pairs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {majorCurrencies.map(currency => {
              const rate = rates[currency];
              const change = getRateChange();
              const isPositive = change > 0;
              
              return (
                <div key={currency} className="bg-black/50 border border-green-500/30 rounded p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-green-400 font-mono text-sm font-bold">
                      USD/{currency}
                    </span>
                    <div className="flex items-center space-x-1">
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3 text-green-400" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-400" />
                      )}
                      <span className={`text-xs font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}{(change * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-green-300 font-mono text-lg font-bold">
                    {rate ? formatRate(rate) : '---'}
                  </div>
                  <div className="text-green-600 text-xs font-mono">
                    Spread: {rate ? (parseFloat(rate) * 0.001).toFixed(6) : '---'}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Market Summary */}
      {marketSummary && (
        <Card className="terminal-card">
          <CardHeader className="server-panel-header">
            <CardTitle className="terminal-title text-sm">
              MARKET_OVERVIEW
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="text-center">
                <div className="text-green-600">TOTAL_PAIRS</div>
                <div className="text-green-400 font-bold text-lg">{marketSummary.total_pairs}</div>
              </div>
              <div className="text-center">
                <div className="text-green-600">GAINERS</div>
                <div className="text-green-400 font-bold text-lg">{marketSummary.gainers}</div>
              </div>
              <div className="text-center">
                <div className="text-green-600">LOSERS</div>
                <div className="text-red-400 font-bold text-lg">{marketSummary.losers}</div>
              </div>
              <div className="text-center">
                <div className="text-green-600">STATUS</div>
                <Badge variant="default" className="text-xs">
                  {marketSummary.market_status}
                </Badge>
              </div>
            </div>
            
            {/* Volume Data */}
            <div className="mt-4 pt-4 border-t border-green-500/30">
              <div className="text-green-600 text-xs font-mono mb-2">24H VOLUME</div>
              <div className="text-green-400 font-mono text-sm">
                ${parseFloat(marketSummary.total_volume_24h).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExchangeRateWidget;