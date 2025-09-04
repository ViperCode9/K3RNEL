import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Terminal, Shield, Lock, User } from "lucide-react";

const LoginTerminal = ({ loginForm, setLoginForm, onLogin, isLoading }) => {
  const [bootSequence, setBootSequence] = useState([]);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    // Boot sequence
    const bootMessages = [
      "K3RN3L 808 BANKING NETWORK v2.0.8",
      "SWIFT Global Network :: Production Environment", 
      "Initializing secure banking modules...",
      "HSM Security Module: READY",
      "Network diagnostics: PASSED",
      "Authentication system: ONLINE",
      "Ready for secure access..."
    ];

    bootMessages.forEach((message, index) => {
      setTimeout(() => {
        setBootSequence(prev => [...prev, message]);
        if (index === bootMessages.length - 1) {
          setTimeout(() => setShowLogin(true), 1000);
        }
      }, index * 800);
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center matrix-bg">
      <div className="terminal-machine w-full max-w-4xl mx-4">
        <div className="p-8">
          {/* K3RN3L 808 Header */}
          <div className="text-center mb-8">
            <div className="k3rn3l-logo mb-4">K3RN3L 808</div>
            <div className="text-green-600 font-mono text-lg mb-2">
              SECURE BANKING NETWORK :: AUTHENTICATED ACCESS REQUIRED
            </div>
            <div className="text-green-500 font-mono text-sm">
              K3RN3L v8.08 | SWIFT GLOBAL NETWORK | PRODUCTION ENVIRONMENT
            </div>
          </div>

          {/* Boot Sequence */}
          {!showLogin && (
            <div className="terminal-card mb-8">
              <div className="p-6">
                <div className="text-green-400 font-mono text-sm mb-4 text-center">
                  === SYSTEM INITIALIZATION ===
                </div>
                <div className="space-y-2 font-mono text-sm">
                  {bootSequence.map((message, index) => (
                    <div key={index} className="text-green-400 flex items-center">
                      <span className="text-green-600 mr-2">[{String(index + 1).padStart(2, '0')}]</span>
                      <span>{message}</span>
                    </div>
                  ))}
                  {bootSequence.length < 7 && (
                    <div className="text-green-400 flex items-center">
                      <span className="terminal-cursor">▋</span>
                      <span className="ml-2 animate-pulse">Initializing...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Login Form */}
          {showLogin && (
            <div className="space-y-6">
              <form onSubmit={onLogin} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <div className="flex items-center mb-2">
                      <User className="h-4 w-4 text-green-400 mr-2" />
                      <label className="text-green-400 font-mono text-sm">$ USER_ID:</label>
                    </div>
                    <Input
                      type="text"
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                      className="terminal-input text-lg"
                      placeholder="USER_ID"
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <div className="flex items-center mb-2">
                      <Lock className="h-4 w-4 text-green-400 mr-2" />
                      <label className="text-green-400 font-mono text-sm">$ AUTH_TOKEN:</label>
                    </div>
                    <Input
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="terminal-input text-lg"
                      placeholder="AUTH_TOKEN"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full terminal-button text-lg py-4"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Terminal className="h-5 w-5 mr-2 animate-spin" />
                      <span>ESTABLISHING SECURE CONNECTION</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Shield className="h-5 w-5 mr-2" />
                      <span>&gt;&gt;&gt; ESTABLISH SECURE CONNECTION &lt;&lt;&lt;</span>
                    </div>
                  )}
                </Button>
              </form>

              {/* System Status */}
              <div className="terminal-card">
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-4 text-xs font-mono text-center">
                    <div>
                      <div className="text-green-600 mb-1">[SYSTEM] Status</div>
                      <div className="text-green-400 font-bold">Waiting for authentication</div>
                    </div>
                    <div>
                      <div className="text-green-600 mb-1">[NETWORK] SWIFT Global Network</div>
                      <div className="text-green-400 font-bold">ONLINE</div>
                    </div>
                    <div>
                      <div className="text-green-600 mb-1">[SECURITY] HSM Security Module</div>
                      <div className="text-green-400 font-bold">READY</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginTerminal;