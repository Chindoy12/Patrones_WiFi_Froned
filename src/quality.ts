import type { GaugeStatus } from './components/Gauge';
import type { MetricStatus, Quality, QualityGrade } from './types';

/** How a grade or a metric status looks on a gauge; the words always travel with the color. */
export function gradeStatus(grade: QualityGrade | null | undefined): GaugeStatus {
  if (grade === 'EXCELLENT' || grade === 'GOOD') return 'good';
  if (grade === 'FAIR') return 'fair';
  if (grade === 'POOR') return 'poor';
  return 'none';
}

export const metricStatus: Record<MetricStatus, GaugeStatus> = { GOOD: 'good', FAIR: 'fair', POOR: 'poor' };
export const metricWord: Record<MetricStatus, string> = { GOOD: 'Buena', FAIR: 'Regular', POOR: 'Mala' };

export function metricOf(quality: Quality | null | undefined, name: string) {
  return quality?.metrics.find((m) => m.metric === name) ?? null;
}
