import React from 'react';
import './PanelSkeleton.css';

export const PanelSkeleton: React.FC = () => {
  return (
    <div className="skeleton-container">
      <div className="skeleton-header">
        <div className="skeleton-title pulse"></div>
        <div className="skeleton-controls pulse"></div>
      </div>
      <div className="skeleton-body">
        <div className="skeleton-row pulse"></div>
        <div className="skeleton-row pulse"></div>
        <div className="skeleton-row pulse"></div>
        <div className="skeleton-row pulse"></div>
        <div className="skeleton-row pulse"></div>
      </div>
    </div>
  );
};
