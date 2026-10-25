import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Detection from './pages/Detection.jsx';
import HistoryPage from './pages/History.jsx';
import Analytics from './pages/Analytics.jsx';
export default function App() {
  return <Routes><Route element={<Layout />}>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/detection" element={<Detection />} />
    <Route path="/history" element={<HistoryPage />} />
    <Route path="/analytics" element={<Analytics />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Route></Routes>;
}
