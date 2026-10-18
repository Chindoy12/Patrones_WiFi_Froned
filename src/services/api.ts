import { apiClient } from './apiClient';
import { sealPassword } from './passwordCipher';
import type {
  Account, AgentDevice, AgentOverview, AgentPairingCode, AlertPreferences, AiModelOverview, AiPrediction, Alert, AlertStatus, AnalysisResult, AnalysisType, AnomalyCauseCount, AuthResponse,
  ConnectionTest, ConnectionTestInput, DashboardSummary, DataSourceType, Device, HomeNetwork, HomeNetworkInput, Location,
  Measurement, Network, NetworkQuality, NetworkReport, ProtocolStatistic, SensorStatus, StaffRole, Strategy, SystemStatus,
  TeamNetworks, TrafficSession, User, Zone,
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

export interface RegisterContact {
  email?: string;
  phone?: string;
}

export const api = {
  // Passwords always leave the browser sealed (see passwordCipher), never as readable text.
  login: async (username: string, password: string) =>
    apiClient.post<AuthResponse>('/api/auth/login', { username, ...(await sealPassword(password)) }),
  register: async (username: string, password: string, contact: RegisterContact = {}) =>
    apiClient.post<AuthResponse>('/api/auth/register', { username, ...contact, ...(await sealPassword(password)) }),
  // Recovery: the answer never says whether the email has an account.
  forgotPassword: (email: string) => apiClient.post<{ message: string }>('/api/auth/password/forgot', { email }),
  resetPassword: async (token: string, password: string) =>
    apiClient.post<void>('/api/auth/password/reset', { token, ...(await sealPassword(password)) }),
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
  myAccount: () => apiClient.get<Account>('/api/my/account'),
  updateMyContact: async (email: string, phone: string | null, password: string) =>
    apiClient.put<Account>('/api/my/account/contact', { email, phone, ...(await sealPassword(password)) }),
  changeMyPassword: async (current: string, next: string) => {
    const sealedCurrent = await sealPassword(current);
    const sealedNext = await sealPassword(next);
    return apiClient.put<AuthResponse>('/api/my/account/password', {
      currentChallengeId: sealedCurrent.challengeId, currentEncryptedPassword: sealedCurrent.encryptedPassword,
      newChallengeId: sealedNext.challengeId, newEncryptedPassword: sealedNext.encryptedPassword,
    });
  },
  createAgentPairingCode: (networkId: number) =>
    apiClient.post<AgentPairingCode>(`/api/my/networks/${networkId}/agent/pairing`),
  updateAgentDevice: (networkId: number, fingerprint: string, change: { label?: string | null; authorized?: boolean }) =>
    apiClient.put<AgentDevice>(`/api/my/networks/${networkId}/agent/devices/${fingerprint}`, change),
  alertPreferences: () => apiClient.get<AlertPreferences>('/api/my/alerts'),
  updateAlertPreferences: (prefs: AlertPreferences) => apiClient.put<AlertPreferences>('/api/my/alerts', prefs),
  myAgent: (networkId: number) => apiClient.get<AgentOverview>(`/api/my/networks/${networkId}/agent`),
  revokeAgentKey: (networkId: number) => apiClient.delete(`/api/my/networks/${networkId}/agent/key`),

  dashboard: () => apiClient.get<DashboardSummary>('/api/dashboard/summary'),
  /** Real home networks of the end users (ADMIN and ANALYST). */
  teamNetworks: () => apiClient.get<TeamNetworks>('/api/home-networks'),
  systemStatus: () => apiClient.get<SystemStatus>('/api/dashboard/status'),
  networkQuality: (networkId: number) => apiClient.get<NetworkQuality>(`/api/networks/${networkId}/quality`),

  zones: () => apiClient.get<Zone[]>('/api/zones'),
  locations: () => apiClient.get<Location[]>('/api/locations'),
  createLocation: (input: { name: string; city?: string }) => apiClient.post<Location>('/api/locations', input),
  createZone: (locationId: number, input: { name: string; floor?: number | null }) =>
    apiClient.post<Zone>(`/api/locations/${locationId}/zones`, input),
  networks: () => apiClient.get<Network[]>('/api/networks'),
  createNetwork: (input: NetworkInput) => apiClient.post<Network>('/api/networks', input),
  deleteNetwork: (id: number) => apiClient.delete(`/api/networks/${id}`),
  /** Data sources the form can offer: the sensor (and the demo ones only in a local demo). */
  networkSources: () => apiClient.get<DataSourceType[]>('/api/networks/sources'),
  sensor: (networkId: number) => apiClient.get<SensorStatus>(`/api/networks/${networkId}/sensor`),
  sensorPairing: (networkId: number) => apiClient.post<AgentPairingCode>(`/api/networks/${networkId}/sensor/pairing`),
  removeSensor: (networkId: number) => apiClient.delete(`/api/networks/${networkId}/sensor`),
  /** Latest report of the sensor with the AI verdicts, recent history and the devices it sees (as in Mi Wi-Fi). */
  sensorOverview: (networkId: number) => apiClient.get<AgentOverview>(`/api/networks/${networkId}/sensor/overview`),
  updateSensorDevice: (networkId: number, fingerprint: string, change: { label?: string | null; authorized?: boolean }) =>
    apiClient.put<AgentDevice>(`/api/networks/${networkId}/sensor/devices/${fingerprint}`, change),

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
