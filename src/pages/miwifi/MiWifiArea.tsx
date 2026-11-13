import { Navigate, Route, Routes } from 'react-router-dom';
import { AlertsScreen } from './AlertsScreen';
import { ConnectionScreen } from './ConnectionScreen';
import { DevicesScreen } from './DevicesScreen';
import { MiWifiLayout } from './MiWifiLayout';
import { NearbyScreen } from './NearbyScreen';
import { SecurityScreen } from './SecurityScreen';
import { SettingsScreen } from './SettingsScreen';
import { SummaryScreen } from './SummaryScreen';

/**
 * Mi Wi-Fi (end users): one address per screen, so the back button and a shared link work. The app loads this
 * module only when an end user enters (React.lazy, the virtual proxy of each area).
 */
export function MiWifiArea() {
  return (
    <Routes>
      <Route element={<MiWifiLayout />}>
        <Route index element={<SummaryScreen />} />
        <Route path="conexion" element={<ConnectionScreen />} />
        <Route path="equipos" element={<DevicesScreen />} />
        <Route path="seguridad" element={<SecurityScreen />} />
        <Route path="avisos" element={<AlertsScreen />} />
        <Route path="redes-cercanas" element={<NearbyScreen />} />
        <Route path="ajustes" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/mi-wifi" replace />} />
      </Route>
    </Routes>
  );
}
