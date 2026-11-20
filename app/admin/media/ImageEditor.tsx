'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_UPLOAD_BYTES, formatBytes, uploadImage } from '@/lib/mediaUpload';
import { replaceImageInProjects } from './actions';
import type { MediaItem } from './MediaLibrary';

type Rect = { x: number; y: number; w: number; h: number };
type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
type Format = 'image/jpeg' | 'image/webp' | 'image/png';

const MIN_CROP = 16;
// The on-screen preview is drawn at most this many pixels across; the crop
// and export always use the full-resolution image.
const PREVIEW_MAX = 1600;

const RATIOS: { id: string; label: string; value: number | 'original' | null }[] = [
  { id: 'free', label: 'Free', value: null },
  { id: 'original', label: 'Original', value: 'original' },
  { id: '1:1', label: '1:1', value: 1 },
  { id: '4:3', label: '4:3', value: 4 / 3 },
  { id: '3:2', label: '3:2', value: 3 / 2 },
  { id: '16:9', label: '16:9', value: 16 / 9 },
  { id: '4:5', label: '4:5', value: 4 / 5 },
  { id: '9:16', label: '9:16', value: 9 / 16 },
];
const WIDTH_PRESETS = [2560, 1920, 1440, 1280, 800];
const FORMATS: { value: Format; label: string; ext: string }[] = [
  { value: 'image/webp', label: 'WebP', ext: 'webp' },
  { value: 'image/jpeg', label: 'JPEG', ext: 'jpg' },
  { value: 'image/png', label: 'PNG', ext: 'png' },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** The largest rect of `ratio` that fits W×H, centred. */
function fitRect(W: number, H: number, ratio: number | null): Rect {
  if (!ratio) return { x: 0, y: 0, w: W, h: H };
  const w = W / H > ratio ? H * ratio : W;
  const h = w / ratio;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}

function resizeRect(start: Rect, handle: Handle, dx: number, dy: number, ratio: number | null, W: number, H: number): Rect {
  let left = start.x, top = start.y, right = start.x + start.w, bottom = start.y + start.h;
  if (handle.includes('w')) left = clamp(left + dx, 0, right - MIN_CROP);
  if (handle.includes('e')) right = clamp(right + dx, left + MIN_CROP, W);
  if (handle.includes('n')) top = clamp(top + dy, 0, bottom - MIN_CROP);
  if (handle.includes('s')) bottom = clamp(bottom + dy, top + MIN_CROP, H);
  if (ratio) {
    // Corner handles only: follow the larger change, then shrink to fit
    // between the fixed opposite corner and the image edge.
    let w = right - left, h = bottom - top;
    if (w / h > ratio) h = w / ratio; else w = h * ratio;
    const maxW = handle.includes('w') ? right : W - left;
    const maxH = handle.includes('n') ? bottom : H - top;
    if (h > maxH) { h = maxH; w = h * ratio; }
    if (w > maxW) { w = maxW; h = w / ratio; }
    if (handle.includes('w')) left = right - w; else right = left + w;
    if (handle.includes('n')) top = bottom - h; else bottom = top + h;
  }
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/** Draws the bitmap rotated (multiples of 90°) and optionally flipped. */
function orient(bitmap: ImageBitmap, rotation: number, flipX: boolean, flipY: boolean, maxSide = Infinity): HTMLCanvasElement {
  const swap = rotation % 180 !== 0;
  const fullW = swap ? bitmap.height : bitmap.width;
  const fullH = swap ? bitmap.width : bitmap.height;
  const scale = Math.min(1, maxSide / Math.max(fullW, fullH));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(fullW * scale);
  canvas.height = Math.round(fullH * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale((flipX ? -1 : 1) * scale, (flipY ? -1 : 1) * scale);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  return canvas;
}

/** Crops, then scales down in halving steps so large reductions stay sharp. */
function renderOutput(source: HTMLCanvasElement, crop: Rect, outW: number, outH: number, format: Format): HTMLCanvasElement {
  let canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(crop.w));
  canvas.height = Math.max(1, Math.round(crop.h));
  canvas.getContext('2d')!.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);
  while (canvas.width / 2 >= outW && canvas.height / 2 >= outH) {
    const half = document.createElement('canvas');
    half.width = Math.round(canvas.width / 2);
    half.height = Math.round(canvas.height / 2);
    const ctx = half.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, half.width, half.height);
    canvas = half;
  }
  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext('2d')!;
  // JPEG has no transparency; give it white rather than black.
  if (format === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, outW, outH); }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, outW, outH);
  return out;
}

