import { type ComponentType, lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAdmin, RequireAuth, RequireEndUser, RequireStaff } from './auth/guards';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

/*
 * Each area loads only when someone enters it: an end user never downloads the team pages (nor the chart library
 * they use), and the login screen opens faster for everyone.
 */
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((module) => ({ default: module[name] })));

const Layout = page(() => import('./components/Layout'), 'Layout');
const ForgotPasswordPage = page(() => import('./pages/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = page(() => import('./pages/ResetPasswordPage'), 'ResetPasswordPage');
const EndUserHomePage = page(() => import('./pages/EndUserHomePage'), 'EndUserHomePage');
const DashboardPage = page(() => import('./pages/DashboardPage'), 'DashboardPage');
const NetworksPage = page(() => import('./pages/NetworksPage'), 'NetworksPage');
const DevicesPage = page(() => import('./pages/DevicesPage'), 'DevicesPage');
const MeasurementsPage = page(() => import('./pages/MeasurementsPage'), 'MeasurementsPage');
const HistoryPage = page(() => import('./pages/HistoryPage'), 'HistoryPage');
const AnalysisPage = page(() => import('./pages/AnalysisPage'), 'AnalysisPage');
const AnomaliesPage = page(() => import('./pages/AnomaliesPage'), 'AnomaliesPage');
const AiModelPage = page(() => import('./pages/AiModelPage'), 'AiModelPage');
const AlertsPage = page(() => import('./pages/AlertsPage'), 'AlertsPage');
const ReportsPage = page(() => import('./pages/ReportsPage'), 'ReportsPage');
const UsersPage = page(() => import('./pages/UsersPage'), 'UsersPage');

function Loading() {
  return <p className="notice page-loading" role="status" aria-busy="true">Cargando…</p>;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/recuperar" element={<ForgotPasswordPage />} />
            <Route path="/restablecer" element={<ResetPasswordPage />} />
            <Route path="/mi-wifi" element={<RequireAuth><RequireEndUser><EndUserHomePage /></RequireEndUser></RequireAuth>} />
            <Route element={<RequireAuth><RequireStaff><Layout /></RequireStaff></RequireAuth>}>
              <Route index element={<DashboardPage />} />
              <Route path="networks" element={<NetworksPage />} />
              <Route path="devices" element={<DevicesPage />} />
              <Route path="measurements" element={<MeasurementsPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="analysis" element={<AnalysisPage />} />
              <Route path="anomalies" element={<AnomaliesPage />} />
              <Route path="ai-model" element={<AiModelPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="users" element={<RequireAdmin><UsersPage /></RequireAdmin>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
