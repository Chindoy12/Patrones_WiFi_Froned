import { apiClient } from './apiClient';
import { sealPassword } from './passwordCipher';
import type {
  AgentKeyCreated, AgentOverview, AiModelOverview, AiPrediction, Alert, AlertStatus, AnalysisResult, AnalysisType, AnomalyCauseCount, AuthResponse,
  ConnectionTest, ConnectionTestInput, DashboardSummary, Device, HomeNetwork, HomeNetworkInput, Measurement, Network,
  NetworkQuality, NetworkReport, ProtocolStatistic, StaffRole, Strategy, SystemStatus, TrafficSession, User, Zone,
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
  // Passwords always leave the browser sealed (see passwordCipher), never as readable text.
  login: async (username: string, password: string) =>
    apiClient.post<AuthResponse>('/api/auth/login', { username, ...(await sealPassword(password)) }),
  register: async (username: string, password: string) =>
    apiClient.post<AuthResponse>('/api/auth/register', { username, ...(await sealPassword(password)) }),
  me: () => apiClient.get<User>('/api/auth/me'),

  users: () => apiClient.get<User[]>('/api/users'),
  createUser: async (username: string, password: string, role: StaffRole) =>
    apiClient.post<User>('/api/users', { username, role, ...(await sealPassword(password)) }),
  changeUserRole: (id: number, role: StaffRole) => apiClient.patch<User>(`/api/users/${id}/role`, { role }),
  deleteUser: (id: number) => apiClient.delete(`/api/users/${id}`),

  // End-user area: the backend scopes every call to the signed-in owner.
  myNetworks: () => apiClient.get<HomeNetwork[]>('/api/my/networks'),
  createMyNetwork: (input: HomeNetworkInput) => apiClient.post<HomeNetwork>('/api/my/networks', input),
  updateMyNetwork: (id: number, input: HomeNetworkInput) => apiClient.put<HomeNetwork>(`/api/my/networks/${id}`, input),
  myTests: (networkId: number, limit = 10) =>
    apiClient.get<ConnectionTest[]>(`/api/my/networks/${networkId}/tests`, { limit }),
  saveMyTest: (networkId: number, input: ConnectionTestInput) =>
    apiClient.post<ConnectionTest>(`/api/my/networks/${networkId}/tests`, input),
  deleteMyNetwork: (id: number) => apiClient.delete(`/api/my/networks/${id}`),
  myAgent: (networkId: number) => apiClient.get<AgentOverview>(`/api/my/networks/${networkId}/agent`),
  createAgentKey: (networkId: number) => apiClient.post<AgentKeyCreated>(`/api/my/networks/${networkId}/agent/key`),
  revokeAgentKey: (networkId: number) => apiClient.delete(`/api/my/networks/${networkId}/agent/key`),

  dashboard: () => apiClient.get<DashboardSummary>('/api/dashboard/summary'),
  systemStatus: () => apiClient.get<SystemStatus>('/api/dashboard/status'),
  networkQuality: (networkId: number) => apiClient.get<NetworkQuality>(`/api/networks/${networkId}/quality`),

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
  anomalyCauses: (days = 30) => apiClient.get<AnomalyCauseCount[]>('/api/anomalies/causes', { days }),
  aiModel: () => apiClient.get<AiModelOverview>('/api/ai/model'),

  alerts: (status?: AlertStatus) => apiClient.get<Alert[]>('/api/alerts', { status }),
  acknowledgeAlert: (id: number) => apiClient.patch<Alert>(`/api/alerts/${id}/acknowledge`),
  resolveAlert: (id: number) => apiClient.patch<Alert>(`/api/alerts/${id}/resolve`),

  report: (networkId: number, from?: string, to?: string) =>
    apiClient.get<NetworkReport>(`/api/reports/networks/${networkId}`, { from, to }),
  comparison: (networkIds: number[]) =>
    apiClient.get<NetworkReport[]>('/api/reports/comparison', { networkIds: networkIds.join(',') }),
};
