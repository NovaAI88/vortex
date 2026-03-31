const explicitApiBase = process.env.REACT_APP_API_BASE?.trim();

export const API_BASE = explicitApiBase && explicitApiBase.length > 0
  ? explicitApiBase.replace(/\/$/, '')
  : 'http://localhost:3000';
