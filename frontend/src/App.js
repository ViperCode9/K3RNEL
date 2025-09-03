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
    currency: 'EUR',
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
  const [showTerminalPopup, setShowTerminalPopup] = useState(false);
  const [terminalTransfer, setTerminalTransfer] = useState(null);
  const [showConnectionSequence, setShowConnectionSequence] = useState(false);
  const [connectionStep, setConnectionStep] = useState(0);
  const [connectionLogs, setConnectionLogs] = useState([]);
  const [showCliTerminal, setShowCliTerminal] = useState(false);
  const [cliCommand, setCliCommand] = useState('');
  const [cliHistory, setCliHistory] = useState([]);
  const [cliOutput, setCliOutput] = useState([]);
  const [networkStatus, setNetworkStatus] = useState(null);
  const [serverPerformance, setServerPerformance] = useState(null);
  const [securityIncidents, setSecurityIncidents] = useState([]);

  useEffect(() => {
    if (token) {
      fetchUserProfile();
      fetchTransfers();
      fetchNetworkStatus();
      fetchServerPerformance();
      fetchSecurityIncidents();
      
      // Set up real-time monitoring
      const interval = setInterval(() => {
        fetchNetworkStatus();
        fetchServerPerformance();
      }, 5000); // Update every 5 seconds
      
      return () => clearInterval(interval);
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
      
      // Start connection sequence
      setShowConnectionSequence(true);
      await simulateConnectionSequence();
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      fetchTransfers();
    } catch (error) {
      alert('Login failed: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const simulateConnectionSequence = async () => {
    const steps = [
      { step: 0, message: ">>> INITIALIZING SECURE BANKING NETWORK CONNECTION", pipeline: "LOCAL_AUTH", delay: 1000, progress: 5 },
      { step: 1, message: ">>> RESOLVING SWIFT GLOBAL NETWORK ENDPOINTS", pipeline: "DNS_RESOLVER", delay: 1500, progress: 10 },
      { step: 2, message: "PING swift.com (195.35.171.130): 64 bytes icmp_seq=1 ttl=56 time=8.2ms", pipeline: "NETWORK_TEST", delay: 1000, progress: 18 },
      { step: 3, message: "PING swift.com (195.35.171.130): 64 bytes icmp_seq=2 ttl=56 time=7.8ms", pipeline: "NETWORK_TEST", delay: 1000, progress: 25 },
      { step: 4, message: "PING swift.com (195.35.171.130): 64 bytes icmp_seq=3 ttl=56 time=8.1ms", pipeline: "NETWORK_TEST", delay: 1000, progress: 32 },
      { step: 5, message: "NETWORK DIAGNOSTICS: RTT min/avg/max = 7.8/8.0/8.2ms | JITTER: 0.2ms", pipeline: "NETWORK_ANALYSIS", delay: 1500, progress: 40 },
      { step: 6, message: ">>> ESTABLISHING TLS 1.3 TUNNEL TO SWIFT ALLIANCE GATEWAY", pipeline: "TLS_HANDSHAKE", delay: 2000, progress: 50 },
      { step: 7, message: "PKI CERTIFICATE CHAIN VALIDATION: [PASSED] X.509v3 RSA-4096", pipeline: "PKI_VALIDATION", delay: 1500, progress: 60 },
      { step: 8, message: "HSM SECURITY MODULE STATUS: [ONLINE] | KEY_ROTATION: CURRENT", pipeline: "HSM_SECURITY", delay: 1500, progress: 68 },
      { step: 9, message: ">>> AUTHENTICATING WITH SWIFT ALLIANCE CONNECT v7.0.12", pipeline: "SWIFT_AUTH", delay: 2000, progress: 76 },
      { step: 10, message: "SESSION_ID: SES-20250903-061847-FUNDTRANS-K3RN3L808", pipeline: "SESSION_MGR", delay: 1000, progress: 82 },
      { step: 11, message: "FIN MESSAGE QUEUE: [READY] | MT_PARSER: [LOADED] | UETR_GEN: [ACTIVE]", pipeline: "MESSAGE_ENGINE", delay: 1500, progress: 88 },
      { step: 12, message: "SWIFT NETWORK ACCESS GRANTED | CORRESPONDENT_BANKS: 11,254 ACTIVE", pipeline: "NETWORK_ACCESS", delay: 1500, progress: 94 },
      { step: 13, message: ">>> LOADING BANKING MODULES: LEDGER | AML | COMPLIANCE | REPORTING", pipeline: "MODULE_LOADER", delay: 1500, progress: 98 },
      { step: 14, message: "FUNDTRANS SERVER v8.08 CONNECTION ESTABLISHED | STATUS: READY", pipeline: "SYSTEM_READY", delay: 1000, progress: 100 }
    ];

    let totalTime = 0;
    for (let i = 0; i < steps.length; i++) {
      setConnectionStep(i);
      setConnectionLogs(prev => [...prev, {
        message: steps[i].message,
        pipeline: steps[i].pipeline,
        timestamp: new Date().toLocaleTimeString(),
        progress: steps[i].progress
      }]);
      
      totalTime += steps[i].delay;
      await new Promise(resolve => setTimeout(resolve, steps[i].delay));
    }
    
    // Ensure exactly 22 seconds total
    const remainingTime = Math.max(0, 22000 - totalTime);
    if (remainingTime > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingTime));
    }
    
    setShowConnectionSequence(false);
    setConnectionLogs([]);
    setConnectionStep(0);
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
        currency: 'EUR',
        reference: '',
        purpose: ''
      });
      
      // Show terminal popup for the new transfer
      setTerminalTransfer(response.data);
      setShowTerminalPopup(true);
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

  const advanceStage = async (transferId) => {
    if (!transferId) return;
    
    setIsLoading(true);
    try {
      await axios.post(`${API}/transfers/advance-stage`, {
        transfer_id: transferId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh transfers and update selected transfer
      fetchTransfers();
      const updated = await axios.get(`${API}/transfers/${transferId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedTransfer(updated.data);
      
      alert('Transfer stage advanced successfully');
    } catch (error) {
      alert(`Stage advancement failed: ${error.response?.data?.detail || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNetworkStatus = async () => {
    try {
      const response = await axios.get(`${API}/network/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNetworkStatus(response.data);
    } catch (error) {
      console.error('Error fetching network status:', error);
    }
  };

  const fetchServerPerformance = async () => {
    try {
      const response = await axios.get(`${API}/server/performance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setServerPerformance(response.data);
    } catch (error) {
      console.error('Error fetching server performance:', error);
    }
  };

  const fetchSecurityIncidents = async () => {
    try {
      const response = await axios.get(`${API}/security/incidents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSecurityIncidents(response.data);
    } catch (error) {
      console.error('Error fetching security incidents:', error);
    }
  };

  const executeCliCommand = async (command) => {
    if (!command.trim()) return;
    
    try {
      const response = await axios.post(`${API}/cli/execute`, {
        command: command
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCliHistory(prev => [...prev, `$ ${command}`]);
      setCliOutput(prev => [...prev, ...response.data.output]);
      setCliCommand('');
    } catch (error) {
      setCliOutput(prev => [...prev, `Error: ${error.response?.data?.detail || 'Command failed'}`]);
    }
  };

  const simulateSecurityIncident = async (incidentType) => {
    try {
      const response = await axios.post(`${API}/security/simulate?incident_type=${incidentType}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(`Security incident simulated: ${response.data.message}`);
      fetchSecurityIncidents();
    } catch (error) {
      alert(`Simulation failed: ${error.response?.data?.detail || 'Unknown error'}`);
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
      <div className="min-h-screen flex items-center justify-center p-6 terminal-scanlines">
        <Card className="w-full max-w-2xl bg-black border-2 border-green-500 shadow-2xl">
          <CardHeader className="text-center p-8 border-b-2 border-green-500 bg-black">
            <div className="ascii-art mb-6 text-green-500" style={{ fontSize: '9px', lineHeight: '1.1' }}>
{`
███████╗██╗   ██╗███╗   ██╗██████╗ ████████╗██████╗  █████╗ ███╗   ██╗███████╗
██╔════╝██║   ██║████╗  ██║██╔══██╗╚══██╔══╝██╔══██╗██╔══██╗████╗  ██║██╔════╝
█████╗  ██║   ██║██╔██╗ ██║██║  ██║   ██║   ██████╔╝███████║██╔██╗ ██║███████╗
██╔══╝  ██║   ██║██║╚██╗██║██║  ██║   ██║   ██╔══██╗██╔══██║██║╚██╗██║╚════██║
██║     ╚██████╔╝██║ ╚████║██████╔╝   ██║   ██║  ██║██║  ██║██║ ╚████║███████║
╚═╝      ╚═════╝ ╚═╝  ╚═══╝╚═════╝    ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝
`}
            </div>
            <CardTitle className="text-2xl font-bold terminal-title mb-4">
              SERVER FUND TRANSFER TERMINAL
            </CardTitle>
            <CardDescription className="text-orange-500 font-mono text-sm space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <div className="server-status online"></div>
                <span>SECURE BANKING NETWORK :: AUTHENTICATED ACCESS REQUIRED</span>
              </div>
              <div className="text-green-600 text-xs">
                FUNDTRANS v8.08 | SWIFT GLOBAL NETWORK | PRODUCTION ENVIRONMENT
              </div>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-8 bg-black">
            <form onSubmit={login} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="username" className="text-orange-500 font-mono text-sm font-bold flex items-center">
                  <span className="mr-2">$</span> USER_ID:
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="terminal-input text-base h-12"
                  placeholder="kompx3"
                  required
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="password" className="text-orange-500 font-mono text-sm font-bold flex items-center">
                  <span className="mr-2">$</span> AUTH_TOKEN:
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="terminal-input text-base h-12"
                  placeholder="K3RN3L808"
                  required
                />
              </div>
              
              <Button type="submit" className="w-full terminal-button h-14 text-base font-bold mt-8">
                <span className="flex items-center justify-center space-x-2">
                  <span>&gt;&gt;&gt;</span>
                  <span>ESTABLISH SECURE CONNECTION</span>
                  <span>&lt;&lt;&lt;</span>
                </span>
              </Button>
            </form>
            
            <div className="mt-6 p-4 bg-black border border-green-500 rounded">
              <div className="text-xs font-mono space-y-1">
                <div className="text-green-600">
                  [SYSTEM] Waiting for authentication<span className="terminal-cursor animate-pulse">_</span>
                </div>
                <div className="text-orange-500">
                  [NETWORK] SWIFT Global Network: ONLINE
                </div>
                <div className="text-green-600">
                  [SECURITY] HSM Security Module: READY
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-green-400 terminal-scanlines">
      <header className="border-b border-green-500 bg-black">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <div className="server-status online"></div>
            <Terminal className="h-5 w-5 text-green-400 mr-2" />
            <h1 className="text-xl font-bold terminal-title">K3RN3L - 808</h1>
            <span className="ml-3 text-xs text-green-600 font-mono">:: SWIFT_NETWORK: ONLINE</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs text-green-400 font-mono">
              USR: {user?.username} | LVL: {user?.role?.toUpperCase()} | SID: {user?.id?.substring(0,8)}
            </span>
            <Button 
              onClick={() => setShowCliTerminal(true)}
              className="terminal-button text-xs px-2 py-1"
              size="sm"
            >
              CLI_TERM
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={logout}
              className="terminal-button text-xs px-2 py-1"
            >
              {">> LOGOUT"}
            </Button>
          </div>
        </div>
        <div className="load-bar"></div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="simulation" className="space-y-6">
          <TabsList className="bg-black border-green-500">
            <TabsTrigger 
              value="simulation" 
              className="data-[state=active]:bg-green-900/20 data-[state=active]:text-green-400 data-[state=active]:border-green-400 font-mono text-green-600 text-xs"
            >
              [INIT_TRANSFER]
            </TabsTrigger>
            <TabsTrigger 
              value="dashboard" 
              className="data-[state=active]:bg-green-900/20 data-[state=active]:text-green-400 data-[state=active]:border-green-400 font-mono text-green-600 text-xs"
            >
              [SERVER_MONITOR]
            </TabsTrigger>
            <TabsTrigger 
              value="tracker" 
              className="data-[state=active]:bg-green-900/20 data-[state=active]:text-green-400 data-[state=active]:border-green-400 font-mono text-green-600 text-xs"
            >
              [NET_TRACE]
            </TabsTrigger>
          </TabsList>

          <TabsContent value="simulation" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Transfer Form */}
              <Card className="terminal-card">
                <CardHeader className="server-panel-header">
                  <CardTitle className="flex items-center terminal-title text-green-400 text-sm">
                    <Send className="h-4 w-4 mr-2 text-green-400" />
                    FUND_TRANSFER_INIT_MODULE
                  </CardTitle>
                  <CardDescription className="text-green-600 font-mono text-xs mt-2">
                    {">> Initialize secure server-to-server fund transfer protocol"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={createTransfer} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sender_name" className="text-green-400 font-mono text-xs">ORIGIN_SERVER:</Label>
                        <Input
                          id="sender_name"
                          value={transferForm.sender_name}
                          onChange={(e) => setTransferForm({ ...transferForm, sender_name: e.target.value })}
                          className="terminal-input mt-1 text-xs"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="sender_bic" className="text-green-400 font-mono text-xs">ORIGIN_BIC:</Label>
                        <Input
                          id="sender_bic"
                          value={transferForm.sender_bic}
                          onChange={(e) => setTransferForm({ ...transferForm, sender_bic: e.target.value })}
                          className="terminal-input mt-1 text-xs"
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
                        <Label htmlFor="transfer_type" className="text-green-400 font-mono text-xs">TRANSFER_PROTOCOL:</Label>
                        <select
                          id="transfer_type"
                          value={transferForm.transfer_type}
                          onChange={(e) => setTransferForm({ ...transferForm, transfer_type: e.target.value })}
                          className="terminal-input text-xs mt-1"
                          required
                        >
                          <option value="">-- SELECT PROTOCOL --</option>
                          <optgroup label="LEDGER TRANSFERS">
                            <option value="L2L">L2L - Ledger to Ledger</option>
                            <option value="ACH">ACH - Automated Clearing House</option>
                            <option value="RTGS">RTGS - Real Time Gross Settlement</option>
                          </optgroup>
                          <optgroup label="SWIFT MT MESSAGES">
                            <option value="MT103">MT103 - Single Customer Credit</option>
                            <option value="MT202">MT202 - General Financial Institution Transfer</option>
                            <option value="MT940">MT940 - Customer Statement Message</option>
                            <option value="MT950">MT950 - Statement Message</option>
                            <option value="MT760">MT760 - Guarantee</option>
                          </optgroup>
                          <optgroup label="ISO-20022 MX MESSAGES">
                            <option value="MX-PACS008">MX-PACS008 - Financial Institution Credit Transfer</option>
                            <option value="MX-PACS009">MX-PACS009 - Financial Institution Credit Transfer</option>
                            <option value="MX-CAMT053">MX-CAMT053 - Bank to Customer Statement</option>
                            <option value="MX-PAIN001">MX-PAIN001 - Customer Credit Transfer Initiation</option>
                          </optgroup>
                          <optgroup label="SWIFT GPI">
                            <option value="GPI-MT103">GPI-MT103 - Global Payments Innovation</option>
                            <option value="GPI-MT202">GPI-MT202 - GPI Financial Institution Transfer</option>
                            <option value="GPI-COV">GPI-COV - Cover Payment</option>
                          </optgroup>
                          <optgroup label="SPECIALIZED">
                            <option value="SEPA">SEPA - Single Euro Payments Area</option>
                            <option value="FEDWIRE">FEDWIRE - Federal Reserve Wire Network</option>
                            <option value="TARGET2">TARGET2 - Trans-European Automated Real-time Gross Settlement</option>
                            <option value="CHIPS">CHIPS - Clearing House Interbank Payments System</option>
                          </optgroup>
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
                        <select
                          value={transferForm.currency}
                          onChange={(e) => setTransferForm({ ...transferForm, currency: e.target.value })}
                          className="terminal-input text-xs mt-1"
                        >
                          <option value="EUR">EUR - Euro</option>
                          <option value="USD">USD - US Dollar</option>
                          <option value="GBP">GBP - British Pound</option>
                          <option value="JPY">JPY - Japanese Yen</option>
                          <option value="CHF">CHF - Swiss Franc</option>
                          <option value="CAD">CAD - Canadian Dollar</option>
                          <option value="AUD">AUD - Australian Dollar</option>
                          <option value="SEK">SEK - Swedish Krona</option>
                        </select>
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
            {/* Server Performance Monitoring */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
              <Card className="terminal-card">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 font-mono text-xs">TOTAL_TRANSFERS</p>
                      <p className="text-lg font-bold text-green-400 font-mono">{getTransferStats().total}</p>
                    </div>
                    <Activity className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="mt-1">
                    <div className="h-1 bg-black border border-green-500">
                      <div className="h-full bg-green-500" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="terminal-card">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 font-mono text-xs">PENDING_QUEUE</p>
                      <p className="text-lg font-bold text-yellow-400 font-mono">{getTransferStats().pending}</p>
                    </div>
                    <Clock className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="mt-1">
                    <div className="h-1 bg-black border border-yellow-500">
                      <div className="h-full bg-yellow-500" style={{ width: '35%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="terminal-card">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 font-mono text-xs">COMPLETED</p>
                      <p className="text-lg font-bold text-green-400 font-mono">{getTransferStats().completed}</p>
                    </div>
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="mt-1">
                    <div className="h-1 bg-black border border-green-500">
                      <div className="h-full bg-green-500" style={{ width: '92%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="terminal-card">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 font-mono text-xs">NET_VOLUME</p>
                      <p className="text-lg font-bold text-green-400 font-mono">
                        €{getTransferStats().totalAmount.toLocaleString()}
                      </p>
                    </div>
                    <DollarSign className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="mt-1">
                    <div className="h-1 bg-black border border-green-500">
                      <div className="h-full bg-green-500" style={{ width: '78%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="terminal-card">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 font-mono text-xs">SERVER_LOAD</p>
                      <p className="text-lg font-bold text-green-400 font-mono">
                        {serverPerformance?.cpu_usage?.toFixed(1) || '47'}%
                      </p>
                    </div>
                    <div className="h-6 w-6 border border-green-500 relative">
                      <div 
                        className="absolute bottom-0 w-full bg-green-500" 
                        style={{ height: `${serverPerformance?.cpu_usage || 47}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="mt-1">
                    <div className="h-1 bg-black border border-green-500">
                      <div 
                        className="h-full bg-green-500" 
                        style={{ width: `${serverPerformance?.cpu_usage || 47}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Network Status */}
            {networkStatus && (
              <Card className="terminal-card">
                <div className="server-panel-header">
                  <CardTitle className="terminal-title text-sm flex items-center">
                    <Globe className="h-4 w-4 mr-2 text-green-400" />
                    SWIFT_GLOBAL_NETWORK_STATUS
                  </CardTitle>
                </div>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                    {Object.entries(networkStatus.swift_network).map(([region, data]) => (
                      <div key={region} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-green-600">{region}:</span>
                          <span className={`${data.status === 'online' ? 'text-green-400' : 'text-yellow-400'}`}>
                            {data.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="h-2 bg-black border border-green-500">
                          <div 
                            className={`h-full ${data.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'}`}
                            style={{ width: `${data.load}%` }}
                          ></div>
                        </div>
                        <div className="text-green-700 text-xs">
                          {data.nodes} nodes | {data.latency}ms
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 grid grid-cols-3 gap-4 text-xs font-mono">
                    <div className="text-center">
                      <div className="text-green-600">TOTAL_NODES</div>
                      <div className="text-green-400 font-bold">{networkStatus.total_nodes.toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-600">MSG_PER_SEC</div>
                      <div className="text-green-400 font-bold">{networkStatus.messages_per_second.toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-600">ERROR_RATE</div>
                      <div className="text-green-400 font-bold">{networkStatus.error_rate}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Server Performance Monitor */}
            {serverPerformance && (
              <Card className="terminal-card">
                <div className="server-panel-header">
                  <CardTitle className="terminal-title text-sm flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-green-400" />
                    REAL_TIME_PERFORMANCE_MONITOR
                  </CardTitle>
                </div>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                    <div className="space-y-2">
                      <div className="text-green-600">CPU_USAGE</div>
                      <div className="text-lg text-green-400 font-bold">{serverPerformance.cpu_usage.toFixed(1)}%</div>
                      <div className="h-2 bg-black border border-green-500">
                        <div className="h-full bg-green-500" style={{ width: `${serverPerformance.cpu_usage}%` }}></div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-green-600">MEMORY_USAGE</div>
                      <div className="text-lg text-green-400 font-bold">{serverPerformance.memory_usage.toFixed(1)}%</div>
                      <div className="h-2 bg-black border border-green-500">
                        <div className="h-full bg-blue-500" style={{ width: `${serverPerformance.memory_usage}%` }}></div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-green-600">DISK_USAGE</div>
                      <div className="text-lg text-green-400 font-bold">{serverPerformance.disk_usage.toFixed(1)}%</div>
                      <div className="h-2 bg-black border border-green-500">
                        <div className="h-full bg-yellow-500" style={{ width: `${serverPerformance.disk_usage}%` }}></div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-green-600">CONNECTIONS</div>
                      <div className="text-lg text-green-400 font-bold">{serverPerformance.active_connections}</div>
                      <div className="text-green-700 text-xs">TX/MIN: {serverPerformance.transactions_per_minute}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Incidents Monitor */}
            {securityIncidents.length > 0 && (
              <Card className="terminal-card">
                <div className="server-panel-header">
                  <CardTitle className="terminal-title text-sm flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 text-red-400" />
                    SECURITY_INCIDENT_MONITOR
                  </CardTitle>
                </div>
                <CardContent className="p-4">
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {securityIncidents.slice(0, 5).map((incident) => (
                      <div key={incident.incident_id} className="flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            incident.severity === 'critical' ? 'bg-red-500' :
                            incident.severity === 'high' ? 'bg-orange-500' :
                            incident.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}></div>
                          <span className="text-green-400">{incident.incident_type.toUpperCase()}</span>
                        </div>
                        <span className="text-green-600">{incident.status.toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                  
                  {user?.role === 'admin' && (
                    <div className="mt-4 flex space-x-2">
                      <Button
                        onClick={() => simulateSecurityIncident('brute_force')}
                        className="terminal-button text-xs px-2 py-1"
                        size="sm"
                      >
                        SIM_BRUTE_FORCE
                      </Button>
                      <Button
                        onClick={() => simulateSecurityIncident('high_value')}
                        className="terminal-button text-xs px-2 py-1"
                        size="sm"
                      >
                        SIM_HIGH_VALUE
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
                        <div className="relative space-y-6">
                          {selectedTransfer.stages.map((stage, index) => {
                            const isActive = index === selectedTransfer.current_stage_index;
                            const isCompleted = stage.status === 'completed';
                            
                            return (
                              <div key={index} className="relative flex items-start space-x-4">
                                {/* Timeline Line */}
                                {index < selectedTransfer.stages.length - 1 && (
                                  <div className="absolute left-4 top-8 w-px h-16 bg-slate-600"></div>
                                )}
                                
                                {/* Stage Icon */}
                                <div className="flex-shrink-0 mt-1">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                                    isCompleted 
                                      ? 'bg-green-600 border-green-600 text-white' 
                                      : isActive 
                                        ? 'bg-yellow-600 border-yellow-600 text-white animate-pulse'
                                        : 'bg-slate-700 border-slate-600 text-slate-400'
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
                                <div className="flex-1 min-w-0 pb-6">
                                  <div className="flex items-center justify-between mb-2">
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
                                  
                                  <p className="text-sm text-slate-400 mb-3">{stage.description}</p>
                                  
                                  {/* Stage Logs */}
                                  {stage.logs && stage.logs.length > 0 && (
                                    <div className="bg-black/50 rounded p-3 font-mono text-xs border border-green-500/30">
                                      {stage.logs.map((log, logIndex) => (
                                        <div key={logIndex} className={`${getLogLevelColor(log.level)} mb-1`}>
                                          <span className="text-green-400">[{log.timestamp.split(' ')[1]}]</span> {log.message}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
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
                            {isLoading ? 'Advancing...' : 'Advance to Next Stage'}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Network Topology Visualization */}
                    <div className="terminal-card p-4">
                      <div className="server-panel-header mb-4">
                        <h3 className="terminal-title text-sm flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-green-400" />
                          NETWORK_TOPOLOGY_MAP
                        </h3>
                      </div>
                      
                      <div className="ascii-art mb-4 text-xs">
{`
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ ORIGIN_NODE │────▶│SWIFT_NETWORK│────▶│INTERMEDIARY │────▶│TARGET_NODE  │
│  ${selectedTransfer.sender_bic}  │     │             │     │    BANK     │     │  ${selectedTransfer.receiver_bic}  │
│   Status:   │     │   Routing   │     │   Process   │     │   Status:   │
│   ${selectedTransfer.location === 'sending_bank' ? '[ACTIVE]' : '[IDLE]  '}   │     │   ${selectedTransfer.location === 'swift_network' ? '[ACTIVE]' : '[IDLE]  '}   │     │   ${selectedTransfer.location === 'intermediary_bank' ? '[ACTIVE]' : '[IDLE]  '}   │     │   ${selectedTransfer.location === 'receiving_bank' ? '[ACTIVE]' : '[IDLE]  '}   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                     │                     │                     │
       ▼                     ▼                     ▼                     ▼
  [BIC VERIFY]         [PKI SECURE]         [CORR BANK]         [FINAL SETT]
  [AML/KYC OK]         [ENCRYPTED ]         [VALIDATED]         [COMPLETED ]
`}
                      </div>
                      
                      <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-4 overflow-x-auto">
                        {/* Sending Bank */}
                        <div className="text-center min-w-0 flex-shrink-0">
                          <Building2 className={`h-8 w-8 mx-auto mb-2 ${
                            selectedTransfer.location === 'sending_bank' ? 'text-green-400' : 'text-slate-500'
                          }`} />
                          <p className="text-sm text-slate-400">Sending Bank</p>
                          <p className="text-xs text-white truncate">{selectedTransfer.sender_bic}</p>
                        </div>
                        
                        <ArrowRight className="text-slate-500 mx-2 flex-shrink-0" />
                        
                        {/* SWIFT Network */}
                        <div className="text-center min-w-0 flex-shrink-0">
                          <Globe className={`h-8 w-8 mx-auto mb-2 ${
                            selectedTransfer.location === 'swift_network' ? 'text-green-400' : 'text-slate-500'
                          }`} />
                          <p className="text-sm text-slate-400">SWIFT Network</p>
                          <p className="text-xs text-white">In Transit</p>
                        </div>
                        
                        <ArrowRight className="text-slate-500 mx-2 flex-shrink-0" />
                        
                        {/* Intermediary Bank */}
                        <div className="text-center min-w-0 flex-shrink-0">
                          <Truck className={`h-8 w-8 mx-auto mb-2 ${
                            selectedTransfer.location === 'intermediary_bank' ? 'text-green-400' : 'text-slate-500'
                          }`} />
                          <p className="text-sm text-slate-400">Intermediary</p>
                          <p className="text-xs text-white">Correspondent</p>
                        </div>
                        
                        <ArrowRight className="text-slate-500 mx-2 flex-shrink-0" />
                        
                        {/* Receiving Bank */}
                        <div className="text-center min-w-0 flex-shrink-0">
                          <Building2 className={`h-8 w-8 mx-auto mb-2 ${
                            selectedTransfer.location === 'receiving_bank' ? 'text-green-400' : 'text-slate-500'
                          }`} />
                          <p className="text-sm text-slate-400">Receiving Bank</p>
                          <p className="text-xs text-white truncate">{selectedTransfer.receiver_bic}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4 text-sm text-slate-400 space-y-1">
                        <p><strong>Current Location:</strong> {selectedTransfer.location?.replace('_', ' ').toUpperCase()}</p>
                        <p><strong>Current Stage:</strong> {selectedTransfer.current_stage?.replace('_', ' ').toUpperCase()}</p>
                        {selectedTransfer.estimated_completion && (
                          <p><strong>Estimated Completion:</strong> {new Date(selectedTransfer.estimated_completion).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Network Overview */}
                    <Card className="terminal-card">
                      <div className="server-panel-header">
                        <h3 className="terminal-title text-sm">GLOBAL_NETWORK_STATUS</h3>
                      </div>
                      <CardContent className="p-4">
                        <div className="ascii-art text-xs mb-4">
{`
    ╭─────────────────────────────────────────╮
    │           SWIFT GLOBAL NETWORK          │
    │                                         │
    │  ● EUROPE    [████████████] 92% ONLINE │
    │  ● AMERICAS  [█████████   ] 76% ONLINE │
    │  ● ASIA-PAC  [██████████  ] 84% ONLINE │
    │  ● AFRICA    [█████       ] 45% ONLINE │
    │                                         │
    │  TOTAL NODES: 11,254                    │
    │  ACTIVE SESS: 8,847                     │
    │  MSG/SEC:     2,847                     │
    ╰─────────────────────────────────────────╯
`}
                        </div>
                        <div className="space-y-2 text-xs font-mono">
                          <div className="flex justify-between">
                            <span className="text-green-600">NETWORK_LATENCY:</span>
                            <span className="text-green-400">12.4ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-600">THROUGHPUT:</span>
                            <span className="text-green-400">2.8K msg/sec</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-600">ERROR_RATE:</span>
                            <span className="text-yellow-400">0.02%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Live Server Logs */}
                    <Card className="terminal-card">
                      <div className="server-panel-header">
                        <h3 className="terminal-title text-sm">LIVE_SERVER_LOGS</h3>
                      </div>
                      <CardContent className="p-4">
                        <ScrollArea className="h-64 w-full border border-green-500 p-3 bg-black">
                          <div className="font-mono text-xs space-y-1">
                            <div className="text-green-400">[15:43:12] SWIFT_SESSION: New connection from 192.168.1.247</div>
                            <div className="text-green-400">[15:43:15] MT103_PARSER: Message validated successfully</div>
                            <div className="text-yellow-400">[15:43:18] AML_ENGINE: Screening check initiated</div>
                            <div className="text-green-400">[15:43:20] PKI_VALIDATOR: Certificate chain verified</div>
                            <div className="text-green-400">[15:43:23] ROUTING_ENGINE: Path calculated via DEUTDEFF</div>
                            <div className="text-blue-400">[15:43:25] NETWORK_QUEUE: Message queued for transmission</div>
                            <div className="text-green-400">[15:43:28] SWIFT_ALLIANCE: ACK received from target</div>
                            <div className="text-green-400">[15:43:30] LEDGER_ENGINE: Double-entry posted</div>
                            <div className="text-green-400">[15:43:33] UETR_SERVICE: Tracker updated with status</div>
                            <div className="text-green-400">[15:43:35] COMPLIANCE: Transaction cleared</div>
                            <div className="text-green-400">[15:43:38] SETTLEMENT: Final confirmation received</div>
                            <div className="text-green-400">[15:43:40] AUDIT_LOG: Transaction completed successfully</div>
                            <div className="text-green-600">[15:43:42] SYSTEM: Ready for next transaction</div>
                            <div className="text-green-400">
                              <span className="terminal-cursor">▋</span> Monitoring active...
                            </div>
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Select Transfer Prompt */}
                    <Card className="terminal-card lg:col-span-2">
                      <CardContent className="p-8 text-center">
                        <Navigation className="h-12 w-12 mx-auto mb-4 text-green-600 opacity-50" />
                        <h3 className="text-sm font-medium text-green-400 mb-2 font-mono">SELECT_TRANSFER_FOR_DETAILED_TRACE</h3>
                        <p className="text-green-600 mb-4 font-mono text-xs">Choose a transfer from SERVER_MONITOR to view network trace</p>
                        <Button 
                          onClick={() => {
                            // Auto-select the first pending transfer if available
                            const pendingTransfer = transfers.find(t => t.status !== 'completed');
                            if (pendingTransfer) {
                              setSelectedTransfer(pendingTransfer);
                            }
                          }}
                          className="terminal-button text-xs"
                        >
                          AUTO_SELECT_TRANSFER
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* SWIFT Connection Sequence */}
      {showConnectionSequence && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4">
          <div className="w-full max-w-6xl h-[32rem] bg-black border-2 border-green-500 shadow-2xl">
            {/* Connection Header */}
            <div className="bg-black border-b-2 border-green-500 p-4">
              <div className="flex items-center justify-center space-x-4">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <Terminal className="h-6 w-6 text-green-500" />
                <span className="terminal-title text-lg text-green-500">SWIFT_GLOBAL_NETWORK_CONNECTION</span>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            
            <div className="p-6 h-full overflow-hidden flex flex-col">
              {/* ASCII Art Header */}
              <div className="ascii-art text-center mb-6 text-green-500" style={{ fontSize: '8px', lineHeight: '1' }}>
{`
███████╗██╗    ██╗██╗███████╗████████╗    ███╗   ██╗███████╗████████╗██╗    ██╗ ██████╗ ██████╗ ██╗  ██╗
██╔════╝██║    ██║██║██╔════╝╚══██╔══╝    ████╗  ██║██╔════╝╚══██╔══╝██║    ██║██╔═══██╗██╔══██╗██║ ██╔╝
███████╗██║ █╗ ██║██║█████╗     ██║       ██╔██╗ ██║█████╗     ██║   ██║ █╗ ██║██║   ██║██████╔╝█████╔╝ 
╚════██║██║███╗██║██║██╔══╝     ██║       ██║╚██╗██║██╔══╝     ██║   ██║███╗██║██║   ██║██╔══██╗██╔═██╗ 
███████║╚███╔███╔╝██║██║        ██║       ██║ ╚████║███████╗   ██║   ╚███╔███╔╝╚██████╔╝██║  ██║██║  ██╗
╚══════╝ ╚══╝╚══╝ ╚═╝╚═╝        ╚═╝       ╚═╝  ╚═══╝╚══════╝   ╚═╝    ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝
`}
              </div>
              
              {/* Progress Section */}
              <div className="mb-6 space-y-4">
                {/* Main Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-green-500 font-mono text-sm">
                    <span>CONNECTION_PROGRESS:</span>
                    <span>{connectionLogs.length > 0 ? connectionLogs[connectionLogs.length - 1]?.progress || 0 : 0}%</span>
                  </div>
                  <div className="w-full bg-black border-2 border-green-500 h-6 relative overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-1000 ease-out relative"
                      style={{ width: `${connectionLogs.length > 0 ? connectionLogs[connectionLogs.length - 1]?.progress || 0 : 0}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-mono text-xs font-bold text-black mix-blend-difference">
                        {connectionLogs.length > 0 ? connectionLogs[connectionLogs.length - 1]?.progress || 0 : 0}% COMPLETE
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pipeline Status */}
                <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                  <div className="text-center">
                    <div className="text-orange-500 mb-1">CURRENT_PIPELINE:</div>
                    <div className="text-green-400 font-bold">
                      {connectionLogs.length > 0 ? connectionLogs[connectionLogs.length - 1]?.pipeline || 'INITIALIZING' : 'INITIALIZING'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-orange-500 mb-1">TIME_REMAINING:</div>
                    <div className="text-green-400 font-bold">
                      {Math.max(0, 22 - Math.round((connectionStep / 15) * 22))}s
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-orange-500 mb-1">NETWORK_STATUS:</div>
                    <div className="text-green-400 font-bold">CONNECTING</div>
                  </div>
                </div>
              </div>
              
              {/* Connection Logs */}
              <div className="flex-1 bg-black border-2 border-green-500 p-4 overflow-y-auto">
                <div className="font-mono text-sm space-y-2">
                  <div className="text-green-500 mb-3 text-center">
                    === FUNDTRANS BANKING NETWORK CONNECTION LOG ===
                  </div>
                  {connectionLogs.map((log, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <span className="text-orange-500 text-xs w-20 flex-shrink-0">
                        [{log.timestamp}]
                      </span>
                      <span className="text-yellow-400 text-xs w-24 flex-shrink-0">
                        {log.pipeline}:
                      </span>
                      <span className="text-green-400 flex-1">
                        {log.message}
                      </span>
                      <span className="text-green-600 text-xs w-12 text-right">
                        {log.progress}%
                      </span>
                    </div>
                  ))}
                  {connectionLogs.length > 0 && (
                    <div className="text-green-400 mt-4 flex items-center">
                      <span className="terminal-cursor text-green-500">▋</span>
                      <span className="ml-2 animate-pulse">ESTABLISHING SECURE BANKING CONNECTION...</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Connection Footer */}
              <div className="mt-4 text-center space-y-2">
                <div className="text-orange-500 font-mono text-sm font-bold">
                  CONNECTING TO SWIFT GLOBAL FINANCIAL NETWORK
                </div>
                <div className="text-green-600 font-mono text-xs">
                  FUNDTRANS SERVER v8.08 | SECURE BANKING OPERATIONS
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Command Line Interface Terminal */}
      {showCliTerminal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <div className="w-full max-w-6xl h-96 terminal-card">
            <div className="terminal-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="server-status online"></div>
                  <Terminal className="h-4 w-4 text-green-400 mr-2" />
                  <span className="terminal-title text-xs">FUNDTRANS_CLI_TERMINAL</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCliTerminal(false)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20 text-xs"
                >
                  [X]
                </Button>
              </div>
            </div>
            
            <div className="p-4 h-full overflow-hidden flex flex-col">
              <div className="text-green-400 font-mono text-xs mb-2">
                FUNDTRANS SERVER v8.08 - Command Line Interface | Type 'help' for commands
              </div>
              
              <ScrollArea className="flex-1 border border-green-500 p-3 bg-black mb-4">
                <div className="font-mono text-xs space-y-1">
                  {cliHistory.map((entry, index) => (
                    <div key={index} className="text-green-600">{entry}</div>
                  ))}
                  {cliOutput.map((line, index) => (
                    <div key={index} className="text-green-400">{line}</div>
                  ))}
                  <div className="text-green-400">
                    <span className="terminal-cursor">▋</span> Ready for command...
                  </div>
                </div>
              </ScrollArea>
              
              <div className="flex items-center space-x-2">
                <span className="text-green-400 font-mono text-sm">$</span>
                <Input
                  value={cliCommand}
                  onChange={(e) => setCliCommand(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      executeCliCommand(cliCommand);
                    }
                  }}
                  className="terminal-input text-sm flex-1"
                  placeholder="Enter command..."
                  autoFocus
                />
                <Button
                  onClick={() => executeCliCommand(cliCommand)}
                  className="terminal-button text-xs px-3"
                  size="sm"
                >
                  EXEC
                </Button>
                <Button
                  onClick={() => {
                    setCliOutput([]);
                    setCliHistory([]);
                  }}
                  className="terminal-button text-xs px-3"
                  size="sm"
                >
                  CLEAR
                </Button>
              </div>
              
              <div className="mt-2 text-xs font-mono text-green-600">
                Quick Commands: status | network ping | transfers list | alerts show | help
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Server Terminal Popup */}
      {showTerminalPopup && terminalTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="terminal-window">
            <div className="terminal-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="server-status online"></div>
                  <Terminal className="h-4 w-4 text-green-400 mr-2" />
                  <span className="terminal-title text-xs">FUNDTRANS_MONITOR_TERMINAL</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTerminalPopup(false)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20 text-xs"
                >
                  [X]
                </Button>
              </div>
            </div>
            
            <div className="terminal-content">
              <div className="grid grid-cols-2 gap-4 mb-4 text-xs font-mono">
                <div>
                  <span className="text-green-600">TRANSFER_ID:</span>
                  <div className="text-green-400 bg-black border border-green-500 p-2 mt-1">
                    {terminalTransfer.transfer_id}
                  </div>
                </div>
                <div>
                  <span className="text-green-600">NETWORK_STATUS:</span>
                  <div className="flex items-center mt-1">
                    {getStatusBadge(terminalTransfer.status)}
                    <span className="ml-2 text-green-400 font-mono">
                      {terminalTransfer.currency} {terminalTransfer.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="terminal-card p-3">
                <div className="text-green-600 font-mono text-xs mb-2">LIVE_SERVER_LOGS:</div>
                <ScrollArea className="h-48 w-full border border-green-500 p-3 bg-black">
                  <div className="font-mono text-xs space-y-1">
                    <div className="text-green-400 mb-2">
                      === FUNDTRANS_SERVER_v8.08 SECURE NETWORK ===
                    </div>
                    {terminalTransfer.swift_logs?.map((log, index) => (
                      <div
                        key={index}
                        className={`flex items-start space-x-2 ${getLogLevelColor(log.level)}`}
                      >
                        <span className="text-green-600 text-xs w-16 flex-shrink-0">
                          [{log.timestamp.split(' ')[1]}]
                        </span>
                        <span className="flex-1">{log.message}</span>
                      </div>
                    ))}
                    <div className="text-green-400 mt-3">
                      <span className="terminal-cursor">▋</span> AUTO_PROGRESSION_DAEMON: ACTIVE
                    </div>
                  </div>
                </ScrollArea>
              </div>
              
              <div className="mt-4 flex justify-between items-center text-xs font-mono">
                <div className="text-green-600">
                  {">> AUTO_STAGE_PROGRESSION: ENABLED"}
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setSelectedTransfer(terminalTransfer)}
                    className="terminal-button text-xs px-3 py-1"
                    size="sm"
                  >
                    TRACE_NET
                  </Button>
                  <Button
                    onClick={() => setShowTerminalPopup(false)}
                    className="terminal-button text-xs px-3 py-1"
                    size="sm"
                  >
                    MINIMIZE
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;