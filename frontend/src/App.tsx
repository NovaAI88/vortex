import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import StatusPage from './pages/StatusPage';
import PositionPage from './pages/PositionPage';
import PortfolioPage from './pages/PortfolioPage';
import PageLayout from './components/PageLayout';

const App: React.FC = () => (
  <Router>
    <PageLayout>
      <Routes>
        <Route path='/' element={<DashboardPage />} />
        <Route path='/status' element={<StatusPage />} />
        <Route path='/position' element={<PositionPage />} />
        <Route path='/portfolio' element={<PortfolioPage />} />
      </Routes>
    </PageLayout>
  </Router>
);

export default App;
