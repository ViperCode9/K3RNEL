import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { 
  FileText, 
  Download, 
  Eye, 
  QrCode, 
  Hash,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DocumentGenerator = ({ token, transferData }) => {
  const [selectedBank, setSelectedBank] = useState('DEUTDEFFXXX');
  const [selectedDocType, setSelectedDocType] = useState('balance_sheet');
  const [includeQR, setIncludeQR] = useState(true);
  const [includeBarcode, setIncludeBarcode] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState(null);
  const [error, setError] = useState('');

  const supportedBanks = [
    {
      code: 'DEUTDEFFXXX',
      name: 'Deutsche Bank AG',
      country: 'Germany',
      color: '#1f4e79'
    },
    {
      code: 'CHASUS33XXX', 
      name: 'JPMorgan Chase Bank N.A.',
      country: 'United States',
      color: '#004879'
    }
  ];

  const documentTypes = [
    {
      type: 'balance_sheet',
      name: 'Balance Sheet',
      description: 'Account balance and transaction history',
      icon: FileText,
      available: true
    },
    {
      type: 'swift_mt103',
      name: 'SWIFT MT103 Transfer',
      description: 'Official SWIFT wire transfer document',
      icon: FileText,
      available: false // Not yet implemented
    },
    {
      type: 'remittance_advice',
      name: 'Remittance Advice',
      description: 'Payment confirmation and details',
      icon: FileText,
      available: false // Not yet implemented
    },
    {
      type: 'debit_note',
      name: 'Debit Note',
      description: 'Account debit notification',
      icon: FileText,
      available: false // Not yet implemented
    }
  ];

  const generateDocument = async () => {
    if (!transferData) {
      setError('No transfer data available');
      return;
    }

    setGenerating(true);
    setError('');
    
    try {
      const requestData = {
        transfer_data: transferData,
        bank_code: selectedBank,
        include_qr_code: includeQR,
        include_barcode: includeBarcode,
        watermark: "K3RN3L 808 BANKING NETWORK",
        additional_data: {
          generated_by: "K3RN3L 808 Banking Simulation",
          simulation_mode: true
        }
      };

      const response = await axios.post(
        `${API}/documents/generate/${selectedDocType}`,
        requestData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setGeneratedDoc(response.data);
      } else {
        setError('Document generation failed');
      }
    } catch (error) {
      console.error('Document generation error:', error);
      setError(error.response?.data?.detail || 'Failed to generate document');
    } finally {
      setGenerating(false);
    }
  };

  const downloadDocument = async (documentId) => {
    try {
      const response = await axios.get(
        `${API}/documents/download/${documentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'banking_document.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=["']?([^"';]*)["']?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to download document');
    }
  };

  const previewDocument = (documentId) => {
    const previewUrl = `${API}/documents/preview/${documentId}`;
    window.open(previewUrl, '_blank');
  };

  const selectedBankInfo = supportedBanks.find(bank => bank.code === selectedBank);
  const selectedDocTypeInfo = documentTypes.find(doc => doc.type === selectedDocType);

  return (
    <Card className="terminal-card">
      <CardHeader className="server-panel-header">
        <CardTitle className="terminal-title text-sm flex items-center">
          <FileText className="h-4 w-4 mr-2 text-green-400" />
          PROFESSIONAL_DOCUMENT_GENERATOR
        </CardTitle>
        <CardDescription className="text-green-600 font-mono text-xs">
          Generate authentic banking documents with logos, QR codes, and security features
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Bank Selection */}
        <div>
          <label className="text-green-400 font-mono text-xs mb-2 block">SELECT_BANK</label>
          <Select value={selectedBank} onValueChange={setSelectedBank}>
            <SelectTrigger className="terminal-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {supportedBanks.map(bank => (
                <SelectItem key={bank.code} value={bank.code}>
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4" />
                    <span>{bank.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {bank.country}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedBankInfo && (
            <div className="mt-2 text-xs text-green-600 font-mono">
              Code: {selectedBankInfo.code} | Country: {selectedBankInfo.country}
            </div>
          )}
        </div>

        {/* Document Type Selection */}
        <div>
          <label className="text-green-400 font-mono text-xs mb-2 block">DOCUMENT_TYPE</label>
          <Select value={selectedDocType} onValueChange={setSelectedDocType}>
            <SelectTrigger className="terminal-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {documentTypes.map(docType => (
                <SelectItem 
                  key={docType.type} 
                  value={docType.type}
                  disabled={!docType.available}
                >
                  <div className="flex items-center space-x-2">
                    <docType.icon className="h-4 w-4" />
                    <span>{docType.name}</span>
                    {!docType.available && (
                      <Badge variant="secondary" className="text-xs">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDocTypeInfo && (
            <div className="mt-2 text-xs text-green-600 font-mono">
              {selectedDocTypeInfo.description}
            </div>
          )}
        </div>

        {/* Security Features */}
        <div className="space-y-3">
          <label className="text-green-400 font-mono text-xs block">SECURITY_FEATURES</label>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="qr-code"
              checked={includeQR}
              onCheckedChange={setIncludeQR}
              className="border-green-500"
            />
            <QrCode className="h-4 w-4 text-green-400" />
            <label htmlFor="qr-code" className="text-green-300 font-mono text-xs">
              Include QR Code for verification
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="barcode"
              checked={includeBarcode}
              onCheckedChange={setIncludeBarcode}
              className="border-green-500"
            />
            <Hash className="h-4 w-4 text-green-400" />
            <label htmlFor="barcode" className="text-green-300 font-mono text-xs">
              Include barcode for document tracking
            </label>
          </div>
        </div>

        {/* Transfer Data Preview */}
        {transferData && (
          <div className="bg-black/50 border border-green-500/30 rounded p-3">
            <div className="text-green-400 font-mono text-xs mb-2">TRANSFER_DATA_PREVIEW</div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-green-600">ID:</span>{' '}
                <span className="text-green-300">{transferData.transfer_id?.substring(0, 8)}...</span>
              </div>
              <div>
                <span className="text-green-600">Amount:</span>{' '}
                <span className="text-green-300">
                  {transferData.currency} {parseFloat(transferData.amount).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-green-600">From:</span>{' '}
                <span className="text-green-300">{transferData.sender_name}</span>
              </div>
              <div>
                <span className="text-green-600">To:</span>{' '}
                <span className="text-green-300">{transferData.receiver_name}</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded p-3">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span className="text-red-400 font-mono text-xs">{error}</span>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={generateDocument}
          disabled={generating || !transferData || !selectedDocTypeInfo?.available}
          className="w-full terminal-button"
        >
          {generating ? (
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 animate-spin" />
              <span>GENERATING DOCUMENT...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>GENERATE PROFESSIONAL DOCUMENT</span>
            </div>
          )}
        </Button>

        {/* Generated Document */}
        {generatedDoc && (
          <div className="bg-green-900/20 border border-green-500 rounded p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-green-400 font-mono text-sm font-bold">
                DOCUMENT GENERATED SUCCESSFULLY
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-green-600">Doc ID:</span>{' '}
                <span className="text-green-300">{generatedDoc.document_id.substring(0, 8)}...</span>
              </div>
              <div>
                <span className="text-green-600">Size:</span>{' '}
                <span className="text-green-300">{(generatedDoc.file_size / 1024).toFixed(1)}KB</span>
              </div>
              <div>
                <span className="text-green-600">Bank:</span>{' '}
                <span className="text-green-300">{generatedDoc.bank_code}</span>
              </div>
              <div>
                <span className="text-green-600">Expires:</span>{' '}
                <span className="text-green-300">
                  {new Date(generatedDoc.expires_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={() => downloadDocument(generatedDoc.document_id)}
                className="terminal-button flex-1"
                size="sm"
              >
                <Download className="h-3 w-3 mr-1" />
                DOWNLOAD
              </Button>
              <Button
                onClick={() => previewDocument(generatedDoc.document_id)}
                className="terminal-button flex-1"
                size="sm"
                variant="outline"
              >
                <Eye className="h-3 w-3 mr-1" />
                PREVIEW
              </Button>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-green-600 font-mono bg-black/30 border border-green-500/20 rounded p-2">
          <div className="font-bold mb-1">EDUCATIONAL SIMULATION:</div>
          Documents are generated for training purposes only. All data is simulated and includes appropriate watermarks and disclaimers.
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentGenerator;