import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAdmin, RequireAuth, RequireEndUser, RequireStaff } from './auth/guards';
import { Layout } from './components/Layout';
import { AlertsPage } from './pages/AlertsPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { AnomaliesPage } from './pages/AnomaliesPage';
import { DashboardPage } from './pages/DashboardPage';
import { DevicesPage } from './pages/DevicesPage';
import { EndUserHomePage } from './pages/EndUserHomePage';
import { HistoryPage } from './pages/HistoryPage';
import { LoginPage } from './pages/LoginPage';
import { MeasurementsPage } from './pages/MeasurementsPage';
import { NetworksPage } from './pages/NetworksPage';
import { RegisterPage } from './pages/RegisterPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/mi-wifi" element={<RequireAuth><RequireEndUser><EndUserHomePage /></RequireEndUser></RequireAuth>} />
          <Route element={<RequireAuth><RequireStaff><Layout /></RequireStaff></RequireAuth>}>
            <Route index element={<DashboardPage />} />
            <Route path="networks" element={<NetworksPage />} />
            <Route path="devices" element={<DevicesPage />} />
            <Route path="measurements" element={<MeasurementsPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="analysis" element={<AnalysisPage />} />
            <Route path="anomalies" element={<AnomaliesPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="users" element={<RequireAdmin><UsersPage /></RequireAdmin>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
