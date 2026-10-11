/** ADMIN, ANALYST and VIEWER are the team; USER is a self-registered end user. */
export type StaffRole = 'ADMIN' | 'ANALYST' | 'VIEWER';
export type Role = StaffRole | 'USER';

export const isStaff = (role: Role): role is StaffRole => role !== 'USER';
export type NetworkStatus = 'NORMAL' | 'WARNING' | 'CRITICAL';
export type DataSourceType = 'SIMULATION' | 'ROUTER_API' | 'SNMP' | 'SYSTEM' | 'TRAFFIC_CAPTURE';
export type AnalysisType = 'THRESHOLD' | 'STATISTICAL' | 'ANOMALY_DETECTION';
export type AiSeverity = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface User {
  id: number;
  username: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: User;
}

export interface Network {
  id: number;
  ssid: string;
  bssid: string;
  frequencyBand: string;
  channel: number;
  securityType: string;
  status: NetworkStatus;
  dataSourceType: DataSourceType;
  zoneId: number;
  zoneName: string;
  locationName: string;
  lastCollectedAt: string | null;
}

export interface Zone {
  id: number;
  locationId: number;
  locationName: string;
  name: string;
  floor: number | null;
}

export interface Device {
  id: number;
  networkId: number;
  networkSsid: string;
  hostname: string | null;
  ipAddress: string;
  macAddress: string;
  type: string;
  connectionStatus: 'CONNECTED' | 'IDLE' | 'DISCONNECTED';
  signalStrength: number | null;
  lastSeenAt: string;
}

export interface TrafficSession {
  id: number;
  protocol: string;
  destinationPort: number | null;
  bytesSent: number;
  bytesReceived: number;
  startedAt: string;
  endedAt: string | null;
}

export interface Measurement {
  id: number;
  networkId: number;
  latencyMs: number;
  jitterMs: number;
  packetLossPct: number;
  bandwidthMbps: number | null;
  signalStrengthDbm: number | null;
  connectedDevices: number | null;
  source: DataSourceType;
  simulated: boolean;
  measuredAt: string;
}

export interface ProtocolStatistic {
  protocol: string;
  packetCount: number;
  periodStart: string;
  periodEnd: string;
}

export interface AiPrediction {
  id: number;
  networkId: number;
  ssid: string;
  analysisResultId: number;
  anomalyDetected: boolean;
  anomalyScore: number;
  severity: AiSeverity;
  message: string;
  recommendation: string | null;
  recommendationSource: 'RULES' | 'CLAUDE';
  modelVersion: string;
  simulatedData: boolean;
  createdAt: string;
}

export interface AnalysisResult {
  id: number;
  networkId: number;
  ssid: string;
  type: AnalysisType;
  detectedStatus: NetworkStatus;
  networkStatus: NetworkStatus;
  score: number;
  summary: string;
  measurementCount: number;
  requestedBy: string;
  createdAt: string;
  prediction: AiPrediction | null;
}

export interface Strategy {
  type: AnalysisType;
  description: string;
}

export interface Alert {
  id: number;
  networkId: number;
  ssid: string;
  analysisResultId: number | null;
  severity: AlertSeverity;
  message: string;
  status: AlertStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export interface DashboardSummary {
  totalNetworks: number;
  networksByStatus: Record<NetworkStatus, number>;
  totalDevices: number;
  openAlerts: number;
  anomaliesLast24h: number;
  averageLatencyLastHourMs: number | null;
  recentAlerts: Alert[];
  recentAnomalies: AiPrediction[];
}

export interface MetricSummary {
  average: number | null;
  min: number | null;
  max: number | null;
  p95: number | null;
  samples: number;
}

export interface NetworkReport {
  networkId: number;
  ssid: string;
  from: string;
  to: string;
  measurementCount: number;
  latencyMs: MetricSummary;
  jitterMs: MetricSummary;
  packetLossPct: MetricSummary;
  bandwidthMbps: MetricSummary;
  signalStrengthDbm: MetricSummary;
  alerts: number;
  analyses: number;
  anomalies: number;
  simulatedData: boolean;
}
