// Small line icons drawn inline (no icon font, nothing loaded from outside, CSP stays strict).
const PATHS = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  wifi: 'M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0M12 19h.01',
  devices: 'M4 5h12v9H4zM2 18h16M19 8h3v11h-3z',
  gauge: 'M4 17a8 8 0 1 1 16 0M12 17l4-5M12 17h.01',
  history: 'M3 12a9 9 0 1 0 3-6.7M3 4v4h4M12 7v5l3 2',
  analysis: 'M4 19V5M4 19h16M8 15l3-4 3 2 5-6',
  anomaly: 'M12 3l10 17H2zM12 10v4M12 17h.01',
  ai: 'M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3M6 6h12v12H6zM10 10h4v4h-4z',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
  report: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0-1-5.8M18 14a6 6 0 0 1 4 7',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  server: 'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01',
  database: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  play: 'M7 4l13 8-13 8z',
  check: 'M5 12l5 5 9-10',
  cross: 'M6 6l12 12M18 6L6 18',
  minus: 'M6 12h12',
  arrowDown: 'M12 4v14M6 12l6 6 6-6',
  arrowUp: 'M12 20V6M6 12l6-6 6 6',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM9 12l2 2 4-4',
  key: 'M14 10a4 4 0 1 0-1.2 2.8L21 21M17 17l2-2M15 15l2-2',
  download: 'M12 4v11M7 10l5 5 5-5M4 20h16',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  router: 'M3 14h18v6H3zM7 17h.01M11 17h.01M8 10a6 6 0 0 1 8 0M5.5 7.5a10 10 0 0 1 13 0',
  terminal: 'M3 5h18v14H3zM7 9l3 3-3 3M12 15h5',
  phone: 'M7 2h10v20H7zM11 18h2',
  laptop: 'M4 5h16v11H4zM2 20h20M10 20h4',
  tv: 'M3 5h18v12H3zM8 21h8M12 17v4',
  console: 'M7 8h10a4 4 0 0 1 0 8H7a4 4 0 0 1 0-8zM9 11v2M8 12h2M15 11h.01M17 13h.01',
  printer: 'M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z',
  speaker: 'M8 3h8v18H8zM12 7h.01M12 14a2 2 0 1 0 0-.01',
  bellOff: 'M9 21h4M18 8a6 6 0 0 0-9.3-5M4 4l16 16M6 10v4l-2 2h11',
  ban: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM6 6l12 12',
  pencil: 'M4 20h4L18 10l-4-4L4 16zM14 6l4 4',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, title }: { name: IconName; size?: number; title?: string }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : true}
         role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      <path d={PATHS[name]} />
    </svg>
  );
}
