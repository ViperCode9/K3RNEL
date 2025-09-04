/**
 * Comprehensive Global Bank Directory for SWIFT Transfers
 * Real bank names, BIC codes, and country information for authentic simulation
 */

export const GLOBAL_BANKS = [
  // GERMANY
  {
    id: "DEUTDEFFXXX",
    bic: "DEUTDEFFXXX",
    name: "Deutsche Bank AG",
    country: "Germany",
    city: "Frankfurt am Main",
    region: "Europe",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "COBADEFFXXX",
    bic: "COBADEFFXXX", 
    name: "Commerzbank AG",
    country: "Germany",
    city: "Frankfurt am Main",
    region: "Europe",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "DRESDEFFXXX",
    bic: "DRESDEFFXXX",
    name: "Dresdner Bank AG",
    country: "Germany", 
    city: "Dresden",
    region: "Europe",
    type: "Commercial Bank",
    correspondent: false
  },

  // UNITED STATES
  {
    id: "CHASUS33XXX",
    bic: "CHASUS33XXX",
    name: "JPMorgan Chase Bank N.A.",
    country: "United States",
    city: "New York",
    region: "Americas",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "BOFAUS3NXXX",
    bic: "BOFAUS3NXXX",
    name: "Bank of America N.A.",
    country: "United States",
    city: "Charlotte",
    region: "Americas", 
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "CITIUS33XXX",
    bic: "CITIUS33XXX",
    name: "Citibank N.A.",
    country: "United States",
    city: "New York",
    region: "Americas",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "WFBIUS6SXXX",
    bic: "WFBIUS6SXXX",
    name: "Wells Fargo Bank N.A.",
    country: "United States",
    city: "San Francisco",
    region: "Americas",
    type: "Commercial Bank",
    correspondent: true
  },

  // UNITED KINGDOM
  {
    id: "HBUKGB4BXXX",
    bic: "HBUKGB4BXXX",
    name: "HSBC Bank PLC",
    country: "United Kingdom",
    city: "London",
    region: "Europe",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "BARCGB22XXX",
    bic: "BARCGB22XXX",
    name: "Barclays Bank PLC",
    country: "United Kingdom",
    city: "London",
    region: "Europe",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "LOYDGB2LXXX",
    bic: "LOYDGB2LXXX",
    name: "Lloyds Bank PLC",
    country: "United Kingdom",
    city: "London",
    region: "Europe",
    type: "Commercial Bank",
    correspondent: false
  },
  {
    id: "NWBKGB2LXXX",
    bic: "NWBKGB2LXXX",
    name: "National Westminster Bank PLC",
    country: "United Kingdom",
    city: "London",
    region: "Europe",
    type: "Commercial Bank",
    correspondent: true
  },

  // SWITZERLAND
  {
    id: "UBSWCHZHXXX",
    bic: "UBSWCHZHXXX",
    name: "UBS Switzerland AG",
    country: "Switzerland",
    city: "Zurich",
    region: "Europe",
    type: "Investment Bank",
    correspondent: true
  },
  {
    id: "CSGSCHZZ80A",
    bic: "CSGSCHZZ80A",
    name: "Credit Suisse AG",
    country: "Switzerland",
    city: "Zurich",
    region: "Europe",
    type: "Investment Bank",
    correspondent: true
  },

  // FRANCE
  {
    id: "BNPAFRPPXXX",
    bic: "BNPAFRPPXXX",
    name: "BNP Paribas SA",
    country: "France",
    city: "Paris",
    region: "Europe",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "SOGEFRPPXXX",
    bic: "SOGEFRPPXXX",
    name: "Société Générale SA",
    country: "France",
    city: "Paris",
    region: "Europe",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "CRLYFRPPXXX",
    bic: "CRLYFRPPXXX",
    name: "Crédit Lyonnais SA",
    country: "France",
    city: "Paris",
    region: "Europe",
    type: "Commercial Bank",
    correspondent: false
  },

  // JAPAN
  {
    id: "BOTKJPJTXXX",
    bic: "BOTKJPJTXXX",
    name: "MUFG Bank Ltd",
    country: "Japan",
    city: "Tokyo",
    region: "Asia-Pacific",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "SMBCJPJTXXX",
    bic: "SMBCJPJTXXX",
    name: "Sumitomo Mitsui Banking Corporation",
    country: "Japan",
    city: "Tokyo",
    region: "Asia-Pacific",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "MHCBJPJT086",
    bic: "MHCBJPJT086",
    name: "Mizuho Bank Ltd",
    country: "Japan",
    city: "Tokyo",
    region: "Asia-Pacific",
    type: "Commercial Bank",
    correspondent: true
  },

  // CANADA
  {
    id: "ROYCCAT2XXX",
    bic: "ROYCCAT2XXX",
    name: "Royal Bank of Canada",
    country: "Canada",
    city: "Toronto",
    region: "Americas",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "TDOMCATTTOR",
    bic: "TDOMCATTTOR",
    name: "Toronto-Dominion Bank",
    country: "Canada",
    city: "Toronto",
    region: "Americas",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "BOFMCAM2XXX",
    bic: "BOFMCAM2XXX",
    name: "Bank of Montreal",
    country: "Canada",
    city: "Montreal",
    region: "Americas",
    type: "Commercial Bank",
    correspondent: false
  },

  // AUSTRALIA
  {
    id: "ANZBAU3MXXX",
    bic: "ANZBAU3MXXX",
    name: "Australia and New Zealand Banking Group Ltd",
    country: "Australia", 
    city: "Melbourne",
    region: "Asia-Pacific",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "CTBAAU2SXXX",
    bic: "CTBAAU2SXXX",
    name: "Commonwealth Bank of Australia",
    country: "Australia",
    city: "Sydney",
    region: "Asia-Pacific",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "WBCAAU4BXXX",
    bic: "WBCAAU4BXXX",
    name: "Westpac Banking Corporation",
    country: "Australia",
    city: "Sydney",
    region: "Asia-Pacific",
    type: "Commercial Bank",
    correspondent: false
  },

  // SINGAPORE
  {
    id: "DBSSSGSGXXX",
    bic: "DBSSSGSGXXX",
    name: "DBS Bank Ltd",
    country: "Singapore",
    city: "Singapore",
    region: "Asia-Pacific",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "OCBCSGSGXXX",
    bic: "OCBCSGSGXXX",
    name: "Oversea-Chinese Banking Corporation Ltd",
    country: "Singapore",
    city: "Singapore",
    region: "Asia-Pacific",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "UOVBSGSGXXX",
    bic: "UOVBSGSGXXX",
    name: "United Overseas Bank Ltd",
    country: "Singapore",
    city: "Singapore",
    region: "Asia-Pacific",
    type: "Commercial Bank",
    correspondent: false
  },

  // HONG KONG
  {
    id: "HSBCHKHHXXX",
    bic: "HSBCHKHHXXX",
    name: "The Hongkong and Shanghai Banking Corporation Ltd",
    country: "Hong Kong",
    city: "Hong Kong",
    region: "Asia-Pacific",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "SCBLHKHHXXX",
    bic: "SCBLHKHHXXX",
    name: "Standard Chartered Bank (Hong Kong) Ltd",
    country: "Hong Kong",
    city: "Hong Kong",
    region: "Asia-Pacific",
    type: "Commercial Bank",
    correspondent: true
  },

  // INDIA
  {
    id: "SBININBBXXX",
    bic: "SBININBBXXX",
    name: "State Bank of India",
    country: "India",
    city: "Mumbai",
    region: "Asia-Pacific",
    type: "Commercial Bank", 
    correspondent: true
  },
  {
    id: "HDFCINBBXXX",
    bic: "HDFCINBBXXX",
    name: "HDFC Bank Ltd",
    country: "India",
    city: "Mumbai",
    region: "Asia-Pacific",
    type: "Commercial Bank",
    correspondent: false
  },
  {
    id: "ICICINBBXXX",
    bic: "ICICINBBXXX",
    name: "ICICI Bank Ltd",
    country: "India",
    city: "Mumbai",
    region: "Asia-Pacific",
    type: "Commercial Bank",
    correspondent: true
  },

  // CHINA
  {
    id: "ICBKCNBJXXX",
    bic: "ICBKCNBJXXX",
    name: "Industrial and Commercial Bank of China",
    country: "China",
    city: "Beijing",
    region: "Asia-Pacific",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "PCBCCNBJXXX",
    bic: "PCBCCNBJXXX",
    name: "China Construction Bank",
    country: "China",
    city: "Beijing",
    region: "Asia-Pacific",
    type: "Commercial Bank",
    correspondent: false
  },
  {
    id: "ABOCCNBJXXX",
    bic: "ABOCCNBJXXX",
    name: "Agricultural Bank of China",
    country: "China",
    city: "Beijing",
    region: "Asia-Pacific",
    type: "Commercial Bank",
    correspondent: false
  },

  // BRAZIL
  {
    id: "BCBRBRRJXXX",
    bic: "BCBRBRRJXXX",
    name: "Banco do Brasil SA",
    country: "Brazil",
    city: "Brasília",
    region: "Americas",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "ITAUBRSPXXX",
    bic: "ITAUBRSPXXX",
    name: "Itaú Unibanco SA",
    country: "Brazil",
    city: "São Paulo",
    region: "Americas",
    type: "Commercial Bank",
    correspondent: false
  },

  // SOUTH AFRICA
  {
    id: "SBZAZAJJXXX",
    bic: "SBZAZAJJXXX",
    name: "Standard Bank of South Africa Ltd",
    country: "South Africa",
    city: "Johannesburg",
    region: "Africa",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "ABZAZAJJXXX",
    bic: "ABZAZAJJXXX",
    name: "ABSA Bank Ltd",
    country: "South Africa",
    city: "Johannesburg",
    region: "Africa",
    type: "Commercial Bank",
    correspondent: false
  },

  // MAURITIUS (Based on your Deutsche Bank reference)
  {
    id: "BARBMUMUXXX",
    bic: "BARBMUMUXXX",
    name: "Bank of Baroda (Mauritius) Ltd",
    country: "Mauritius",
    city: "Port Louis",
    region: "Africa",
    type: "Commercial Bank",
    correspondent: false
  },
  {
    id: "MAURMUMUXXX",
    bic: "MAURMUMUXXX",
    name: "Mauritius Commercial Bank Ltd",
    country: "Mauritius",
    city: "Port Louis",
    region: "Africa",
    type: "Commercial Bank",
    correspondent: false
  },

  // NETHERLANDS
  {
    id: "INGBNL2AXXX",
    bic: "INGBNL2AXXX",
    name: "ING Bank N.V.",
    country: "Netherlands",
    city: "Amsterdam",
    region: "Europe",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "ABNANL2AXXX",
    bic: "ABNANL2AXXX",
    name: "ABN AMRO Bank N.V.",
    country: "Netherlands",
    city: "Amsterdam",
    region: "Europe",
    type: "Commercial Bank",
    correspondent: true
  },

  // ITALY
  {
    id: "UNCRITM1XXX",
    bic: "UNCRITM1XXX",
    name: "UniCredit SpA",
    country: "Italy",
    city: "Milan",
    region: "Europe",
    type: "Commercial Bank",
    correspondent: false
  },
  {
    id: "BCITITMM001",
    bic: "BCITITMM001",
    name: "Intesa Sanpaolo SpA",
    country: "Italy",
    city: "Turin",
    region: "Europe",
    type: "Commercial Bank",
    correspondent: false
  },

  // SPAIN
  {
    id: "BSCHESMM001",
    bic: "BSCHESMM001",
    name: "Banco Santander SA",
    country: "Spain",
    city: "Madrid",
    region: "Europe",
    type: "Commercial Bank",
    correspondent: true
  },
  {
    id: "CAIXESBBXXX",
    bic: "CAIXESBBXXX",
    name: "CaixaBank SA",
    country: "Spain",
    city: "Barcelona",
    region: "Europe",
    type: "Commercial Bank",
    correspondent: false
  }
];

// Helper functions for bank selection
export const getBanksByCountry = (country) => {
  return GLOBAL_BANKS.filter(bank => bank.country === country);
};

export const getBanksByRegion = (region) => {
  return GLOBAL_BANKS.filter(bank => bank.region === region);
};

export const getCorrespondentBanks = () => {
  return GLOBAL_BANKS.filter(bank => bank.correspondent === true);
};

export const searchBanks = (searchTerm) => {
  const term = searchTerm.toLowerCase();
  return GLOBAL_BANKS.filter(bank => 
    bank.name.toLowerCase().includes(term) ||
    bank.bic.toLowerCase().includes(term) ||
    bank.country.toLowerCase().includes(term) ||
    bank.city.toLowerCase().includes(term)
  );
};

export const getBankByBIC = (bic) => {
  return GLOBAL_BANKS.find(bank => bank.bic === bic);
};

// Countries list for filtering
export const COUNTRIES = [...new Set(GLOBAL_BANKS.map(bank => bank.country))].sort();

// Regions list for filtering  
export const REGIONS = [...new Set(GLOBAL_BANKS.map(bank => bank.region))].sort();

export default GLOBAL_BANKS;