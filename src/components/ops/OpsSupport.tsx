import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SecurityPanel } from '../security/SecurityPanel';
import { StaffPanel } from '../staff/StaffPanel';
import { MaintenancePanel } from '../maintenance/MaintenancePanel';
import './OpsSupport.css';

interface OpsSupportProps {
  defaultTab?: 'security' | 'staff' | 'maintenance';
}

export const OpsSupport: React.FC<OpsSupportProps> = ({ defaultTab = 'security' }) => {
  const [activeTab, setActiveTab] = useState<'security' | 'staff' | 'maintenance'>(defaultTab);
  const location = useLocation();
  const navigate = useNavigate();

  // Sync tab with URL
  useEffect(() => {
    if (location.pathname.includes('/security')) setActiveTab('security');
    else if (location.pathname.includes('/staff')) setActiveTab('staff');
    else if (location.pathname.includes('/maintenance')) setActiveTab('maintenance');
  }, [location.pathname]);

  const handleTabChange = (tab: 'security' | 'staff' | 'maintenance') => {
    setActiveTab(tab);
    navigate(`/${tab}`);
  };

  return (
    <div className="ops-support-container">
      <div className="ops-tabs">
        <button 
          className={`ops-tab ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => handleTabChange('security')}
        >
          SECURITY OPS
        </button>
        <button 
          className={`ops-tab ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => handleTabChange('staff')}
        >
          STAFFING
        </button>
        <button 
          className={`ops-tab ${activeTab === 'maintenance' ? 'active' : ''}`}
          onClick={() => handleTabChange('maintenance')}
        >
          MAINTENANCE
        </button>
      </div>
      
      <div className="ops-content">
        {activeTab === 'security' && <SecurityPanel />}
        {activeTab === 'staff' && <StaffPanel />}
        {activeTab === 'maintenance' && <MaintenancePanel />}
      </div>
    </div>
  );
};
