import React from 'react';

const BrandHeader: React.FC = () => (
  <div className="aether-header">
    <span className="aether-logo" title="AETHER">
      {/* SVG mark for AETHER brand */}
      <svg viewBox="0 0 32 32" fill="none">
        <path d="M16 4l8.5 16.5L16 28l-8.5-7.5L16 4z" fill="#7f93f8" stroke="#aeb8d0" strokeWidth="2.2" />
        <circle cx="16" cy="16" r="13" stroke="#465090" strokeWidth="1.3" fill="none" />
      </svg>
    </span>
    <span className="aether-brand-title">AETHER</span>
  </div>
);
export default BrandHeader;
