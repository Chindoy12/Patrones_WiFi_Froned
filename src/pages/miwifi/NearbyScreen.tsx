import { NearbyNetworksPanel } from '../../components/NearbyNetworksPanel';
import { NeedsNetwork } from './common';
import { useMiWifi } from './context';

/** The Wi-Fi networks around (they share the air with yours) and how to pick a calmer channel. */
export function NearbyScreen() {
  const { selected } = useMiWifi();
  if (!selected) return <NeedsNetwork />;
  return <NearbyNetworksPanel key={`nearby-${selected.id}`} network={selected} />;
}
