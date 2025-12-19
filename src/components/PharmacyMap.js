import React, { useState, useEffect } from 'react';
import '../styles/PharmacyMap.css';

// Common medicines list for detection
export const medicineList = [
  'doliprane', 'paracetamol', 'paracétamol', 'aspirine', 'aspirin', 'ibuprofène', 'ibuprofen', 'ibuprofene',
  'amoxicilline', 'amoxicillin', 'omeprazole', 'oméprazole', 'metformine', 'metformin',
  'atorvastatine', 'atorvastatin', 'losartan', 'amlodipine', 'ventoline', 'salbutamol',
  'loratadine', 'cetirizine', 'cétirizine', 'augmentin', 'clamoxyl', 'flagyl', 'ciprofloxacine',
  'azithromycine', 'azithromycin', 'prednisolone', 'prednisone', 'dexamethasone',
  'pantoprazole', 'esomeprazole', 'ranitidine', 'tramadol', 'codeine', 'codéine',
  'diclofenac', 'voltarene', 'voltaren', 'ketoprofene', 'kétoprofène', 'naproxen',
  'levothyrox', 'levothyroxine', 'methotrexate', 'insuline', 'insulin',
  'lisinopril', 'enalapril', 'ramipril', 'bisoprolol', 'atenolol', 'carvedilol',
  'furosemide', 'hydrochlorothiazide', 'spironolactone', 'simvastatine', 'simvastatin',
  'clopidogrel', 'warfarine', 'warfarin', 'rivaroxaban', 'apixaban',
  'sertraline', 'fluoxetine', 'paroxetine', 'escitalopram', 'venlafaxine',
  'alprazolam', 'diazepam', 'lorazepam', 'zolpidem', 'clonazepam',
  'gabapentine', 'gabapentin', 'pregabaline', 'pregabalin', 'carbamazepine',
  'metoclopramide', 'domperidone', 'ondansetron', 'loperamide', 'imodium',
  'montelukast', 'fluticasone', 'budesonide', 'beclometasone',
  'aciclovir', 'valaciclovir', 'fluconazole', 'itraconazole', 'terbinafine',
  'doxycycline', 'minocycline', 'erythromycine', 'clarithromycine', 'clindamycine',
  'gentamicine', 'amikacine', 'vancomycine', 'meropenem', 'imipenem'
];

// Generate random stock for a medicine
const generateStock = () => Math.floor(Math.random() * 80) + 5;

// Tunisia pharmacy data by region with IDs
const tunisiaPharmacies = {
  tunis: {
    name: 'Tunis',
    x: 68, y: 10,
    pharmacies: [
      { id: 1, name: 'Pharmacie Centrale Tunis', address: 'Avenue Habib Bourguiba', phone: '+216 71 123 456', open24h: true },
      { id: 2, name: 'Pharmacie Pasteur', address: 'Rue de Rome', phone: '+216 71 234 567', open24h: false },
      { id: 3, name: 'Pharmacie El Manar', address: 'El Manar 2', phone: '+216 71 345 678', open24h: true },
      { id: 4, name: 'Pharmacie Lac', address: 'Les Berges du Lac', phone: '+216 71 456 789', open24h: true },
    ]
  },
  ariana: {
    name: 'Ariana',
    x: 70, y: 8,
    pharmacies: [
      { id: 5, name: 'Pharmacie Ariana Centre', address: 'Avenue de la Liberté', phone: '+216 71 456 789', open24h: true },
      { id: 6, name: 'Pharmacie Ennasr', address: 'Ennasr 1', phone: '+216 71 567 890', open24h: false },
    ]
  },
  sousse: {
    name: 'Sousse',
    x: 73, y: 27,
    pharmacies: [
      { id: 7, name: 'Pharmacie Sousse Centre', address: 'Avenue Habib Bourguiba', phone: '+216 73 123 456', open24h: true },
      { id: 8, name: 'Pharmacie Sahloul', address: 'Sahloul', phone: '+216 73 234 567', open24h: true },
      { id: 9, name: 'Pharmacie Médina', address: 'Médina Sousse', phone: '+216 73 345 678', open24h: false },
    ]
  },
  sfax: {
    name: 'Sfax',
    x: 72, y: 42,
    pharmacies: [
      { id: 10, name: 'Pharmacie Sfax Centre', address: 'Avenue Farhat Hached', phone: '+216 74 123 456', open24h: true },
      { id: 11, name: 'Pharmacie Route de Tunis', address: 'Route de Tunis', phone: '+216 74 234 567', open24h: false },
      { id: 12, name: 'Pharmacie Thyna', address: 'Thyna', phone: '+216 74 345 678', open24h: true },
    ]
  },
  bizerte: {
    name: 'Bizerte',
    x: 65, y: 4,
    pharmacies: [
      { id: 13, name: 'Pharmacie Bizerte Centre', address: 'Rue de la République', phone: '+216 72 123 456', open24h: true },
      { id: 14, name: 'Pharmacie Corniche', address: 'Route de la Corniche', phone: '+216 72 234 567', open24h: false },
    ]
  },
  nabeul: {
    name: 'Nabeul',
    x: 76, y: 16,
    pharmacies: [
      { id: 15, name: 'Pharmacie Nabeul', address: 'Avenue Habib Bourguiba', phone: '+216 72 234 567', open24h: false },
      { id: 16, name: 'Pharmacie Hammamet', address: 'Zone Touristique', phone: '+216 72 345 678', open24h: true },
    ]
  },
  monastir: {
    name: 'Monastir',
    x: 74, y: 25,
    pharmacies: [
      { id: 17, name: 'Pharmacie Monastir', address: 'Avenue Habib Bourguiba', phone: '+216 73 345 678', open24h: true },
      { id: 18, name: 'Pharmacie Marina', address: 'Port de Monastir', phone: '+216 73 456 789', open24h: false },
    ]
  },
  kairouan: {
    name: 'Kairouan',
    x: 65, y: 29,
    pharmacies: [
      { id: 19, name: 'Pharmacie Kairouan Centre', address: 'Avenue de la République', phone: '+216 77 123 456', open24h: true },
      { id: 20, name: 'Pharmacie Médina', address: 'Médina Kairouan', phone: '+216 77 234 567', open24h: false },
    ]
  },
  gabes: {
    name: 'Gabès',
    x: 68, y: 55,
    pharmacies: [
      { id: 21, name: 'Pharmacie Gabès', address: 'Avenue Farhat Hached', phone: '+216 75 123 456', open24h: true },
      { id: 22, name: 'Pharmacie Oasis', address: 'Chenini Gabès', phone: '+216 75 234 567', open24h: false },
    ]
  },
  medenine: {
    name: 'Médenine',
    x: 72, y: 62,
    pharmacies: [
      { id: 23, name: 'Pharmacie Médenine', address: 'Centre Ville', phone: '+216 75 234 567', open24h: false },
      { id: 24, name: 'Pharmacie Djerba', address: 'Houmt Souk, Djerba', phone: '+216 75 345 678', open24h: true },
      { id: 25, name: 'Pharmacie Zarzis', address: 'Centre Zarzis', phone: '+216 75 456 789', open24h: true },
    ]
  },
  gafsa: {
    name: 'Gafsa',
    x: 48, y: 45,
    pharmacies: [
      { id: 26, name: 'Pharmacie Gafsa', address: 'Avenue Habib Bourguiba', phone: '+216 76 123 456', open24h: true },
    ]
  },
  tozeur: {
    name: 'Tozeur',
    x: 38, y: 52,
    pharmacies: [
      { id: 27, name: 'Pharmacie Tozeur', address: 'Avenue Abou el Kacem Chebbi', phone: '+216 76 234 567', open24h: true },
    ]
  },
  tataouine: {
    name: 'Tataouine',
    x: 65, y: 72,
    pharmacies: [
      { id: 28, name: 'Pharmacie Tataouine', address: 'Centre Ville', phone: '+216 75 567 890', open24h: true },
    ]
  },
  beja: {
    name: 'Béja',
    x: 58, y: 11,
    pharmacies: [
      { id: 29, name: 'Pharmacie Béja Centre', address: 'Avenue Habib Bourguiba', phone: '+216 78 123 456', open24h: true },
    ]
  },
  jendouba: {
    name: 'Jendouba',
    x: 52, y: 10,
    pharmacies: [
      { id: 30, name: 'Pharmacie Jendouba', address: 'Centre Ville', phone: '+216 78 234 567', open24h: false },
    ]
  },
};

function PharmacyMap({ onClose, medicineName = null }) {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [filter24h, setFilter24h] = useState(false);
  const [filterInStock, setFilterInStock] = useState(false);
  const [pharmacyStocks, setPharmacyStocks] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [animateNodes, setAnimateNodes] = useState(false);

  // Generate medicine stocks on mount
  useEffect(() => {
    // Always generate stocks (will only show if medicineName is provided)
    const stocks = {};
    Object.values(tunisiaPharmacies).forEach(region => {
      region.pharmacies.forEach(pharmacy => {
        // 70% chance to have stock
        const hasStock = Math.random() > 0.3;
        stocks[pharmacy.id] = hasStock ? generateStock() : 0;
      });
    });
    setPharmacyStocks(stocks);
    
    // Trigger entrance animations
    const timer1 = setTimeout(() => setIsLoaded(true), 50);
    const timer2 = setTimeout(() => setAnimateNodes(true), 300);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [medicineName]);

  const handleRegionClick = (regionKey) => {
    setSelectedRegion(selectedRegion === regionKey ? null : regionKey);
  };

  const getPharmaciesWithStock = (pharmacies) => {
    return pharmacies.map(p => ({
      ...p,
      stock: pharmacyStocks[p.id] || 0
    }));
  };

  const filteredPharmacies = selectedRegion 
    ? getPharmaciesWithStock(tunisiaPharmacies[selectedRegion].pharmacies)
        .filter(p => !filter24h || p.open24h)
        .filter(p => !filterInStock || p.stock > 0)
    : [];

  // Count total pharmacies with stock
  const totalWithStock = Object.values(pharmacyStocks).filter(s => s > 0).length;
  const totalPharmacies = Object.values(tunisiaPharmacies).reduce((acc, r) => acc + r.pharmacies.length, 0);

  // Get stock level class
  const getStockClass = (stock) => {
    if (stock === 0) return 'out-of-stock';
    if (stock < 15) return 'low-stock';
    if (stock < 40) return 'medium-stock';
    return 'high-stock';
  };

  return (
    <div className={`pharmacy-map-overlay ${isLoaded ? 'loaded' : ''}`}>
      <div className="pharmacy-map-container">
        {/* Header */}
        <div className="pharmacy-map-header">
          <div className="pharmacy-header-title">
            <span className="pharmacy-icon">💊</span>
            <div className="header-text">
              <h2>Disponibilité Pharmacies</h2>
              {medicineName && (
                <div className="medicine-badge">
                  <span className="medicine-pill">💊</span>
                  <span className="medicine-name">{medicineName}</span>
                </div>
              )}
            </div>
          </div>
          <button className="pharmacy-close-btn" onClick={onClose}>
            <span>✕</span>
          </button>
        </div>

        {/* Stats bar */}
        {medicineName && (
          <div className="pharmacy-stats">
            <div className="stat-item available">
              <span className="stat-icon">✅</span>
              <span className="stat-number">{totalWithStock}</span>
              <span className="stat-label">En stock</span>
            </div>
            <div className="stat-item total">
              <span className="stat-icon">🏥</span>
              <span className="stat-number">{totalPharmacies}</span>
              <span className="stat-label">Pharmacies</span>
            </div>
            <div className="stat-item cities">
              <span className="stat-icon">📍</span>
              <span className="stat-number">{Object.keys(tunisiaPharmacies).length}</span>
              <span className="stat-label">Villes</span>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="pharmacy-filter">
          <button 
            className={`filter-btn ${!filter24h && !filterInStock ? 'active' : ''}`}
            onClick={() => { setFilter24h(false); setFilterInStock(false); }}
          >
            <span>📋</span> Toutes
          </button>
          <button 
            className={`filter-btn ${filter24h ? 'active' : ''}`}
            onClick={() => setFilter24h(!filter24h)}
          >
            <span>🌙</span> 24h/24
          </button>
          {medicineName && (
            <button 
              className={`filter-btn in-stock-filter ${filterInStock ? 'active' : ''}`}
              onClick={() => setFilterInStock(!filterInStock)}
            >
              <span>✅</span> En stock
            </button>
          )}
        </div>

        {/* Content */}
        <div className="pharmacy-content">
          {/* Map */}
          <div className="pharmacy-map">
            <svg viewBox="0 0 100 95" className="tunisia-map-svg">
              <defs>
                {/* Gradient for Tunisia */}
                <linearGradient id="tunisiaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(90, 155, 213, 0.25)" />
                  <stop offset="50%" stopColor="rgba(60, 120, 180, 0.2)" />
                  <stop offset="100%" stopColor="rgba(42, 74, 106, 0.15)" />
                </linearGradient>
                {/* Glow filter for nodes */}
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                {/* Drop shadow */}
                <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3"/>
                </filter>
              </defs>
              
              {/* Tunisia realistic outline */}
              <path 
                className="tunisia-outline"
                d="M63 1 L68 2 L73 3 L77 5 L80 8 L82 12 L83 17 L82 22 
                   L80 26 L78 30 L76 34 L75 38 L74 43 L73 48 L72 53 
                   L70 58 L68 63 L66 68 L65 73 L67 78 L70 83 L68 88 
                   L64 91 L58 93 L52 91 L47 87 L44 82 L42 76 L40 70 
                   L38 64 L36 58 L33 52 L30 46 L32 40 L35 34 L38 28 
                   L42 22 L46 16 L50 10 L54 5 L58 2 L63 1 Z"
                fill="url(#tunisiaGradient)"
                stroke="rgba(90, 155, 213, 0.5)"
                strokeWidth="0.6"
              />
              
              {/* Cap Bon peninsula */}
              <path 
                className="tunisia-detail"
                d="M78 14 L82 16 L84 19 L83 22 L80 24 L77 22 L76 18 L78 14 Z"
                fill="url(#tunisiaGradient)"
                stroke="rgba(90, 155, 213, 0.4)"
                strokeWidth="0.4"
              />
              
              {/* Djerba island */}
              <ellipse 
                className="tunisia-detail djerba"
                cx="76" cy="62" rx="4" ry="2.5"
                fill="url(#tunisiaGradient)"
                stroke="rgba(90, 155, 213, 0.4)"
                strokeWidth="0.4"
              />
              
              {/* Sea label */}
              <text x="88" y="30" className="sea-label">Mer</text>
              <text x="83" y="35" className="sea-label">Méditerranée</text>
              
              {/* Region nodes */}
              {Object.entries(tunisiaPharmacies).map(([key, region], index) => {
                const hasStockInRegion = medicineName && region.pharmacies.some(p => pharmacyStocks[p.id] > 0);
                const isSelected = selectedRegion === key;
                
                return (
                  <g 
                    key={key} 
                    className={`region-node ${animateNodes ? 'animate-in' : ''} ${hasStockInRegion ? 'has-stock' : ''}`} 
                    onClick={() => handleRegionClick(key)}
                    style={{ animationDelay: `${index * 0.06}s` }}
                  >
                    {/* Outer glow for regions with stock */}
                    {hasStockInRegion && (
                      <circle 
                        cx={region.x} 
                        cy={region.y} 
                        r="6"
                        className="stock-glow"
                      />
                    )}
                    
                    {/* Main circle */}
                    <circle 
                      cx={region.x} 
                      cy={region.y} 
                      r={isSelected ? 3.5 : 2.5}
                      className={`region-circle ${isSelected ? 'selected' : ''} ${hasStockInRegion ? 'in-stock' : ''}`}
                      filter="url(#dropShadow)"
                    />
                    
                    {/* Label */}
                    <text 
                      x={region.x} 
                      y={region.y - 5} 
                      className={`region-label ${isSelected ? 'selected' : ''}`}
                    >
                      {region.name}
                    </text>
                    
                    {/* Pulse animations for selected */}
                    {isSelected && (
                      <>
                        <circle cx={region.x} cy={region.y} r="3" className="region-pulse pulse-1" />
                        <circle cx={region.x} cy={region.y} r="3" className="region-pulse pulse-2" />
                        <circle cx={region.x} cy={region.y} r="3" className="region-pulse pulse-3" />
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
            
            {!selectedRegion && (
              <div className="map-hint">
                <span className="hint-icon">👆</span>
                <span>Sélectionnez une ville</span>
              </div>
            )}
          </div>

          {/* Pharmacy list */}
          <div className={`pharmacy-list ${selectedRegion ? 'visible' : ''}`}>
            {selectedRegion && (
              <>
                <div className="list-header">
                  <h3 className="list-title">
                    <span className="list-icon">📍</span>
                    <span className="city-name">{tunisiaPharmacies[selectedRegion].name}</span>
                  </h3>
                  <span className="pharmacy-count">{filteredPharmacies.length}</span>
                </div>
                
                <div className="pharmacy-cards">
                  {filteredPharmacies.length > 0 ? (
                    filteredPharmacies.map((pharmacy, index) => (
                      <div 
                        key={pharmacy.id} 
                        className={`pharmacy-card ${medicineName ? (pharmacy.stock > 0 ? 'has-stock' : 'no-stock') : ''}`}
                        style={{ animationDelay: `${index * 0.08}s` }}
                      >
                        <div className="pharmacy-card-header">
                          <span className="pharmacy-name">{pharmacy.name}</span>
                          <div className="pharmacy-badges">
                            {pharmacy.open24h && <span className="badge-24h">24h</span>}
                          </div>
                        </div>
                        
                        {/* Medicine stock info */}
                        {medicineName && (
                          <div className={`stock-info ${getStockClass(pharmacy.stock)}`}>
                            {pharmacy.stock > 0 ? (
                              <>
                                <div className="stock-indicator">
                                  <span className="stock-dot"></span>
                                  <span className="stock-text">En stock</span>
                                </div>
                                <div className="stock-quantity">
                                  <span className="qty-number">{pharmacy.stock}</span>
                                  <span className="qty-label">unités</span>
                                </div>
                              </>
                            ) : (
                              <div className="stock-indicator out">
                                <span className="stock-dot"></span>
                                <span className="stock-text">Rupture de stock</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="pharmacy-card-body">
                          <p className="pharmacy-address">
                            <span className="info-icon">📍</span>
                            {pharmacy.address}
                          </p>
                          <p className="pharmacy-phone">
                            <span className="info-icon">📞</span>
                            {pharmacy.phone}
                          </p>
                        </div>
                        
                        <div className="pharmacy-actions">
                          <a href={`tel:${pharmacy.phone}`} className="action-btn call-btn">
                            <span>📞</span> Appeler
                          </a>
                          <a 
                            href={`https://maps.google.com/?q=${encodeURIComponent(pharmacy.name + ' ' + pharmacy.address + ' Tunisia')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="action-btn map-btn"
                          >
                            <span>🗺️</span> Itinéraire
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-results">
                      <span className="no-results-icon">🔍</span>
                      <p>Aucune pharmacie trouvée</p>
                      <span className="no-results-hint">Modifiez les filtres</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PharmacyMap;
