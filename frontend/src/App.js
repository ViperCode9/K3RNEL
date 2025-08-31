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
  ChevronDown
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
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle>Transfer Dashboard</CardTitle>
                <CardDescription className="text-slate-400">
                  Manage and monitor all transfers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transfers.map((transfer) => (
                    <Card
                      key={transfer.transfer_id}
                      className="bg-slate-700/50 border-slate-600 cursor-pointer hover:bg-slate-700/70 transition-colors"
                      onClick={() => setSelectedTransfer(transfer)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div>
                              <div className="font-medium text-white">
                                {transfer.sender_name} → {transfer.receiver_name}
                              </div>
                              <div className="text-sm text-slate-400">
                                {transfer.sender_bic} → {transfer.receiver_bic}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="font-medium text-white">
                                {transfer.currency} {transfer.amount.toLocaleString()}
                              </div>
                              <div className="text-sm text-slate-400">
                                {transfer.transfer_type}
                              </div>
                            </div>
                            {getStatusBadge(transfer.status)}
                            <div className="text-xs text-slate-400">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {new Date(transfer.date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;