const toBlob = (canvas: HTMLCanvasElement, format: Format, quality: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('This browser could not encode the image.'))), format, quality / 100)
  );

const btn = 'rounded-md border border-foreground/20 bg-white! text-foreground! px-3 py-1.5 text-sm hover:border-foreground disabled:opacity-40';
const btnOn = 'rounded-md border border-foreground bg-foreground! text-white! px-3 py-1.5 text-sm';
const label = 'text-[12px] font-semibold uppercase tracking-wide text-[#1d2327]/60';
const input = 'w-full rounded-md border border-foreground/20 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-foreground';

export default function ImageEditor({ item, onClose, onSaved }: {
  item: MediaItem;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [loadError, setLoadError] = useState('');
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [ratioId, setRatioId] = useState('free');
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, w: 1, h: 1 });
  const [width, setWidth] = useState<number | null>(null); // null = crop width
  const initialFormat = FORMATS.find((f) => f.value === item.type)?.value ?? 'image/webp';
  const [format, setFormat] = useState<Format>(initialFormat);
  const [quality, setQuality] = useState(85);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const fullRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: Handle | 'move'; x: number; y: number; start: Rect } | null>(null);

  // Load through fetch so the canvas is never tainted by a cross-origin <img>.
  useEffect(() => {
    let cancelled = false;
    fetch(item.url, { cache: 'no-store' })
      .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.blob(); })
      .then((blob) => createImageBitmap(blob))
      .then((bmp) => { if (!cancelled) setBitmap(bmp); })
      .catch((error) => { if (!cancelled) setLoadError(`Could not load the image (${error.message}).`); });
    return () => { cancelled = true; };
  }, [item.url]);

  const W = fullRef.current?.width ?? 1;
  const H = fullRef.current?.height ?? 1;
  const ratioOption = RATIOS.find((r) => r.id === ratioId)!;
  const ratio = ratioOption.value === 'original' ? W / H : ratioOption.value;

  // Re-draw the oriented image whenever rotation or flips change, and reset the crop.
  useEffect(() => {
    if (!bitmap) return;
    const full = orient(bitmap, rotation, flipX, flipY);
    fullRef.current = full;
    const preview = previewRef.current;
    if (preview) {
      const small = orient(bitmap, rotation, flipX, flipY, PREVIEW_MAX);
      preview.width = small.width;
      preview.height = small.height;
      preview.getContext('2d')!.drawImage(small, 0, 0);
    }
    const option = RATIOS.find((r) => r.id === ratioId)!;
    setCrop(fitRect(full.width, full.height, option.value === 'original' ? full.width / full.height : option.value));
    // ratioId is applied by its own handler; only orientation resets here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bitmap, rotation, flipX, flipY]);

  function chooseRatio(id: string) {
    setRatioId(id);
    const option = RATIOS.find((r) => r.id === id)!;
    setCrop(fitRect(W, H, option.value === 'original' ? W / H : option.value));
  }

  const cropW = Math.max(1, Math.round(crop.w));
  const cropH = Math.max(1, Math.round(crop.h));
  const outW = clamp(Math.round(width ?? cropW), 1, cropW);
  const outH = Math.max(1, Math.round((outW * crop.h) / crop.w));

  const onPointerDown = (mode: Handle | 'move') => (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    drag.current = { mode, x: event.clientX, y: event.clientY, start: crop };
  };

  useEffect(() => {
    function move(event: PointerEvent) {
      const state = drag.current;
      const stage = stageRef.current;
      if (!state || !stage) return;
      const scale = W / stage.getBoundingClientRect().width;
      const dx = (event.clientX - state.x) * scale;
      const dy = (event.clientY - state.y) * scale;
      if (state.mode === 'move') {
        setCrop({ ...state.start, x: clamp(state.start.x + dx, 0, W - state.start.w), y: clamp(state.start.y + dy, 0, H - state.start.h) });
      } else {
        setCrop(resizeRect(state.start, state.mode, dx, dy, ratio, W, H));
      }
    }
    function up() { drag.current = null; }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [W, H, ratio]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const render = useCallback(async () => {
    if (!fullRef.current) throw new Error('The image has not loaded yet.');
    return toBlob(renderOutput(fullRef.current, crop, outW, outH, format), format, quality);
  }, [crop, outW, outH, format, quality]);

  // File-size estimate, debounced so dragging stays smooth.
  useEffect(() => {
    if (!bitmap) return;
    setEstimate(null);
    const timer = setTimeout(() => { render().then((blob) => setEstimate(blob.size)).catch(() => {}); }, 450);
    return () => clearTimeout(timer);
  }, [bitmap, render]);

  async function save(replace: boolean) {
    setSaving(true);
    setSaveError('');
    try {
      const blob = await render();
      if (blob.size > MAX_UPLOAD_BYTES) throw new Error(`The result is ${formatBytes(blob.size)}; images must be under 1MB. Lower the quality or width, or try WebP.`);
      const ext = FORMATS.find((f) => f.value === format)!.ext;
      const url = await uploadImage(blob, `edited.${ext}`);
      if (!replace) { onSaved('Saved as a new image. The original is unchanged.'); return; }
      const result = await replaceImageInProjects(item.path, url);
      if (result.error) throw new Error(result.error);
      onSaved(`Saved and swapped into ${result.updated} project${result.updated === 1 ? '' : 's'}. The original is now unused; delete it when you're happy.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Saving failed.');
      setSaving(false);
    }
  }

  const pct = (value: number, total: number) => `${(value / total) * 100}%`;
  const handles: Handle[] = ratio ? ['nw', 'ne', 'sw', 'se'] : ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  const handlePos: Record<Handle, string> = {
    nw: 'left-0 top-0 cursor-nwse-resize', n: 'left-1/2 top-0 cursor-ns-resize', ne: 'left-full top-0 cursor-nesw-resize',
    e: 'left-full top-1/2 cursor-ew-resize', se: 'left-full top-full cursor-nwse-resize', s: 'left-1/2 top-full cursor-ns-resize',
    sw: 'left-0 top-full cursor-nesw-resize', w: 'left-0 top-1/2 cursor-ew-resize',
  };
  const tooBig = estimate !== null && estimate > MAX_UPLOAD_BYTES;
  const used = item.usedBy.length;

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-[#f3f3f0] text-[#1d2327]" role="dialog" aria-modal="true" aria-label="Edit image">
      <div className="flex items-center justify-between gap-4 border-b border-foreground/10 bg-white px-4 py-3 sm:px-6">
        <p className="font-semibold">Edit image</p>
        <button type="button" onClick={onClose} disabled={saving} className="bg-transparent! text-foreground! text-sm opacity-60">Close ✕</button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Stage */}
        <div className="flex min-h-[45vh] flex-1 items-center justify-center overflow-auto p-4 sm:p-8">
          {loadError ? <p className="text-sm text-warning">{loadError}</p> : !bitmap ? <p className="text-sm opacity-60">Loading…</p> : null}
          <div ref={stageRef} className={`relative inline-block touch-none select-none ${bitmap ? '' : 'hidden'}`}>
            <canvas ref={previewRef} className="block max-h-[70vh] max-w-full bg-[repeating-conic-gradient(#ddd_0_25%,#fff_0_50%)] bg-[length:16px_16px]" />
            <div
              className="absolute cursor-move outline outline-1 outline-white"
              style={{ left: pct(crop.x, W), top: pct(crop.y, H), width: pct(crop.w, W), height: pct(crop.h, H), boxShadow: '0 0 0 9999px rgba(0,0,0,.55)' }}
              onPointerDown={onPointerDown('move')}
            >
              {/* Rule-of-thirds guides */}
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,transparent_33.2%,rgba(255,255,255,.45)_33.3%,transparent_33.5%,transparent_66.5%,rgba(255,255,255,.45)_66.6%,transparent_66.8%),linear-gradient(to_bottom,transparent_33.2%,rgba(255,255,255,.45)_33.3%,transparent_33.5%,transparent_66.5%,rgba(255,255,255,.45)_66.6%,transparent_66.8%)]" />
              {handles.map((handle) => (
                <span
                  key={handle}
                  onPointerDown={onPointerDown(handle)}
                  className={`absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-black/40 bg-white ${handlePos[handle]}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <aside className="flex w-full shrink-0 flex-col gap-6 overflow-y-auto border-t border-foreground/10 bg-white p-5 lg:w-[340px] lg:border-l lg:border-t-0">
          <section className="flex flex-col gap-2">
            <p className={label}>Crop</p>
            <div className="flex flex-wrap gap-1.5">
              {RATIOS.map((option) => (
                <button key={option.id} type="button" onClick={() => chooseRatio(option.id)} className={ratioId === option.id ? btnOn : btn}>
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-xs opacity-60">{cropW} × {cropH}px selected. Drag the box to move it, or its handles to resize.</p>
            <button type="button" onClick={() => chooseRatio(ratioId)} className={`${btn} self-start`}>Reset crop</button>
          </section>

          <section className="flex flex-col gap-2">
            <p className={label}>Rotate and flip</p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setRotation((r) => (r + 270) % 360)} className={btn}>↺ 90°</button>
              <button type="button" onClick={() => setRotation((r) => (r + 90) % 360)} className={btn}>↻ 90°</button>
              <button type="button" onClick={() => setFlipX((f) => !f)} className={flipX ? btnOn : btn}>Flip ↔</button>
              <button type="button" onClick={() => setFlipY((f) => !f)} className={flipY ? btnOn : btn}>Flip ↕</button>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <p className={label}>Resize</p>
            <div className="flex items-center gap-2">
              <input
                type="number" min={1} max={cropW} value={outW} aria-label="Width in pixels" className={input}
                onChange={(e) => setWidth(e.target.value ? Number(e.target.value) : null)}
              />
              <span className="opacity-50">×</span>
              <input
                type="number" min={1} max={cropH} value={outH} aria-label="Height in pixels" className={input}
                onChange={(e) => setWidth(e.target.value ? Math.round((Number(e.target.value) * crop.w) / crop.h) : null)}
              />
              <span className="text-xs opacity-50">px</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {WIDTH_PRESETS.filter((preset) => preset < cropW).map((preset) => (
                <button key={preset} type="button" onClick={() => setWidth(preset)} className={outW === preset ? btnOn : btn}>{preset}</button>
              ))}
              <button type="button" onClick={() => setWidth(null)} className={outW === cropW ? btnOn : btn}>Full</button>
            </div>
            <p className="text-xs opacity-60">Keeps the crop&rsquo;s proportions. Images can be made smaller, not larger.</p>
          </section>

          <section className="flex flex-col gap-2">
            <p className={label}>Format</p>
            <div className="flex gap-1.5">
              {FORMATS.map((option) => (
                <button key={option.value} type="button" onClick={() => setFormat(option.value)} className={format === option.value ? btnOn : btn}>{option.label}</button>
              ))}
            </div>
            {format !== 'image/png' && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="flex justify-between text-xs opacity-70"><span>Quality</span><span>{quality}</span></span>
                <input type="range" min={40} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
              </label>
            )}
            <p className={`text-xs ${tooBig ? 'text-warning' : 'opacity-60'}`}>
              Original {formatBytes(item.size)} → new {estimate === null ? 'calculating…' : formatBytes(estimate)}
              {tooBig && ' — over the 1MB limit'}
            </p>
          </section>

          <section className="mt-auto flex flex-col gap-2 border-t border-foreground/10 pt-5">
            {saveError && <p className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">{saveError}</p>}
            {used > 0 && (
              <button type="button" disabled={saving || !bitmap || tooBig} onClick={() => save(true)} className="rounded-full bg-foreground! text-white! px-5 py-2.5 text-sm disabled:opacity-40">
                {saving ? 'Saving…' : `Save and use in ${used} project${used === 1 ? '' : 's'}`}
              </button>
            )}
            <button type="button" disabled={saving || !bitmap || tooBig} onClick={() => save(false)} className={used > 0 ? `${btn} rounded-full! py-2.5!` : 'rounded-full bg-foreground! text-white! px-5 py-2.5 text-sm disabled:opacity-40'}>
              {saving && used === 0 ? 'Saving…' : 'Save as a new image'}
            </button>
            <p className="text-xs opacity-60">
              {used > 0
                ? `Used by ${item.usedBy.map((p) => p.name).join(', ')}. The original file is kept either way.`
                : 'The original file is kept.'}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
