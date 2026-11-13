import { apiClient } from './apiClient';
import { sealPassword } from './passwordCipher';
import type {
  Account, AgentDevice, AgentOverview, DeviceSessionHistory, AgentPairingCode, AlertPreferences, AiModelOverview, AiModelVersion, AiPrediction, AiTrainingStatus, Alert, AlertStatus, AnalysisResult, AnalysisType, AnomalyCauseCount, AuthResponse,
  ConnectionTest, ConnectionTestInput, NearbyNetworks, WifiScan, WifiScanDetail, DashboardSummary, DataSourceType, Device, HomeNetwork, HomeNetworkInput, IdentifyMode, Location,
  Measurement, Network, NetworkQuality, NetworkReport, WeeklyReport, ProtocolStatistic, SensorStatus, StaffRole, Strategy, SystemStatus,
  TeamNetworks, TrafficSession, User, Zone, AuditPage, Capture, CaptureCapabilities, CaptureDetail, CaptureInput,
  NearbyAnalysis, RetentionPolicy, RouterInfo, LiveView,
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
  agentDeviceSessions: (networkId: number, fingerprint: string, days = 7) =>
    apiClient.get<DeviceSessionHistory>(`/api/my/networks/${networkId}/agent/devices/${fingerprint}/sessions`, { days }),
  /** "Which device is this?": the agent reports every minute for the next ten minutes. */
  identifyAgentDevice: (networkId: number) => apiClient.post<IdentifyMode>(`/api/my/networks/${networkId}/agent/identify`),
  revokeAgentKey: (networkId: number) => apiClient.delete(`/api/my/networks/${networkId}/agent/key`),
  /** Nearby Wi-Fi networks seen by the agent: last result, scan in progress and whether it is out of date. */
  nearbyNetworks: (networkId: number) => apiClient.get<NearbyNetworks>(`/api/my/networks/${networkId}/nearby`),
  /** "Escanear ahora": the scan waits for the agent; follow it with nearbyNetworks. */
  startScan: (networkId: number) => apiClient.post<WifiScan>(`/api/my/networks/${networkId}/scans`),
  scanHistory: (networkId: number, limit = 10) =>
    apiClient.get<WifiScan[]>(`/api/my/networks/${networkId}/scans`, { limit }),
  scanDetail: (networkId: number, scanId: number) =>
    apiClient.get<WifiScanDetail>(`/api/my/networks/${networkId}/scans/${scanId}`),
  /** Facts and inferences of the AI about the last completed scan. */
  nearbyAnalysis: (networkId: number) =>
    apiClient.get<NearbyAnalysis>(`/api/my/networks/${networkId}/nearby/analysis`),
  /** The router of a Mi Wi-Fi network: what is known of it and what WiFiSense cannot do with it. */
  myRouter: (networkId: number) => apiClient.get<RouterInfo>(`/api/my/networks/${networkId}/router`),
  /** «En vivo»: asking keeps the agent measuring; `after` is the last sample the page already has. */
  myLive: (networkId: number, after = 0) =>
    apiClient.get<LiveView>(`/api/my/networks/${networkId}/live`, { after }),

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
  identifySensorDevice: (networkId: number) => apiClient.post<IdentifyMode>(`/api/networks/${networkId}/sensor/identify`),
  /** The router of a team network, as its sensor sees it. */
  teamRouter: (networkId: number) => apiClient.get<RouterInfo>(`/api/networks/${networkId}/sensor/router`),
  /** «En vivo» of the sensor of a team network. */
  sensorLive: (networkId: number, after = 0) =>
    apiClient.get<LiveView>(`/api/networks/${networkId}/sensor/live`, { after }),
  /** Technical captures of a team network (ADMIN only; the backend refuses everyone else and audits it). */
  captureCapabilities: (networkId: number) =>
    apiClient.get<CaptureCapabilities>(`/api/networks/${networkId}/sensor/captures/capabilities`),
  captures: (networkId: number, limit = 20) =>
    apiClient.get<Capture[]>(`/api/networks/${networkId}/sensor/captures`, { limit }),
  requestCapture: (networkId: number, input: CaptureInput) =>
    apiClient.post<Capture>(`/api/networks/${networkId}/sensor/captures`, input),
  captureDetail: (networkId: number, captureId: number) =>
    apiClient.get<CaptureDetail>(`/api/networks/${networkId}/sensor/captures/${captureId}`),
  cancelCapture: (networkId: number, captureId: number) =>
    apiClient.post<Capture>(`/api/networks/${networkId}/sensor/captures/${captureId}/cancel`),
  /** The audit of the sensitive operations and the retention rules (ADMIN only). */
  audit: (filters: { action?: string; outcome?: string; page?: number; size?: number }) =>
    apiClient.get<AuditPage>('/api/admin/audit', filters),
  auditActions: () => apiClient.get<{ code: string; label: string }[]>('/api/admin/audit/actions'),
  retentionPolicies: () => apiClient.get<RetentionPolicy[]>('/api/admin/policies'),
  sensorDeviceSessions: (networkId: number, fingerprint: string, days = 7) =>
    apiClient.get<DeviceSessionHistory>(`/api/networks/${networkId}/sensor/devices/${fingerprint}/sessions`, { days }),

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
  /** Real measurements available to train the model and every training so far. */
  aiTraining: () => apiClient.get<AiTrainingStatus>('/api/ai/training'),
  /** ADMIN: train now; the new model replaces the one in use only if it is better. */
  trainAi: () => apiClient.post<AiModelVersion>('/api/ai/training'),

  alerts: (status?: AlertStatus) => apiClient.get<Alert[]>('/api/alerts', { status }),
  acknowledgeAlert: (id: number) => apiClient.patch<Alert>(`/api/alerts/${id}/acknowledge`),
  resolveAlert: (id: number) => apiClient.patch<Alert>(`/api/alerts/${id}/resolve`),

  /** Monday to Sunday of the week that contains {@code week} (yyyy-mm-dd; the current week when omitted). */
  weeklyReport: (networkId: number, week?: string) =>
    apiClient.get<WeeklyReport>(`/api/reports/networks/${networkId}/weekly`, { week }),
  report: (networkId: number, from?: string, to?: string) =>
    apiClient.get<NetworkReport>(`/api/reports/networks/${networkId}`, { from, to }),
  comparison: (networkIds: number[]) =>
    apiClient.get<NetworkReport[]>('/api/reports/comparison', { networkIds: networkIds.join(',') }),
};
