// Minimal in-memory alert store for runtime alerts
export interface Alert {
  timestamp: string;
  severity: 'info'|'warning'|'error';
  source: string;
  message: string;
}

const MAX_ALERTS = 100;
let alerts: Alert[] = [];

export function appendAlert(alert: Alert) {
  alerts.unshift(alert); // Newest-first order
  if (alerts.length > MAX_ALERTS) alerts = alerts.slice(0, MAX_ALERTS);
}

export function getRecentAlerts(): Alert[] {
  return alerts.slice(0, MAX_ALERTS);
}
