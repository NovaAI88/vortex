import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PageLayout from './components/PageLayout';
import DashboardPage from './pages/DashboardPage';
import MarketTerminalPage from './pages/MarketTerminalPage';
import AiAnalysisPage from './pages/AiAnalysisPage';
import NewsIntelligencePage from './pages/NewsIntelligencePage';
import SentimentPage from './pages/SentimentPage';
import TechnicalAnalysisPage from './pages/TechnicalAnalysisPage';
import NarrativeEdgePage from './pages/NarrativeEdgePage';
import PortfolioPage from './pages/PortfolioPage';
import AlertsPage from './pages/AlertsPage';
import BacktestPage from './pages/BacktestPage';
import StatusPage from './pages/StatusPage';
import StrategyPage from './pages/StrategyPage';
import faviconAsset from './assets/logo/aether-favicon.svg';

function App() {
  React.useEffect(() => {
    const existing = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (existing) {
      existing.href = faviconAsset;
      existing.type = 'image/svg+xml';
      return;
    }

    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = faviconAsset;
    document.head.appendChild(link);
  }, []);

  return (
    <Router>
      <PageLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/market" element={<MarketTerminalPage />} />
          <Route path="/ai" element={<AiAnalysisPage />} />
          <Route path="/news" element={<NewsIntelligencePage />} />
          <Route path="/sentiment" element={<SentimentPage />} />
          <Route path="/ta" element={<TechnicalAnalysisPage />} />
          <Route path="/narrative" element={<NarrativeEdgePage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/strategy" element={<StrategyPage />} />
          <Route path="/strategies" element={<Navigate to="/strategy" replace />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/backtest" element={<BacktestPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageLayout>
    </Router>
  );
}

export default App;
