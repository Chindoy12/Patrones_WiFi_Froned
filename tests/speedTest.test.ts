import { describe, expect, it, vi } from 'vitest';
import { jitter, median, megabitsPerSecond, nextSize, runSpeedTest, type SpeedTestDeps } from '../src/services/speedTest';

/** Fake server and clock: every request advances the clock by what it would take on the simulated connection. */
function fakeConnection(rtts: number[], mbps: number) {
  let clock = 0;
  let pings = 0;
  const calls: string[] = [];
  const raw = vi.fn(async (method: 'GET' | 'POST', path: string, query?: Record<string, unknown>, body?: Blob) => {
    calls.push(`${method} ${path}`);
    if (path.endsWith('/ping')) {
      clock += rtts[Math.min(pings++, rtts.length - 1)];
      return new Response(null, { status: 204 });
    }
    const bytes = path.endsWith('/download') ? Number(query?.bytes) : body!.size;
    clock += (bytes * 8) / (mbps * 1_000_000) * 1000;
    return path.endsWith('/download')
      ? new Response(new Uint8Array(bytes))
      : new Response(JSON.stringify({ receivedBytes: bytes }));
  });
  const deps: SpeedTestDeps = { raw: raw as unknown as SpeedTestDeps['raw'], now: () => clock };
  return { deps, calls };
}

describe('connection test math', () => {
  it('uses the median latency so one slow ping does not dominate', () => {
    expect(median([10, 12, 300, 11])).toBe(11.5);
    expect(median([5, 1, 3])).toBe(3);
  });

  it('measures jitter as the mean jump between consecutive pings', () => {
    expect(jitter([10, 14, 10, 12])).toBeCloseTo((4 + 4 + 2) / 3);
    expect(jitter([20])).toBe(0);
  });

  it('converts bytes and milliseconds to megabits per second', () => {
    expect(megabitsPerSecond(1_250_000, 1000)).toBe(10);
  });

  it('sizes the second transfer to about two seconds, between the probe and 8 MB', () => {
    expect(nextSize(1)).toBe(512 * 1024);
    expect(nextSize(16)).toBe(4_000_000);
    expect(nextSize(1000)).toBe(8 * 1024 * 1024);
  });
});

describe('runSpeedTest', () => {
  it('reports latency, jitter and both speeds in order', async () => {
    const { deps } = fakeConnection([30, 20, 22, 21, 25, 20, 23, 21, 22, 20, 24], 40);
    const phases: string[] = [];

    const result = await runSpeedTest((p) => phases.push(p), deps);

    expect(phases).toEqual(['latency', 'download', 'upload']);
    expect(result.latencyMs).toBe(21.5);
    expect(result.jitterMs).toBeGreaterThan(0);
    expect(result.downloadMbps).toBeCloseTo(40, 0);
    expect(result.uploadMbps).toBeCloseTo(40, 0);
  });

  it('stays within four transfers so the user budget lasts several tests', async () => {
    const { deps, calls } = fakeConnection([10], 500);

    await runSpeedTest(() => {}, deps);

    const transfers = calls.filter((c) => !c.endsWith('/ping'));
    expect(transfers).toHaveLength(4);
    expect(calls.filter((c) => c.endsWith('/ping'))).toHaveLength(11);  // one warm-up plus ten measured
  });

  it('skips the second transfer on a slow connection to save data', async () => {
    const { deps, calls } = fakeConnection([80], 1);

    const result = await runSpeedTest(() => {}, deps);

    expect(calls.filter((c) => !c.endsWith('/ping'))).toHaveLength(2);
    expect(result.downloadMbps).toBeCloseTo(1, 1);
  });
});
