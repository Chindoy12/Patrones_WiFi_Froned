interface Props {
  size?: number;
  /** Faster pulse while a request is in progress. */
  busy?: boolean;
}

/**
 * Wi-Fi mark whose dot and arcs light up from the bottom one by one, like a signal loading. Its colors come from the
 * theme tokens, so the same mark works on the dark and on the light design.
 */
export function WifiLogo({ size = 56, busy = false }: Props) {
  return (
    <svg className={`wifi-logo${busy ? ' wifi-logo--busy' : ''}`} width={size} height={size} viewBox="0 0 64 64"
         aria-hidden="true">
      <circle className="wifi-logo__dot" cx="32" cy="50" r="4.5" />
      <path className="wifi-logo__arc wifi-logo__arc--1" d="M22.5 40.5A13.4 13.4 0 0 1 41.5 40.5" />
      <path className="wifi-logo__arc wifi-logo__arc--2" d="M15.45 33.45A23.4 23.4 0 0 1 48.55 33.45" />
      <path className="wifi-logo__arc wifi-logo__arc--3" d="M8.38 26.38A33.4 33.4 0 0 1 55.62 26.38" />
    </svg>
  );
}
