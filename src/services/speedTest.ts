import { apiClient } from './apiClient';
import type { ConnectionTestInput } from '../types';

/**
 * Connection test that runs in the browser against the WiFiSense server: latency and jitter from small pings, then
 * download and upload speed. Each direction makes a short probe and, if the connection is fast, one larger transfer
 * sized to last about two seconds, so a test uses little data and stays within the server's per-user budget.
 */
export type SpeedTestPhase = 'latency' | 'download' | 'upload';

const PINGS = 10;
const PROBE_BYTES = 512 * 1024;
const MAX_BYTES = 8 * 1024 * 1024;
const TARGET_SECONDS = 2;

export interface SpeedTestDeps {
  raw: typeof apiClient.raw;
  now: () => number;
}

const defaults: SpeedTestDeps = { raw: apiClient.raw, now: () => performance.now() };

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Mean difference between consecutive round trips (how much the delay jumps around). */
export function jitter(rtts: number[]): number {
  if (rtts.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < rtts.length; i++) total += Math.abs(rtts[i] - rtts[i - 1]);
  return total / (rtts.length - 1);
}

export function megabitsPerSecond(bytes: number, milliseconds: number): number {
  return (bytes * 8) / (Math.max(milliseconds, 1) / 1000) / 1_000_000;
}

/** Bytes for the second transfer so it lasts about TARGET_SECONDS at the speed the probe measured. */
export function nextSize(probeMbps: number): number {
  const bytes = (probeMbps * 1_000_000 * TARGET_SECONDS) / 8;
  return Math.round(Math.min(Math.max(bytes, PROBE_BYTES), MAX_BYTES));
}

const round = (value: number, digits: number) => Number(value.toFixed(digits));

async function measureLatency(deps: SpeedTestDeps): Promise<{ latencyMs: number; jitterMs: number }> {
  await deps.raw('GET', '/api/my/speedtest/ping');  // warm-up: connection setup must not count as latency
  const rtts: number[] = [];
  for (let i = 0; i < PINGS; i++) {
    const start = deps.now();
    await deps.raw('GET', '/api/my/speedtest/ping', { n: i });
    rtts.push(deps.now() - start);
  }
  return { latencyMs: Math.max(round(median(rtts), 1), 0.1), jitterMs: round(jitter(rtts), 1) };
}

async function timedDownload(deps: SpeedTestDeps, bytes: number): Promise<number> {
  const start = deps.now();
  const response = await deps.raw('GET', '/api/my/speedtest/download', { bytes });
  const body = await response.arrayBuffer();
  return megabitsPerSecond(body.byteLength, deps.now() - start);
}

async function timedUpload(deps: SpeedTestDeps, bytes: number): Promise<number> {
  const payload = new Blob([new Uint8Array(bytes)]);
  const start = deps.now();
  await deps.raw('POST', '/api/my/speedtest/upload', undefined, payload);
  return megabitsPerSecond(bytes, deps.now() - start);
}

async function measure(transfer: (bytes: number) => Promise<number>): Promise<number> {
  const probe = await transfer(PROBE_BYTES);
  const size = nextSize(probe);
  // A slow connection already took long enough with the probe; a second transfer would only waste data.
  return size > PROBE_BYTES ? transfer(size) : probe;
}

export async function runSpeedTest(onPhase: (phase: SpeedTestPhase) => void,
                                   deps: SpeedTestDeps = defaults): Promise<ConnectionTestInput> {
  onPhase('latency');
  const { latencyMs, jitterMs } = await measureLatency(deps);
  onPhase('download');
  const downloadMbps = await measure((bytes) => timedDownload(deps, bytes));
  onPhase('upload');
  const uploadMbps = await measure((bytes) => timedUpload(deps, bytes));
  return { latencyMs, jitterMs, downloadMbps: round(Math.min(downloadMbps, 10_000), 2),
           uploadMbps: round(Math.min(uploadMbps, 10_000), 2) };
}
