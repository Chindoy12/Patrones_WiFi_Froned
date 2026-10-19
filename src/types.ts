/** ADMIN, ANALYST and VIEWER are the team; USER is a self-registered end user. */
export type StaffRole = 'ADMIN' | 'ANALYST' | 'VIEWER';
export type Role = StaffRole | 'USER';

export const isStaff = (role: Role): role is StaffRole => role !== 'USER';
export type NetworkStatus = 'NORMAL' | 'WARNING' | 'CRITICAL';
/** AGENT: the network's sensor (the WiFiSense agent installed there), the real source. The rest are demo or planned. */
export type DataSourceType = 'AGENT' | 'SIMULATION' | 'ROUTER_API' | 'SNMP' | 'SYSTEM' | 'TRAFFIC_CAPTURE';
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
  /** Renews the session when the 15-minute token expires; works once (each renewal gives a new one). */
  refreshToken?: string;
  refreshExpiresAt?: string;
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

export interface Location {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
}

/** The sensor of a team network. online: it reported in the last minutes. The code itself is shown only once. */
export interface SensorStatus {
  installed: boolean;
  online: boolean;
  keyPrefix: string | null;
  installedAt: string | null;
  lastSeenAt: string | null;
  agentVersion: string | null;
  platform: string | null;
  pendingCodeExpiresAt: string | null;
  /** Wi-Fi the sensor's computer was on in its last report (null if it could not be read). */
  lastSsid?: string | null;
  /** While set, the sensor reports every minute ("Which device is this?"). */
  identifyUntil?: string | null;
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

export type AnomalyType =
  | 'NONE' | 'CONGESTION' | 'INTERFERENCE' | 'WEAK_COVERAGE' | 'PROVIDER_ISSUE' | 'SUSPICIOUS_TRAFFIC' | 'UNKNOWN';

export interface AiPrediction {
  id: number;
  networkId: number;
  ssid: string;
  analysisResultId: number;
  anomalyDetected: boolean;
  anomalyScore: number;
  severity: AiSeverity;
  /** null for predictions saved before the AI diagnosed causes. */
  anomalyType: AnomalyType | null;
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

/** A network an end user registers for themself (never one of the university networks). */
export interface HomeNetwork {
  id: number;
  name: string;
  provider: string | null;
  contractedMbps: number | null;
  createdAt: string;
}

export interface HomeNetworkInput {
  name: string;
  provider?: string;
  contractedMbps?: number;
}

export interface AnomalyCauseCount {
  /** UNCLASSIFIED groups anomalies saved before the AI diagnosed causes. */
  anomalyType: AnomalyType | 'UNCLASSIFIED';
  count: number;
}

export interface AiModelInfo {
  algorithm: string;
  modelVersion: string;
  features: string[];
  threshold: number;
  trainedOn: string;
  recommendationEngine: string;
  /** True when the model in use was trained with the real measurements of the networks. */
  realData?: boolean;
  trainedSamples?: number | null;
  trainedAt?: string | null;
}

export interface TrainingMetrics {
  precision: number;
  recall: number;
  f1: number;
  falsePositiveRate: number;
}

/** One training of the model with real measurements and whether it replaced the model in use. */
export interface AiModelVersion {
  id: number;
  version: string;
  algorithm: string;
  trainedAt: string;
  /** Administrator who asked; null for the weekly automatic training. */
  trainedBy: string | null;
  samples: number;
  networks: number;
  dataFrom: string;
  dataTo: string;
  metrics: {
    candidate?: TrainingMetrics | null; current?: TrainingMetrics | null; currentVersion?: string | null;
    trainSamples?: number; testNormal?: number; testFaults?: number;
  };
  decision: 'PROMOTED' | 'REJECTED';
  reason: string;
  active: boolean;
}

export interface AiTrainingStatus {
  available: { samples: number; teamSamples: number; homeSamples: number; networks: number; from: string | null; to: string | null };
  minimumSamples: number;
  canTrain: boolean;
  nextAutomatic: string | null;
  versions: AiModelVersion[];
}

export interface AlgorithmMetrics {
  algorithm: string;
  precision: number;
  recall: number;
  f1: number;
  falsePositiveRate: number;
  rocAuc: number;
  averagePrecision: number;
  recallByType: Record<string, number>;
  fitMs: number;
  predictUsPerSample: number;
  production: boolean;
}

export interface ModelEvaluation {
  dataset: string;
  trainSamples: number;
  testNormal: number;
  testAnomalies: number;
  productionAlgorithm: string;
  modelVersion: string;
  algorithms: AlgorithmMetrics[];
  tuning: { nEstimators: number; maxSamples: string; f1: number; recall: number; falsePositiveRate: number; best: boolean }[];
  sensitivity: { contamination: number; precision: number; recall: number; falsePositiveRate: number; production: boolean }[];
  diagnosis: { accuracy: number; evaluated: number; confusion: Record<string, Record<string, number>> };
  generatedAt: string;
}

export interface AiModelOverview {
  model: AiModelInfo;
  evaluation: ModelEvaluation | null;
  evaluationReady: boolean;
}

export type QualityGrade = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
export type MetricStatus = 'GOOD' | 'FAIR' | 'POOR';

/** 0-100 grade the AI gives a connection test or a measurement. */
export interface Quality {
  score: number;
  grade: QualityGrade;
  gradeLabel: string;
  metrics: { metric: string; label: string; value: number; unit: string; score: number; status: MetricStatus }[];
  activities: { activity: string; label: string; suitable: boolean | null }[];
  tips: string[];
  contractedRatio: number | null;
  modelVersion: string;
}

export interface ConnectionTest {
  id: number;
  networkId: number;
  latencyMs: number;
  jitterMs: number;
  downloadMbps: number;
  uploadMbps: number;
  /** null when the AI could not grade the test. */
  qualityScore: number | null;
  qualityGrade: QualityGrade | null;
  quality: Quality | null;
  createdAt: string;
}

export interface ConnectionTestInput {
  latencyMs: number;
  jitterMs: number;
  downloadMbps: number;
  uploadMbps: number;
}

export interface NetworkQuality {
  networkId: number;
  ssid: string;
  measuredAt: string;
  source: string;
  simulatedData: boolean;
  connectedDevices: number | null;
  quality: Quality;
}

export interface SystemStatus {
  aiService: 'UP' | 'DOWN';
  database: 'UP';
  monitoringEnabled: boolean;
  lastMeasurementAt: string | null;
  openAlerts: number;
  checkedAt: string;
}

// WiFiSense agent (Mi Wi-Fi > Agente)
export type WifiAuthentication = 'OPEN' | 'WEP' | 'WPA' | 'WPA2' | 'WPA3' | 'UNKNOWN';
export type SecurityGrade = 'SECURE' | 'ACCEPTABLE' | 'AT_RISK' | 'CRITICAL';
export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface SecurityFinding {
  code: string;
  severity: FindingSeverity;
  title: string;
  detail: string;
  action: string;
  penalty: number;
}

export interface SecurityAssessment {
  score: number;
  grade: SecurityGrade;
  gradeLabel: string;
  summary: string;
  findings: SecurityFinding[];
  modelVersion: string;
}

export interface AgentAnomaly {
  detected: boolean;
  severity: AiSeverity | null;
  type: AnomalyType;
  diagnosis: string | null;
  message: string;
  recommendation: string | null;
  recommendationSource: 'RULES' | 'CLAUDE';
}

/** Best Wi-Fi channel the AI found from the neighbouring networks the agent saw (load = interfering networks). */
export interface AgentChannel {
  band: '2.4' | '5' | '6' | null;
  currentChannel: number | null;
  currentLoad: number | null;
  recommendedChannel: number | null;
  recommendedLoad: number | null;
  shouldChange: boolean;
  summary: string;
  action: string | null;
  options: { channel: number; networks: number; load: number }[];
  modelVersion: string;
}

export interface AgentReportDetails {
  wifi?: { cipher?: string | null; signalPercent?: number | null; rxRateMbps?: number | null; txRateMbps?: number | null;
           neighborsSameChannel?: number | null; neighborsTotal?: number | null; note?: string | null;
           platform?: string | null };
  openPorts?: number[];
  security?: SecurityAssessment | null;
  quality?: Quality | null;
  anomaly?: AgentAnomaly | null;
  /** Missing for agents older than 1.3.0, which do not send the neighbours per channel. */
  channel?: AgentChannel | null;
}

export interface AgentReport {
  id: number;
  receivedAt: string;
  agentVersion: string;
  ssid: string | null;
  authentication: WifiAuthentication;
  band: '2.4' | '5' | '6' | null;
  channel: number | null;
  signalDbm: number | null;
  latencyMs: number | null;
  jitterMs: number | null;
  packetLossPct: number | null;
  gatewayLatencyMs: number | null;
  deviceCount: number;
  newDeviceCount: number;
  securityScore: number | null;
  securityGrade: SecurityGrade | null;
  qualityScore: number | null;
  anomalyDetected: boolean | null;
  anomalyType: AnomalyType | null;
  details: AgentReportDetails;
}

export interface AgentHistoryPoint {
  at: string;
  latencyMs: number | null;
  deviceCount: number;
  securityScore: number | null;
  qualityScore: number | null;
  anomalyDetected: boolean | null;
}

export interface AgentDevice {
  id: string;
  /** Name the user gave the device; takes priority over the one it announces. */
  label: string | null;
  /** Maker from the MAC OUI (Apple, Samsung…); null when unknown. */
  vendor: string | null;
  /** Name the device announces on the network ("iPhone-de-Ana"); null when none. */
  hostname: string | null;
  /** Uses a random ("private") MAC, as phones and tablets do: its maker cannot be known. */
  privateMac: boolean;
  /** False when the user marked it as not theirs: shown in red and it keeps raising an alert. */
  authorized: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  online: boolean;
  recent: boolean;
  /** What kind of device the agent deduced from what it announces and the services it offers (a guess). */
  kind?: DeviceKind | null;
  /** SELF: the computer the agent runs on; ROUTER: the gateway of the network. */
  role?: DeviceRole | null;
  /** Model the device announces ("iPhone15,2", "Chromecast"). */
  model?: string | null;
}

export type DeviceKind = 'PHONE' | 'COMPUTER' | 'TV' | 'PRINTER' | 'CAMERA' | 'SPEAKER' | 'CONSOLE' | 'IOT';
export type DeviceRole = 'SELF' | 'ROUTER';

/** "Which device is this?": until identifyUntil the agent (or sensor) reports every reportSeconds seconds. */
export interface IdentifyMode {
  identifyUntil: string;
  reportSeconds: number;
}

export type AgentAlertType = 'NEW_DEVICE' | 'UNAUTHORIZED_DEVICE' | 'SECURITY' | 'ANOMALY';

export interface AgentAlert {
  type: AgentAlertType;
  detail: string;
  at: string;
}

export interface AgentOverview {
  key: { prefix: string; createdAt: string; lastSeenAt: string | null; identifyUntil?: string | null } | null;
  online: boolean;
  latest: AgentReport | null;
  history: AgentHistoryPoint[];
  devices: AgentDevice[];
  alerts: AgentAlert[];
}

/** Which email alerts the end user wants. */
export interface AlertPreferences {
  newDevice: boolean;
  security: boolean;
  anomaly: boolean;
}

export interface AgentPairingCode {
  code: string;
  expiresAt: string;
}

/** The end user's own account; email is null while it has no recovery email. */
export interface Account {
  username: string;
  email: string | null;
  phone: string | null;
}

/** One end user's home network as the team sees it (ADMIN / ANALYST). Never anything about their devices. */
export interface TeamNetworkRow {
  id: number;
  name: string;
  /** Complete for an administrator; masked ("an•••@gmail.com") for an analyst. */
  owner: string;
  provider: string | null;
  contractedMbps: number | null;
  createdAt: string;
  hasAgent: boolean;
  agentOnline: boolean;
  lastReportAt: string | null;
  agentVersion: string | null;
  deviceCount: number | null;
  securityScore: number | null;
  securityGrade: SecurityGrade | null;
  qualityScore: number | null;
  anomalyDetected: boolean | null;
  anomalyType: AnomalyType | null;
  band: '2.4' | '5' | '6' | null;
  channel: number | null;
  recommendedChannel: number | null;
  channelChangeSuggested: boolean;
  needsAttention: boolean;
}

export interface TeamNetworks {
  totals: { endUsers: number; networks: number; withAgent: number; agentsOnline: number; atRisk: number;
            anomaliesLast24h: number; devices: number };
  networks: TeamNetworkRow[];
  generatedAt: string;
}

// When a device was connected (Avance 15)
export interface DeviceSessionPeriod {
  connectedAt: string;
  /** null while it is still connected */
  endedAt: string | null;
  ongoing: boolean;
  minutes: number;
}

export interface DeviceSessionHistory {
  deviceId: string;
  days: number;
  connections: number;
  totalMinutes: number;
  periods: DeviceSessionPeriod[];
}

// Weekly report of a team network (Avance 15)
export interface WeeklyTotals {
  measurements: number;
  latencyAvgMs: number | null;
  jitterAvgMs: number | null;
  packetLossAvgPct: number | null;
  coveragePct: number | null;
  trafficMb: number | null;
  alerts: number;
  criticalAlerts: number;
}

export interface WeeklyDay {
  date: string;
  measurements: number;
  hoursMeasured: number;
  latencyAvgMs: number | null;
  jitterAvgMs: number | null;
  packetLossAvgPct: number | null;
  signalAvgDbm: number | null;
  maxDevices: number | null;
  trafficMb: number | null;
  alerts: number;
}

export interface WeeklyReport {
  networkId: number;
  ssid: string;
  zone: string;
  start: string;
  end: string;
  week: WeeklyTotals;
  previousWeek: WeeklyTotals;
  days: WeeklyDay[];
  worstHour: { hour: number; latencyAvgMs: number; measurements: number } | null;
  protocols: { protocol: string; packets: number }[];
  devices: { seen: number; newOnes: number } | null;
  security: { latestScore: number; latestGrade: SecurityGrade; lowestScore: number } | null;
  highlights: string[];
}
