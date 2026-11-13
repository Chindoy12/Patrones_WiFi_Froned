import { Icon, type IconName } from './Icon';

const FUNCTIONS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'wifi', title: 'Redes cercanas',
    text: 'Las redes Wi-Fi que ve la antena del agente. Verlas no las hace tuyas ni te deja usarlas.' },
  { icon: 'gauge', title: 'Medición de tu conexión',
    text: 'Latencia, pérdida y velocidad de tu propia conexión, medidas por el agente o por la prueba del navegador.' },
  { icon: 'history', title: 'En vivo',
    text: 'Cada 2 segundos, lo que el computador del agente baja y sube en ese momento y su latencia. Es el uso de '
      + 'ese momento, no la capacidad de la conexión, y solo de ese computador.' },
  { icon: 'devices', title: 'Equipos de la red',
    text: 'Los equipos que el agente alcanza a ver en tu red, con el nombre que se pudo saber (o «desconocido»).' },
  { icon: 'shield', title: 'Captura técnica',
    text: 'Solo administradores, en redes del equipo y con permiso del computador del sensor: cuenta cabeceras del '
      + 'tráfico de ese computador. Nunca guarda contenido.' },
  { icon: 'router', title: 'Administrar el router',
    text: 'Bloquear equipos o cambiar la contraseña se hace en el router: WiFiSense no tiene integración con routers.' },
];

/** What each function is and what it is not, so nobody confuses a scan with a measurement or a capture. */
export function FunctionGuide({ title = '¿Qué hace cada cosa?' }: { title?: string }) {
  return (
    <details className="function-guide">
      <summary>{title}</summary>
      <ul>
        {FUNCTIONS.map((f) => (
          <li key={f.title}>
            <Icon name={f.icon} size={18} />
            <span><strong>{f.title}.</strong> {f.text}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
