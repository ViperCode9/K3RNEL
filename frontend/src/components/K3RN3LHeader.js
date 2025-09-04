import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { 
  Terminal, 
  Power, 
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  Shield
} from "lucide-react";

const K3RN3LHeader = ({ user, onLogout }) => {
  const [systemStats, setSystemStats] = useState({
    cpu: 12.4,
    memory: 68.2,
    network: 847,
    uptime: '07:42:18'
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStats(prev => ({
        cpu: (Math.random() * 15 + 8).toFixed(1),
        memory: (Math.random() * 20 + 60).toFixed(1),
        network: Math.floor(Math.random() * 200 + 800),
        uptime: new Date().toLocaleTimeString()
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="terminal-machine border-b-2 border-green-500">
      <div className="server-panel-header">
        <div className="flex items-center justify-between p-4">
          {/* Left: K3RN3L 808 Branding */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="server-status online"></div>
              <Terminal className="h-6 w-6 text-green-400" />
              <div className="k3rn3l-logo text-2xl">K3RN3L 808</div>
            </div>
            <div className="text-green-600 font-mono text-xs">
              SECURE BANKING NETWORK :: AUTHENTICATED ACCESS
            </div>
          </div>

          {/* Center: System Statistics */}
          <div className="flex items-center space-x-6 text-xs font-mono">
            <div className="flex items-center space-x-2">
              <Cpu className="h-4 w-4 text-green-400" />
              <span className="text-green-600">CPU:</span>
              <span className="text-green-400">{systemStats.cpu}%</span>
            </div>
            <div className="flex items-center space-x-2">
              <HardDrive className="h-4 w-4 text-green-400" />
              <span className="text-green-600">MEM:</span>
              <span className="text-green-400">{systemStats.memory}%</span>
            </div>
            <div className="flex items-center space-x-2">
              <Wifi className="h-4 w-4 text-green-400" />
              <span className="text-green-600">NET:</span>
              <span className="text-green-400">{systemStats.network} KB/s</span>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-green-400" />
              <span className="text-green-600">UPTIME:</span>
              <span className="text-green-400">{systemStats.uptime}</span>
            </div>
          </div>

          {/* Right: User Info & Controls */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-green-400 font-mono text-sm font-bold">
                {user?.full_name || 'SYSTEM OPERATOR'}
              </div>
              <div className="text-green-600 font-mono text-xs">
                ACCESS_LEVEL: {user?.role?.toUpperCase() || 'ADMIN'}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-400" />
              <Button
                onClick={onLogout}
                className="terminal-button text-xs px-3 py-2"
                size="sm"
              >
                <Power className="h-3 w-3 mr-1" />
                DISCONNECT
              </Button>
            </div>
          </div>
        </div>
        <div className="load-bar"></div>
      </div>
    </header>
  );
};

export default K3RN3LHeader;