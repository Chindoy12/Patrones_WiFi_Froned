import type { Capture, CaptureCapabilities, CaptureDetail, Network } from '../src/types';

export const lab: Network = {
  id: 4, ssid: 'Laboratorio', bssid: 'AA:BB:CC:00:00:01', frequencyBand: '5GHz', channel: 36, securityType: 'WPA3',
  status: 'NORMAL', dataSourceType: 'AGENT', zoneId: 1, zoneName: 'Piso 1', locationName: 'Sede',
  lastCollectedAt: null,
};

export function capabilities(change: Partial<CaptureCapabilities> = {}): CaptureCapabilities {
  return {
    sensorInstalled: true, sensorOnline: true, lastReportAt: '2026-10-28T15:00:00Z', agentVersion: '2.0.0',
    platform: 'Windows 11', agentSupportsCapture: true, checkedAt: '2026-10-28T15:00:00Z', elevated: false,
    consent: true,
    tools: [{ code: 'NPCAP', label: 'Npcap', available: true, note: 'Lo instala el usuario.' },
            { code: 'PKTMON', label: 'pktmon de Windows', available: false, note: 'Necesita administrador.' }],
    monitorMode: 'UNSUPPORTED', interfaces: 2,
    scenarios: [
      { code: 'LOCAL_HOST', title: 'A. Tráfico del computador del sensor', status: 'AVAILABLE',
        explanation: 'No ve lo que los demás equipos envían a Internet.' },
      { code: 'SHARED_INTERFACE', title: 'B. Interfaz compartida o puerto espejo', status: 'NOT_VERIFIABLE',
        explanation: 'Solo con un puerto espejo.' },
      { code: 'MONITOR_MODE', title: 'C. Tramas inalámbricas en modo monitor', status: 'UNAVAILABLE',
        explanation: 'La tarjeta no lo declara.' },
      { code: 'ROUTER', title: 'D. Estadísticas del router', status: 'NOT_IMPLEMENTED', explanation: 'Sin integración.' },
    ],
    canCapture: true, blockers: [],
    limits: { defaultSeconds: 30, maxSeconds: 120, defaultPackets: 5000, maxPackets: 20000, maxBytes: 20971520 },
    ...change,
  };
}

export function capture(change: Partial<Capture> = {}): Capture {
  return {
    id: 12, status: 'COMPLETED', purpose: 'Revisar la difusión ARP del laboratorio', requestedBy: 1,
    requestedAt: '2026-10-28T15:01:00Z', startedAt: '2026-10-28T15:01:20Z', finishedAt: '2026-10-28T15:01:52Z',
    cancelRequested: false, maxSeconds: 30, maxPackets: 5000, maxBytes: 20971520, failureReason: null,
    failureMessage: null, stopReason: 'DURATION', stopMessage: 'Duró lo pedido.', captureTool: 'NPCAP',
    captureToolLabel: 'Npcap', interfaceName: 'Intel Wi-Fi 6', durationMs: 30200, packetCount: 1200,
    byteCount: 840000, analyzedWith: 'AI', ...change,
  };
}

export function detail(change: Partial<CaptureDetail> = {}): CaptureDetail {
  return {
    capture: capture(),
    totals: { packets: 1200, bytes: 840000, droppedByTool: 3, malformed: 2, inboundBytes: 600000,
              outboundBytes: 240000, broadcast: 40, multicast: 80, localHosts: 6, remoteHosts: 25 },
    protocols: [{ protocol: 'HTTPS', packets: 900, bytes: 780000 }, { protocol: 'ARP', packets: 300, bytes: 18000 }],
    ports: [{ transport: 'TCP', port: 443, service: 'HTTPS', packets: 900, bytes: 780000 }],
    intervals: [{ second: 0, packets: 40, bytes: 28000 }, { second: 2, packets: 400, bytes: 280000 }],
    observed: [{ code: 'TRAFFIC_VOLUME', severity: 'INFO', title: 'Volumen capturado',
                 evidence: '1200 paquetes en 30 s.', recommendation: null, confidence: null }],
    inferred: [{ code: 'ARP_ACTIVITY', severity: 'WARNING', title: 'Muchas preguntas ARP', evidence: '300 de 1200.',
                 recommendation: 'Revisa en Dispositivos si apareció un equipo nuevo.', confidence: 0.45 }],
    scope: 'Captura local: no incluye lo que los demás equipos envían a Internet ni el contenido de ningún paquete.',
    ...change,
  };
}
