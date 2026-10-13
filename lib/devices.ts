// The device mockups in a project's solution section: two phones, a tablet
// and a desktop, each showing one screenshot. Shared by the editor (which
// picks the device and uploads the screenshot) and the project page.

export type DeviceKind = 'phone' | 'tablet' | 'desktop';

/** A device's screen in CSS pixels, so a screenshot taken at that viewport
 *  fills it exactly. Desktops also say what they stand on. */
export type DevicePreset = { id: string; label: string; width: number; height: number; stand?: 'laptop' | 'monitor' };

export const devicePresets: Record<DeviceKind, DevicePreset[]> = {
  phone: [
    { id: 'iphone-16', label: 'iPhone 16 / 15 — 393 × 852', width: 393, height: 852 },
    { id: 'iphone-16-pro', label: 'iPhone 16 Pro — 402 × 874', width: 402, height: 874 },
    { id: 'iphone-16-pro-max', label: 'iPhone 16 Pro Max — 440 × 956', width: 440, height: 956 },
    { id: 'iphone-se', label: 'iPhone SE — 375 × 667', width: 375, height: 667 },
    { id: 'pixel-9', label: 'Pixel 9 — 412 × 923', width: 412, height: 923 },
    { id: 'galaxy-s24', label: 'Galaxy S24 — 360 × 780', width: 360, height: 780 },
  ],
  tablet: [
    { id: 'ipad', label: 'iPad / Air 11" — 820 × 1180', width: 820, height: 1180 },
    { id: 'ipad-mini', label: 'iPad mini — 744 × 1133', width: 744, height: 1133 },
    { id: 'ipad-pro-11', label: 'iPad Pro 11" — 834 × 1210', width: 834, height: 1210 },
    { id: 'ipad-pro-13', label: 'iPad Pro 13" — 1032 × 1376', width: 1032, height: 1376 },
    { id: 'galaxy-tab-s9', label: 'Galaxy Tab S9 — 800 × 1280', width: 800, height: 1280 },
  ],
  desktop: [
    { id: 'laptop', label: 'Laptop — 1440 × 900', width: 1440, height: 900, stand: 'laptop' },
    { id: 'macbook-air-13', label: 'MacBook Air 13" — 1470 × 956', width: 1470, height: 956, stand: 'laptop' },
    { id: 'macbook-pro-14', label: 'MacBook Pro 14" — 1512 × 982', width: 1512, height: 982, stand: 'laptop' },
    { id: 'laptop-small', label: 'Small laptop — 1280 × 800', width: 1280, height: 800, stand: 'laptop' },
    { id: 'monitor', label: 'Monitor — 1920 × 1080', width: 1920, height: 1080, stand: 'monitor' },
    { id: 'monitor-large', label: 'Large monitor — 2560 × 1440', width: 2560, height: 1440, stand: 'monitor' },
  ],
};

// Each slot's screenshot URL is stored in `case_study.media` under `key`, and
// its chosen preset id under `deviceFrameKey(key)`.
export const deviceSlots: { key: string; kind: DeviceKind; label: string }[] = [
  { key: 'device_phone_1', kind: 'phone', label: 'Mobile 1' },
  { key: 'device_phone_2', kind: 'phone', label: 'Mobile 2' },
  { key: 'device_tablet', kind: 'tablet', label: 'Tablet' },
  { key: 'device_desktop', kind: 'desktop', label: 'Desktop' },
];

export const deviceFrameKey = (slotKey: string) => `${slotKey}_frame`;

/** Every `case_study.media` key the device mockups use. */
export const deviceMediaKeys = deviceSlots.flatMap((slot) => [slot.key, deviceFrameKey(slot.key)]);

export function devicePreset(kind: DeviceKind, id?: string): DevicePreset {
  return devicePresets[kind].find((preset) => preset.id === id) ?? devicePresets[kind][0];
}
