import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Textarea } from "./components/ui/textarea";
import { Label } from "./components/ui/label";
import { Separator } from "./components/ui/separator";
import { ScrollArea } from "./components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { Checkbox } from "./components/ui/checkbox";
import { Calendar } from "./components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table";
import { 
  Terminal, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  MoreVertical,
  Calendar as CalendarIcon,
  TrendingUp,
  DollarSign,
  Activity,
  Users,
  RefreshCw,
  ChevronDown,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Navigation,
  Truck,
  Building2,
  Globe
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [transfers, setTransfers] = useState([]);
  const [filteredTransfers, setFilteredTransfers] = useState([]);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [selectedTransfers, setSelectedTransfers] = useState([]);
  const [transferForm, setTransferForm] = useState({
    sender_name: '',
    sender_bic: '',
    receiver_name: '',
    receiver_bic: '',
    transfer_type: '',
    amount: '',
    currency: 'USD',
    reference: '',
    purpose: ''
  });
  const [dashboardFilters, setDashboardFilters] = useState({
    search: '',
    status: 'all',
    type: 'all',
    dateFrom: null,
    dateTo: null,
    amountMin: '',
    amountMax: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchUserProfile();
      fetchTransfers();
    }
  }, [token]);

  useEffect(() => {
    applyFilters();
  }, [transfers, dashboardFilters]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
      }
    }
  };

  const fetchTransfers = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API}/transfers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransfers(response.data);
    } catch (error) {
      console.error('Error fetching transfers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transfers];

    // Search filter
    if (dashboardFilters.search) {
      const search = dashboardFilters.search.toLowerCase();
      filtered = filtered.filter(transfer => 
        transfer.sender_name.toLowerCase().includes(search) ||
        transfer.receiver_name.toLowerCase().includes(search) ||
        transfer.sender_bic.toLowerCase().includes(search) ||
        transfer.receiver_bic.toLowerCase().includes(search) ||
        transfer.reference.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (dashboardFilters.status !== 'all') {
      filtered = filtered.filter(transfer => transfer.status === dashboardFilters.status);
    }

    // Type filter
    if (dashboardFilters.type !== 'all') {
      filtered = filtered.filter(transfer => transfer.transfer_type === dashboardFilters.type);
    }

    // Date range filter
    if (dashboardFilters.dateFrom) {
      filtered = filtered.filter(transfer => 
        new Date(transfer.date) >= dashboardFilters.dateFrom
      );
    }
    if (dashboardFilters.dateTo) {
      filtered = filtered.filter(transfer => 
        new Date(transfer.date) <= dashboardFilters.dateTo
      );
    }

    // Amount range filter
    if (dashboardFilters.amountMin) {
      filtered = filtered.filter(transfer => 
        transfer.amount >= parseFloat(dashboardFilters.amountMin)
      );
    }
    if (dashboardFilters.amountMax) {
      filtered = filtered.filter(transfer => 
        transfer.amount <= parseFloat(dashboardFilters.amountMax)
      );
    }

    setFilteredTransfers(filtered);
  };

  const login = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/auth/login`, loginForm);
      const { access_token, user: userData } = response.data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      fetchTransfers();
    } catch (error) {
      alert('Login failed: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  const createTransfer = async (e) => {
    e.preventDefault();
    try {
      const transferData = {
        ...transferForm,
        amount: parseFloat(transferForm.amount)
      };
      
      const response = await axios.post(`${API}/transfers`, transferData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSelectedTransfer(response.data);
      fetchTransfers();
      setTransferForm({
        sender_name: '',
        sender_bic: '',
        receiver_name: '',
        receiver_bic: '',
        transfer_type: '',
        amount: '',
        currency: 'USD',
        reference: '',
        purpose: ''
      });
    } catch (error) {
      alert('Transfer creation failed: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const processAction = async (transferId, action) => {
    try {
      await axios.post(`${API}/transfers/action`, {
        transfer_id: transferId,
        action: action
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchTransfers();
      if (selectedTransfer?.transfer_id === transferId) {
        const updated = await axios.get(`${API}/transfers/${transferId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSelectedTransfer(updated.data);
      }
    } catch (error) {
      alert(`Action failed: ${error.response?.data?.detail || 'Unknown error'}`);
    }
  };

  const processBulkAction = async (action) => {
    if (selectedTransfers.length === 0) {
      alert('Please select transfers to process');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to ${action} ${selectedTransfers.length} transfers?`);
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const promises = selectedTransfers.map(transferId =>
        axios.post(`${API}/transfers/action`, {
          transfer_id: transferId,
          action: action
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      
      await Promise.all(promises);
      setSelectedTransfers([]);
      fetchTransfers();
      alert(`Successfully ${action}ed ${selectedTransfers.length} transfers`);
    } catch (error) {
      alert(`Bulk action failed: ${error.response?.data?.detail || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setDashboardFilters({
      search: '',
      status: 'all',
      type: 'all',
      dateFrom: null,
      dateTo: null,
      amountMin: '',
      amountMax: ''
    });
  };

  const getTransferStats = () => {
    const stats = {
      total: transfers.length,
      pending: transfers.filter(t => t.status === 'pending').length,
      completed: transfers.filter(t => t.status === 'completed').length,
      totalAmount: transfers.reduce((sum, t) => sum + t.amount, 0)
    };
    return stats;
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'outline',
      processing: 'secondary',
      completed: 'default',
      rejected: 'destructive',
      held: 'secondary'
    };
    return <Badge variant={variants[status] || 'outline'}>{status.toUpperCase()}</Badge>;
  };

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'SUCCESS': return 'text-green-400';
      case 'WARNING': return 'text-yellow-400';
      case 'ERROR': return 'text-red-400';
      default: return 'text-blue-400';
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/90 border-slate-700 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Terminal className="h-8 w-8 text-green-400 mr-2" />
              <CardTitle className="text-2xl font-bold text-white">K3RN3L 808</CardTitle>
            </div>
            <CardDescription className="text-slate-400">
              Banking Funds Transfer Training System
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={login} className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-slate-300">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="kompx3"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="K3RN3L808"
                />
              </div>
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                Login to System
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Terminal className="h-6 w-6 text-green-400 mr-2" />
            <h1 className="text-xl font-bold">K3RN3L 808</h1>
            <span className="ml-2 text-sm text-slate-400">Banking Simulation</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-400">
              {user?.full_name} ({user?.role})
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="simulation" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="simulation" className="data-[state=active]:bg-green-600">
              Transfer Simulation
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-green-600">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="tracker" className="data-[state=active]:bg-green-600">
              Transfer Tracker
            </TabsTrigger>
          </TabsList>

          <TabsContent value="simulation" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Transfer Form */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Send className="h-5 w-5 mr-2 text-green-400" />
                    Initiate Transfer
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Create a new SWIFT transfer simulation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={createTransfer} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sender_name" className="text-slate-300">Sender Name</Label>
                        <Input
                          id="sender_name"
                          value={transferForm.sender_name}
                          onChange={(e) => setTransferForm({ ...transferForm, sender_name: e.target.value })}
                          className="bg-slate-700 border-slate-600 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="sender_bic" className="text-slate-300">Sender BIC</Label>
                        <Input
                          id="sender_bic"
                          value={transferForm.sender_bic}
                          onChange={(e) => setTransferForm({ ...transferForm, sender_bic: e.target.value })}
                          className="bg-slate-700 border-slate-600 text-white"
                          placeholder="CHASUS33XXX"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="receiver_name" className="text-slate-300">Receiver Name</Label>
                        <Input
                          id="receiver_name"
                          value={transferForm.receiver_name}
                          onChange={(e) => setTransferForm({ ...transferForm, receiver_name: e.target.value })}
                          className="bg-slate-700 border-slate-600 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="receiver_bic" className="text-slate-300">Receiver BIC</Label>
                        <Input
                          id="receiver_bic"
                          value={transferForm.receiver_bic}
                          onChange={(e) => setTransferForm({ ...transferForm, receiver_bic: e.target.value })}
                          className="bg-slate-700 border-slate-600 text-white"
                          placeholder="DEUTDEFFXXX"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="transfer_type" className="text-slate-300">Transfer Type</Label>
                        <select
                          id="transfer_type"
                          value={transferForm.transfer_type}
                          onChange={(e) => setTransferForm({ ...transferForm, transfer_type: e.target.value })}
                          className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white shadow-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                          required
                        >
                          <option value="">Select type</option>
                          <option value="M0">M0</option>
                          <option value="M1">M1</option>
                          <option value="SWIFT-MT">SWIFT-MT</option>
                          <option value="SWIFT-MX">SWIFT-MX</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="amount" className="text-slate-300">Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          value={transferForm.amount}
                          onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                          className="bg-slate-700 border-slate-600 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="currency" className="text-slate-300">Currency</Label>
                        <Select value={transferForm.currency} onValueChange={(value) => setTransferForm({ ...transferForm, currency: value })}>
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="JPY">JPY</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="reference" className="text-slate-300">Reference</Label>
                      <Input
                        id="reference"
                        value={transferForm.reference}
                        onChange={(e) => setTransferForm({ ...transferForm, reference: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="REF123456789"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="purpose" className="text-slate-300">Purpose</Label>
                      <Textarea
                        id="purpose"
                        value={transferForm.purpose}
                        onChange={(e) => setTransferForm({ ...transferForm, purpose: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="Payment for services..."
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                      <Send className="h-4 w-4 mr-2" />
                      Initiate Transfer
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* SWIFT Terminal */}
              {selectedTransfer && (
                <Card className="bg-black/80 border-green-500/50">
                  <CardHeader>
                    <CardTitle className="flex items-center text-green-400">
                      <Terminal className="h-5 w-5 mr-2" />
                      SWIFT Terminal - {selectedTransfer.transfer_id}
                    </CardTitle>
                    <div className="flex items-center space-x-4">
                      {getStatusBadge(selectedTransfer.status)}
                      <span className="text-xs text-green-400">
                        {selectedTransfer.currency} {selectedTransfer.amount.toLocaleString()}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96 w-full rounded-md border border-green-500/30 p-4 bg-black/50">
                      <div className="font-mono text-sm space-y-1">
                        <div className="text-green-400 mb-2">
                          === K3RN3L 808 SWIFT NETWORK TERMINAL ===
                        </div>
                        {selectedTransfer.swift_logs.map((log, index) => (
                          <div
                            key={index}
                            className={`flex items-start space-x-2 ${getLogLevelColor(log.level)}`}
                          >
                            <span className="text-green-400 text-xs w-20 flex-shrink-0">
                              [{log.timestamp.split(' ')[1]}]
                            </span>
                            <span className="flex-1">{log.message}</span>
                          </div>
                        ))}
                        <div className="text-green-400 mt-4 animate-pulse">
                          ▋ System Ready
                        </div>
                      </div>
                    </ScrollArea>

                    {(user?.role === 'admin' || user?.role === 'officer') && selectedTransfer.status === 'pending' && (
                      <div className="mt-4 flex space-x-2">
                        <Button
                          onClick={() => processAction(selectedTransfer.transfer_id, 'approve')}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => processAction(selectedTransfer.transfer_id, 'hold')}
                          variant="outline"
                          size="sm"
                        >
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Hold
                        </Button>
                        <Button
                          onClick={() => processAction(selectedTransfer.transfer_id, 'reject')}
                          variant="destructive"
                          size="sm"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Dashboard Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Total Transfers</p>
                      <p className="text-2xl font-bold text-white">{getTransferStats().total}</p>
                    </div>
                    <Activity className="h-8 w-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Pending</p>
                      <p className="text-2xl font-bold text-yellow-400">{getTransferStats().pending}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Completed</p>
                      <p className="text-2xl font-bold text-green-400">{getTransferStats().completed}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Total Volume</p>
                      <p className="text-2xl font-bold text-white">
                        ${getTransferStats().totalAmount.toLocaleString()}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Dashboard Controls */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
                      Transfer Management Dashboard
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Advanced filtering and bulk operations
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchTransfers}
                      disabled={isLoading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="h-4 w-4 mr-1" />
                      Filters
                      <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Search and Quick Filters */}
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search transfers by name, BIC, reference..."
                      value={dashboardFilters.search}
                      onChange={(e) => setDashboardFilters({...dashboardFilters, search: e.target.value})}
                      className="pl-10 bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  
                  <select
                    value={dashboardFilters.status}
                    onChange={(e) => setDashboardFilters({...dashboardFilters, status: e.target.value})}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                    <option value="held">Held</option>
                  </select>
                  
                  <select
                    value={dashboardFilters.type}
                    onChange={(e) => setDashboardFilters({...dashboardFilters, type: e.target.value})}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                  >
                    <option value="all">All Types</option>
                    <option value="M0">M0</option>
                    <option value="M1">M1</option>
                    <option value="SWIFT-MT">SWIFT-MT</option>
                    <option value="SWIFT-MX">SWIFT-MX</option>
                  </select>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                  <div className="mb-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-slate-300 text-sm">Amount Min</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={dashboardFilters.amountMin}
                          onChange={(e) => setDashboardFilters({...dashboardFilters, amountMin: e.target.value})}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300 text-sm">Amount Max</Label>
                        <Input
                          type="number"
                          placeholder="999999999"
                          value={dashboardFilters.amountMax}
                          onChange={(e) => setDashboardFilters({...dashboardFilters, amountMax: e.target.value})}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300 text-sm">Date From</Label>
                        <Input
                          type="date"
                          value={dashboardFilters.dateFrom ? dashboardFilters.dateFrom.toISOString().split('T')[0] : ''}
                          onChange={(e) => setDashboardFilters({...dashboardFilters, dateFrom: e.target.value ? new Date(e.target.value) : null})}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300 text-sm">Date To</Label>
                        <Input
                          type="date"
                          value={dashboardFilters.dateTo ? dashboardFilters.dateTo.toISOString().split('T')[0] : ''}
                          onChange={(e) => setDashboardFilters({...dashboardFilters, dateTo: e.target.value ? new Date(e.target.value) : null})}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button variant="outline" size="sm" onClick={clearFilters}>
                        Clear All Filters
                      </Button>
                    </div>
                  </div>
                )}

                {/* Bulk Actions */}
                {selectedTransfers.length > 0 && (user?.role === 'admin' || user?.role === 'officer') && (
                  <div className="mb-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-green-400">
                        {selectedTransfers.length} transfers selected
                      </span>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => processBulkAction('approve')}
                          className="bg-green-600 hover:bg-green-700"
                          disabled={isLoading}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Bulk Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => processBulkAction('hold')}
                          disabled={isLoading}
                        >
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Bulk Hold
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => processBulkAction('reject')}
                          disabled={isLoading}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Bulk Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedTransfers([])}
                        >
                          Clear Selection
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transfers Table */}
                <div className="border border-slate-600 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-700/50 border-slate-600 hover:bg-slate-700/50">
                        {(user?.role === 'admin' || user?.role === 'officer') && (
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedTransfers.length === filteredTransfers.length && filteredTransfers.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedTransfers(filteredTransfers.map(t => t.transfer_id));
                                } else {
                                  setSelectedTransfers([]);
                                }
                              }}
                              className="border-slate-400"
                            />
                          </TableHead>
                        )}
                        <TableHead className="text-slate-300">Transfer ID</TableHead>
                        <TableHead className="text-slate-300">Sender</TableHead>
                        <TableHead className="text-slate-300">Receiver</TableHead>
                        <TableHead className="text-slate-300">Type</TableHead>
                        <TableHead className="text-slate-300">Amount</TableHead>
                        <TableHead className="text-slate-300">Status</TableHead>
                        <TableHead className="text-slate-300">Date</TableHead>
                        <TableHead className="text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransfers.map((transfer) => (
                        <TableRow 
                          key={transfer.transfer_id} 
                          className="border-slate-600 hover:bg-slate-700/30"
                        >
                          {(user?.role === 'admin' || user?.role === 'officer') && (
                            <TableCell>
                              <Checkbox
                                checked={selectedTransfers.includes(transfer.transfer_id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedTransfers([...selectedTransfers, transfer.transfer_id]);
                                  } else {
                                    setSelectedTransfers(selectedTransfers.filter(id => id !== transfer.transfer_id));
                                  }
                                }}
                                className="border-slate-400"
                              />
                            </TableCell>
                          )}
                          <TableCell className="text-white font-mono text-xs">
                            {transfer.transfer_id.substring(0, 8)}...
                          </TableCell>
                          <TableCell className="text-white">
                            <div>
                              <div className="font-medium">{transfer.sender_name}</div>
                              <div className="text-xs text-slate-400">{transfer.sender_bic}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-white">
                            <div>
                              <div className="font-medium">{transfer.receiver_name}</div>
                              <div className="text-xs text-slate-400">{transfer.receiver_bic}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-white">
                            <Badge variant="outline" className="text-xs">
                              {transfer.transfer_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white font-medium">
                            {transfer.currency} {transfer.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(transfer.status)}
                          </TableCell>
                          <TableCell className="text-slate-400 text-sm">
                            {new Date(transfer.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setSelectedTransfer(transfer)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl bg-slate-800 border-slate-700">
                                  <DialogHeader>
                                    <DialogTitle className="text-white flex items-center">
                                      <Terminal className="h-5 w-5 mr-2 text-green-400" />
                                      Transfer Details - {transfer.transfer_id}
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-400">
                                      Complete transfer information and SWIFT logs
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                      <div>
                                        <Label className="text-slate-300">Transfer Information</Label>
                                        <div className="mt-2 space-y-2 text-sm">
                                          <div className="flex justify-between">
                                            <span className="text-slate-400">Amount:</span>
                                            <span className="text-white font-medium">
                                              {transfer.currency} {transfer.amount.toLocaleString()}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-slate-400">Type:</span>
                                            <span className="text-white">{transfer.transfer_type}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-slate-400">Reference:</span>
                                            <span className="text-white font-mono">{transfer.reference}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-slate-400">Status:</span>
                                            {getStatusBadge(transfer.status)}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {(user?.role === 'admin' || user?.role === 'officer') && transfer.status === 'pending' && (
                                        <div className="flex space-x-2">
                                          <Button
                                            onClick={() => processAction(transfer.transfer_id, 'approve')}
                                            className="bg-green-600 hover:bg-green-700"
                                            size="sm"
                                          >
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                            Approve
                                          </Button>
                                          <Button
                                            onClick={() => processAction(transfer.transfer_id, 'hold')}
                                            variant="outline"
                                            size="sm"
                                          >
                                            <AlertCircle className="h-4 w-4 mr-1" />
                                            Hold
                                          </Button>
                                          <Button
                                            onClick={() => processAction(transfer.transfer_id, 'reject')}
                                            variant="destructive"
                                            size="sm"
                                          >
                                            <XCircle className="h-4 w-4 mr-1" />
                                            Reject
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div>
                                      <Label className="text-slate-300">SWIFT Terminal Logs</Label>
                                      <ScrollArea className="h-64 w-full rounded-md border border-green-500/30 p-4 bg-black/50 mt-2">
                                        <div className="font-mono text-sm space-y-1">
                                          {transfer.swift_logs?.map((log, index) => (
                                            <div
                                              key={index}
                                              className={`flex items-start space-x-2 ${getLogLevelColor(log.level)}`}
                                            >
                                              <span className="text-green-400 text-xs w-20 flex-shrink-0">
                                                [{log.timestamp.split(' ')[1]}]
                                              </span>
                                              <span className="flex-1">{log.message}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </ScrollArea>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              
                              {(user?.role === 'admin' || user?.role === 'officer') && transfer.status === 'pending' && (
                                <div className="flex space-x-1">
                                  <Button
                                    onClick={() => processAction(transfer.transfer_id, 'approve')}
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-400 hover:text-green-300"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    onClick={() => processAction(transfer.transfer_id, 'reject')}
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {filteredTransfers.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No transfers found matching your criteria</p>
                      <Button 
                        variant="link" 
                        className="text-green-400 mt-2"
                        onClick={clearFilters}
                      >
                        Clear filters to see all transfers
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracker" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Navigation className="h-5 w-5 mr-2 text-green-400" />
                  Transfer Tracker
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Track transfer progress through detailed stages
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedTransfer ? (
                  <div className="space-y-6">
                    {/* Transfer Header */}
                    <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-slate-400 text-sm">Transfer ID</Label>
                          <p className="font-mono text-white">{selectedTransfer.transfer_id}</p>
                        </div>
                        <div>
                          <Label className="text-slate-400 text-sm">Amount</Label>
                          <p className="text-white font-semibold">
                            {selectedTransfer.currency} {selectedTransfer.amount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <Label className="text-slate-400 text-sm">Status</Label>
                          <div className="mt-1">{getStatusBadge(selectedTransfer.status)}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <Label className="text-slate-400 text-sm">From</Label>
                          <p className="text-white">{selectedTransfer.sender_name}</p>
                          <p className="text-slate-400 text-sm">{selectedTransfer.sender_bic}</p>
                        </div>
                        <div>
                          <Label className="text-slate-400 text-sm">To</Label>
                          <p className="text-white">{selectedTransfer.receiver_name}</p>
                          <p className="text-slate-400 text-sm">{selectedTransfer.receiver_bic}</p>
                        </div>
                      </div>
                    </div>

                    {/* Stage Progress Timeline */}
                    <div className="bg-slate-700/30 rounded-lg p-6 border border-slate-600">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <Clock3 className="h-5 w-5 mr-2 text-green-400" />
                        Transfer Progress Timeline
                      </h3>
                      
                      {selectedTransfer.stages && selectedTransfer.stages.length > 0 ? (
                        <div className="space-y-4">
                          {selectedTransfer.stages.map((stage, index) => {
                            const isActive = index === selectedTransfer.current_stage_index;
                            const isCompleted = stage.status === 'completed';
                            const isPending = stage.status === 'pending';
                            
                            return (
                              <div key={index} className="flex items-start space-x-4">
                                {/* Stage Icon */}
                                <div className="flex-shrink-0 mt-1">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    isCompleted 
                                      ? 'bg-green-600 text-white' 
                                      : isActive 
                                        ? 'bg-yellow-600 text-white animate-pulse'
                                        : 'bg-slate-600 text-slate-400'
                                  }`}>
                                    {isCompleted ? (
                                      <CheckCircle2 className="h-4 w-4" />
                                    ) : isActive ? (
                                      <Clock3 className="h-4 w-4" />
                                    ) : (
                                      <div className="w-2 h-2 rounded-full bg-current" />
                                    )}
                                  </div>
                                </div>
                                
                                {/* Stage Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h4 className={`font-medium ${
                                      isCompleted ? 'text-green-400' : isActive ? 'text-yellow-400' : 'text-slate-400'
                                    }`}>
                                      {stage.stage_name}
                                    </h4>
                                    
                                    {/* Location Badge */}
                                    <div className="flex items-center space-x-2">
                                      <Badge variant="outline" className="text-xs">
                                        {stage.location.replace('_', ' ').toUpperCase()}
                                      </Badge>
                                      {isCompleted && (
                                        <span className="text-xs text-slate-400">
                                          {new Date(stage.timestamp).toLocaleString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <p className="text-sm text-slate-400 mt-1">{stage.description}</p>
                                  
                                  {/* Stage Logs */}
                                  {stage.logs && stage.logs.length > 0 && (
                                    <div className="mt-2 bg-black/50 rounded p-2 font-mono text-xs">
                                      {stage.logs.map((log, logIndex) => (
                                        <div key={logIndex} className={`${getLogLevelColor(log.level)}`}>
                                          [{log.timestamp.split(' ')[1]}] {log.message}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Connection Line */}
                                {index < selectedTransfer.stages.length - 1 && (
                                  <div className="absolute left-4 mt-8 w-px h-4 bg-slate-600"></div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-slate-400 text-center py-8">
                          <Navigation className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No stage information available for this transfer</p>
                        </div>
                      )}
                      
                      {/* Stage Advancement Controls */}
                      {(user?.role === 'admin' || user?.role === 'officer') && 
                       selectedTransfer.current_stage_index < (selectedTransfer.stages?.length - 1 || 0) && (
                        <div className="mt-6 pt-4 border-t border-slate-600">
                          <Button
                            onClick={() => advanceStage(selectedTransfer.transfer_id)}
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={isLoading}
                          >
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Advance to Next Stage
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Transfer Location Map */}
                    <div className="bg-slate-700/30 rounded-lg p-6 border border-slate-600">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <MapPin className="h-5 w-5 mr-2 text-green-400" />
                        Current Location
                      </h3>
                      
                      <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-4">
                        <div className="flex items-center space-x-4">
                          {/* Sending Bank */}
                          <div className="text-center">
                            <Building2 className={`h-8 w-8 mx-auto mb-2 ${
                              selectedTransfer.location === 'sending_bank' ? 'text-green-400' : 'text-slate-500'
                            }`} />
                            <p className="text-sm text-slate-400">Sending Bank</p>
                            <p className="text-xs text-white">{selectedTransfer.sender_bic}</p>
                          </div>
                          
                          <ArrowRight className="text-slate-500" />
                          
                          {/* SWIFT Network */}
                          <div className="text-center">
                            <Globe className={`h-8 w-8 mx-auto mb-2 ${
                              selectedTransfer.location === 'swift_network' ? 'text-green-400' : 'text-slate-500'
                            }`} />
                            <p className="text-sm text-slate-400">SWIFT Network</p>
                            <p className="text-xs text-white">In Transit</p>
                          </div>
                          
                          <ArrowRight className="text-slate-500" />
                          
                          {/* Intermediary Bank */}
                          <div className="text-center">
                            <Truck className={`h-8 w-8 mx-auto mb-2 ${
                              selectedTransfer.location === 'intermediary_bank' ? 'text-green-400' : 'text-slate-500'
                            }`} />
                            <p className="text-sm text-slate-400">Intermediary</p>
                            <p className="text-xs text-white">Correspondent</p>
                          </div>
                          
                          <ArrowRight className="text-slate-500" />
                          
                          {/* Receiving Bank */}
                          <div className="text-center">
                            <Building2 className={`h-8 w-8 mx-auto mb-2 ${
                              selectedTransfer.location === 'receiving_bank' ? 'text-green-400' : 'text-slate-500'
                            }`} />
                            <p className="text-sm text-slate-400">Receiving Bank</p>
                            <p className="text-xs text-white">{selectedTransfer.receiver_bic}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 text-sm text-slate-400">
                        <p><strong>Current Location:</strong> {selectedTransfer.location?.replace('_', ' ').toUpperCase()}</p>
                        {selectedTransfer.estimated_completion && (
                          <p><strong>Estimated Completion:</strong> {new Date(selectedTransfer.estimated_completion).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Navigation className="h-16 w-16 mx-auto mb-4 text-slate-500 opacity-50" />
                    <h3 className="text-lg font-medium text-slate-400 mb-2">Select a Transfer to Track</h3>
                    <p className="text-slate-500 mb-4">Choose a transfer from the dashboard to view detailed stage tracking</p>
                    <Button 
                      onClick={() => {
                        // Auto-select the first pending transfer if available
                        const pendingTransfer = transfers.find(t => t.status !== 'completed');
                        if (pendingTransfer) {
                          setSelectedTransfer(pendingTransfer);
                        }
                      }}
                      variant="outline"
                    >
                      Select Transfer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;