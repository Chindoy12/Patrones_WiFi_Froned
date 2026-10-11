import { apiClient } from './apiClient';
import type {
  AiPrediction, Alert, AlertStatus, AnalysisResult, AnalysisType, AuthResponse, DashboardSummary, Device,
  Measurement, Network, NetworkReport, ProtocolStatistic, StaffRole, Strategy, TrafficSession, User, Zone,
} from '../types';

export interface NetworkInput {
  zoneId: number;
  ssid: string;
  bssid: string;
  frequencyBand: string;
  channel: number;
  securityType: string;
  dataSourceType: string;
}

export const api = {
  login: (username: string, password: string) =>
    apiClient.post<AuthResponse>('/api/auth/login', { username, password }),
  register: (username: string, password: string) =>
    apiClient.post<AuthResponse>('/api/auth/register', { username, password }),
  me: () => apiClient.get<User>('/api/auth/me'),

  users: () => apiClient.get<User[]>('/api/users'),
  createUser: (username: string, password: string, role: StaffRole) =>
    apiClient.post<User>('/api/users', { username, password, role }),
  changeUserRole: (id: number, role: StaffRole) => apiClient.patch<User>(`/api/users/${id}/role`, { role }),
  deleteUser: (id: number) => apiClient.delete(`/api/users/${id}`),

  dashboard: () => apiClient.get<DashboardSummary>('/api/dashboard/summary'),

  zones: () => apiClient.get<Zone[]>('/api/zones'),
  networks: () => apiClient.get<Network[]>('/api/networks'),
  createNetwork: (input: NetworkInput) => apiClient.post<Network>('/api/networks', input),
  deleteNetwork: (id: number) => apiClient.delete(`/api/networks/${id}`),

  devices: (networkId?: number) => apiClient.get<Device[]>('/api/devices', { networkId }),
  deviceSessions: (deviceId: number) => apiClient.get<TrafficSession[]>(`/api/devices/${deviceId}/sessions`),

  measurements: (networkId: number, query: { from?: string; to?: string; limit?: number } = {}) =>
    apiClient.get<Measurement[]>(`/api/networks/${networkId}/measurements`, query),
  collect: (networkId: number) => apiClient.post<Measurement>(`/api/networks/${networkId}/measurements/collect`),
  protocols: (networkId: number) => apiClient.get<ProtocolStatistic[]>(`/api/networks/${networkId}/protocols`),

  strategies: () => apiClient.get<Strategy[]>('/api/analyses/strategies'),
  analyze: (networkId: number, type: AnalysisType) =>
    apiClient.post<AnalysisResult>(`/api/networks/${networkId}/analyses`, { type }),
  analyses: (networkId?: number, limit = 50) => apiClient.get<AnalysisResult[]>('/api/analyses', { networkId, limit }),
  anomalies: () => apiClient.get<AiPrediction[]>('/api/anomalies'),

  alerts: (status?: AlertStatus) => apiClient.get<Alert[]>('/api/alerts', { status }),
  acknowledgeAlert: (id: number) => apiClient.patch<Alert>(`/api/alerts/${id}/acknowledge`),
  resolveAlert: (id: number) => apiClient.patch<Alert>(`/api/alerts/${id}/resolve`),

  report: (networkId: number, from?: string, to?: string) =>
    apiClient.get<NetworkReport>(`/api/reports/networks/${networkId}`, { from, to }),
  comparison: (networkIds: number[]) =>
    apiClient.get<NetworkReport[]>('/api/reports/comparison', { networkIds: networkIds.join(',') }),
};
