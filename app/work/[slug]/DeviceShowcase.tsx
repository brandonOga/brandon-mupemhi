import Image from "next/image";
import type { CSSProperties } from "react";
import type { DeviceKind, DevicePreset } from "@/lib/devices";

export type ShowcaseDevice = { key: string; kind: DeviceKind; label: string; preset: DevicePreset; src?: string };

// A device is drawn around its real viewport: every bezel, radius and button
// in the CSS is a number of device pixels, scaled by the frame's own width.
// `body` is the shell around the screen and `outer` the whole drawing, which
// is wider where something sticks out (a phone's buttons, a laptop's deck).
function geometry({ kind, preset }: ShowcaseDevice) {
  if (kind === "phone") return { type: "phone", body: preset.width + 34, outer: preset.width + 39 };
  if (kind === "tablet") return { type: "tablet", body: preset.width + 64, outer: preset.width + 64 };
  if (preset.stand === "monitor") return { type: "monitor", body: preset.width + 40, outer: preset.width + 40 };
  return { type: "laptop", body: preset.width + 44, outer: (preset.width + 44) * 1.14 };
}

// How wide each screen is drawn, so the browser fetches a screenshot sharp
// enough for it. Keep in step with the .mock-band widths in globals.css.
const imageSizes: Record<DeviceKind, string> = {
  phone: "(max-width: 767px) 46vw, (max-width: 1023px) 32vw, 22vw",
  tablet: "(max-width: 767px) 76vw, (max-width: 1023px) 56vw, 38vw",
  desktop: "(max-width: 1023px) 100vw, 62vw",
};

function DeviceFrame({ device, name }: { device: ShowcaseDevice; name: string }) {
  const { type, body, outer } = geometry(device);
  const { width, height } = device.preset;
  return <div className={`mock mock-${type}`} style={{ "--mock-w": outer, "--mock-body-w": body } as CSSProperties}>
    <div className="mock-frame">
      {type === "phone" && <><span className="mock-btn" /><span className="mock-btn" /></>}
      <div className="mock-body"><div className="mock-glass">
        {type !== "phone" && <span className="mock-cam" />}
        <div className="mock-screen" style={{ aspectRatio: `${width} / ${height}` }}>
          {device.src && <Image src={device.src} alt={`${name} on ${device.label.toLowerCase()}`} fill className="object-cover object-top" sizes={imageSizes[device.kind]} quality={90} />}
        </div>
      </div></div>
      {type === "laptop" && <><span className="mock-hinge" /><span className="mock-deck" /></>}
      {type === "monitor" && <><span className="mock-neck" /><span className="mock-foot" /></>}
    </div>
  </div>;
}

// Three bands stacked top to bottom: the phones, then the tablet, then the
// desktop. The tablet is sized against the desktop so the two share a scale;
// the phones are drawn larger, each in its own half with the second set lower.
export default function DeviceShowcase({ devices, name }: { devices: ShowcaseDevice[]; name: string }) {
  const bands = (["phone", "tablet", "desktop"] as const)
    .map((kind) => devices.filter((device) => device.kind === kind))
    .filter((band) => band.length > 0);
  const bandWidth = (band: ShowcaseDevice[]) =>
    band.reduce((total, device) => total + geometry(device).outer, 0) + 80 * (band.length - 1);
  const widest = Math.round(Math.max(...bands.map(bandWidth)));

  return <div className="mock-stack" style={{ "--mock-stack-w": widest } as CSSProperties}>
    {bands.map((band) => <div key={band[0].kind} className="mock-band" data-kind={band[0].kind}>
      {band.map((device) => <DeviceFrame key={device.key} device={device} name={name} />)}
    </div>)}
  </div>;
}
