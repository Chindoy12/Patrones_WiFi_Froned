/**
 * Closing line of every signed-in page: the brand, the privacy promise of the agent and the time zone in which the
 * backend groups the days of the weekly reports.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span className="site-footer__brand"><span className="site-footer__plus" aria-hidden="true">+</span> WiFiSense
        <span className="muted"> · Monitoreo de redes Wi-Fi</span></span>
      <span className="site-footer__facts">
        <span className="stamp">Las direcciones MAC nunca salen de tu computador</span>
        <span className="stamp">Reportes semanales en hora de Colombia · UTC−5</span>
      </span>
    </footer>
  );
}
