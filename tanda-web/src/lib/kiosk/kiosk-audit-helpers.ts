import type { KioskDevice } from '@/lib/types/kiosk-device';

export function pickKioskDeviceAuditSnapshot(device: KioskDevice) {
  return {
    id: device.id,
    name: device.name,
    type: device.type,
    status: device.status,
    locationId: device.locationId,
    ownerEmail: device.ownerEmail,
  };
}
