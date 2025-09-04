import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { 
  Search, 
  Filter, 
  Building2, 
  MapPin, 
  Globe,
  X,
  Check
} from "lucide-react";
import { GLOBAL_BANKS, COUNTRIES, REGIONS, searchBanks, getBanksByCountry, getBanksByRegion } from '../data/bankList';

const BankSelector = ({ 
  label = "SELECT_BANK", 
  value, 
  onChange, 
  placeholder = "Choose bank...",
  showDetails = false,
  filterCorrespondent = false,
  excludeBank = null // Exclude specific bank (for receiver selection)
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter banks based on search and filters
  const filteredBanks = useMemo(() => {
    let banks = GLOBAL_BANKS;

    // Exclude specific bank if provided
    if (excludeBank) {
      banks = banks.filter(bank => bank.bic !== excludeBank);
    }

    // Filter by correspondent banks only
    if (filterCorrespondent) {
      banks = banks.filter(bank => bank.correspondent === true);
    }

    // Apply search term
    if (searchTerm) {
      banks = searchBanks(searchTerm);
    }

    // Apply country filter
    if (selectedCountry) {
      banks = banks.filter(bank => bank.country === selectedCountry);
    }

    // Apply region filter
    if (selectedRegion) {
      banks = banks.filter(bank => bank.region === selectedRegion);
    }

    return banks.sort((a, b) => a.name.localeCompare(b.name));
  }, [searchTerm, selectedCountry, selectedRegion, excludeBank, filterCorrespondent]);

  const selectedBank = GLOBAL_BANKS.find(bank => bank.bic === value);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCountry('');
    setSelectedRegion('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-green-400 font-mono text-xs">{label}</label>
        <Button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          variant="ghost"
          size="sm"
          className="text-green-600 hover:text-green-400 text-xs px-2 py-1"
        >
          <Filter className="h-3 w-3 mr-1" />
          FILTERS
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-black/50 border border-green-500/30 rounded p-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-3 w-3 text-green-600" />
            <Input
              type="text"
              placeholder="Search banks, BIC codes, countries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="terminal-input pl-8 text-xs"
            />
          </div>

          {/* Country and Region Filters */}
          <div className="grid grid-cols-2 gap-2">
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="terminal-input text-xs">
                <SelectValue placeholder="Filter by country" />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                <SelectItem value="">All Countries</SelectItem>
                {COUNTRIES.map(country => (
                  <SelectItem key={country} value={country} className="text-xs">
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="terminal-input text-xs">
                <SelectValue placeholder="Filter by region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Regions</SelectItem>
                {REGIONS.map(region => (
                  <SelectItem key={region} value={region} className="text-xs">
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono text-green-600">
              {filteredBanks.length} banks found
            </div>
            <Button
              type="button"
              onClick={clearFilters}
              variant="ghost"
              size="sm"
              className="text-green-600 hover:text-green-400 text-xs px-2 py-1"
            >
              <X className="h-3 w-3 mr-1" />
              CLEAR
            </Button>
          </div>
        </div>
      )}

      {/* Bank Selection */}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="terminal-input">
          <SelectValue placeholder={placeholder}>
            {selectedBank && (
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-green-400" />
                <span className="font-mono text-xs">
                  {selectedBank.name} ({selectedBank.bic})
                </span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {filteredBanks.length > 0 ? (
            filteredBanks.map(bank => (
              <SelectItem key={bank.bic} value={bank.bic} className="py-3">
                <div className="flex items-start space-x-3 w-full">
                  <Building2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm text-green-300 truncate">
                      {bank.name}
                    </div>
                    <div className="font-mono text-xs text-green-600 mt-1">
                      {bank.bic} • {bank.city}, {bank.country}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge 
                        variant="outline" 
                        className="text-xs px-1 py-0"
                      >
                        {bank.type}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className="text-xs px-1 py-0"
                      >
                        {bank.region}
                      </Badge>
                      {bank.correspondent && (
                        <Badge 
                          variant="default" 
                          className="text-xs px-1 py-0 bg-green-900 text-green-400"
                        >
                          CORRESPONDENT
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-results" disabled>
              <div className="text-green-600 font-mono text-xs">
                No banks found matching your criteria
              </div>
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {/* Selected Bank Details */}
      {selectedBank && showDetails && (
        <div className="bg-black/50 border border-green-500/30 rounded p-3">
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <div className="text-green-600">BANK_NAME:</div>
              <div className="text-green-400">{selectedBank.name}</div>
            </div>
            <div>
              <div className="text-green-600">BIC_CODE:</div>
              <div className="text-green-400">{selectedBank.bic}</div>
            </div>
            <div>
              <div className="text-green-600">LOCATION:</div>
              <div className="text-green-400">{selectedBank.city}, {selectedBank.country}</div>
            </div>
            <div>
              <div className="text-green-600">TYPE:</div>
              <div className="text-green-400">{selectedBank.type}</div>
            </div>
            <div>
              <div className="text-green-600">REGION:</div>
              <div className="text-green-400">{selectedBank.region}</div>
            </div>
            <div>
              <div className="text-green-600">CORRESPONDENT:</div>
              <div className={`${selectedBank.correspondent ? 'text-green-400' : 'text-red-400'}`}>
                {selectedBank.correspondent ? 'YES' : 'NO'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="flex items-center justify-between text-xs font-mono text-green-600">
        <div>
          {filteredBanks.length} of {GLOBAL_BANKS.length} banks
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Globe className="h-3 w-3" />
            <span>{COUNTRIES.length} countries</span>
          </div>
          <div className="flex items-center space-x-1">
            <MapPin className="h-3 w-3" />
            <span>{REGIONS.length} regions</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankSelector;