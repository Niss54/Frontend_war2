import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BaggagePanel } from '../../modules/paxbag/baggage/BaggagePanel';
import { PassengerPanel } from '../../modules/paxbag/passengers/PassengerPanel';
import './PaxBagOperations.css';

interface PaxBagOperationsProps {
  defaultTab?: 'baggage' | 'passengers';
}

export const PaxBagOperations: React.FC<PaxBagOperationsProps> = ({ defaultTab = 'baggage' }) => {
  const [activeTab, setActiveTab] = useState<'baggage' | 'passengers'>(defaultTab);
  const location = useLocation();
  const navigate = useNavigate();

  // Sync tab with URL
  useEffect(() => {
    if (location.pathname.includes('/baggage')) setActiveTab('baggage');
    else if (location.pathname.includes('/passengers')) setActiveTab('passengers');
    // We treat /staff or /retail separately, or they can be future additions.
  }, [location.pathname]);

  const handleTabChange = (tab: 'baggage' | 'passengers') => {
    setActiveTab(tab);
    navigate(`/${tab}`);
  };

  return (
    <div className="paxbag-container">
      <div className="paxbag-tabs">
        <button 
          className={`paxbag-tab ${activeTab === 'baggage' ? 'active' : ''}`}
          onClick={() => handleTabChange('baggage')}
        >
          BAGGAGE OPERATIONS
        </button>
        <button 
          className={`paxbag-tab ${activeTab === 'passengers' ? 'active' : ''}`}
          onClick={() => handleTabChange('passengers')}
        >
          PASSENGER FLOW
        </button>
      </div>
      
      <div className="paxbag-content">
        {activeTab === 'baggage' && <BaggagePanel />}
        {activeTab === 'passengers' && <PassengerPanel />}
      </div>
    </div>
  );
};
