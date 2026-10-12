import type { AnomalyCauseCount, Role } from './types';

const dateTime = new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' });
const time = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' });

export const formatDateTime = (iso: string | null) => (iso ? dateTime.format(new Date(iso)) : '—');
export const formatTime = (iso: string) => time.format(new Date(iso));

export function formatNumber(value: number | null | undefined, digits = 1, unit = ''): string {
  if (value === null || value === undefined) return '—';
  return `${value.toLocaleString('es-CO', { maximumFractionDigits: digits })}${unit}`;
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export const statusLabel: Record<string, string> = {
  NORMAL: 'Normal', WARNING: 'Advertencia', CRITICAL: 'Crítico',
  INFO: 'Información', OPEN: 'Abierta', ACKNOWLEDGED: 'Reconocida', RESOLVED: 'Resuelta',
  NONE: 'Sin anomalía', LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta',
  THRESHOLD: 'Umbrales', STATISTICAL: 'Estadístico', ANOMALY_DETECTION: 'Inteligencia artificial',
  SIMULATION: 'Simulación', ROUTER_API: 'API de router', SNMP: 'SNMP', SYSTEM: 'Sistema', TRAFFIC_CAPTURE: 'Captura de tráfico',
};

export const roleLabel: Record<Role, string> = {
  ADMIN: 'Administrador', ANALYST: 'Analista', VIEWER: 'Observador', USER: 'Usuario',
};

/** Probable cause of an anomaly, as the AI diagnoses it. */
export const anomalyTypeLabel: Record<AnomalyCauseCount['anomalyType'], string> = {
  NONE: 'Sin anomalía', CONGESTION: 'Congestión', INTERFERENCE: 'Interferencia', WEAK_COVERAGE: 'Cobertura débil',
  PROVIDER_ISSUE: 'Falla del proveedor', SUSPICIOUS_TRAFFIC: 'Tráfico sospechoso', UNKNOWN: 'No identificada',
  UNCLASSIFIED: 'Sin clasificar',
};

export const formatPercent = (ratio: number, digits = 1) =>
  `${(ratio * 100).toLocaleString('es-CO', { maximumFractionDigits: digits })} %`;
