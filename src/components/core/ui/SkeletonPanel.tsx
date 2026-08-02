import React from 'react';
import './SkeletonPanel.css';

export const SkeletonPanel: React.FC = () => {
  return (
    <div className="skeleton-container">
      <div className="skeleton-row"></div>
      <div className="skeleton-row"></div>
      <div className="skeleton-row"></div>
    </div>
  );
};
