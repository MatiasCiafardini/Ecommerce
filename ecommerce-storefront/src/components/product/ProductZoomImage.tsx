"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { getProductImageTransform } from "@/lib/product-image-layout";
import type { StoreProductImage } from "@/types/store";

type Point = { x: number; y: number };
type View = Point & { scale: number };
const initialView: View = { x: 0, y: 0, scale: 1 };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function ProductZoomImage({ src, title, layout, images = [], initialIndex = 0 }: {
  src: string; title: string; layout?: StoreProductImage; images?: StoreProductImage[]; initialIndex?: number;
}) {
  const photos = images.length ? images : [{ url: src }];
  const dialog = useRef<HTMLDialogElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const origin = useRef<HTMLDivElement>(null);
  const previewStart = useRef<Point | null>(null);
  const previewDragged = useRef(false);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ points: Point[]; view: View } | null>(null);
  const tap = useRef<{ time: number; point: Point } | null>(null);
  const lastTouch = useRef(0);
  const swipe = useRef<{ point: Point; time: number; moved: boolean; multiple: boolean } | null>(null);
  const current = useRef<View>(initialView);
  const limit = useRef(3);
  const [open, setOpen] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(false);
  const [index, setIndex] = useState(initialIndex);
  const [view, setView] = useState<View>(initialView);
  const [maxZoom, setMaxZoom] = useState(3);
  const photo = photos[index] ?? photos[0];

  function update(next: View) {
    const element = viewport.current;
    const scale = clamp(next.scale, 1, limit.current);
    const xLimit = element ? element.clientWidth * (scale - 1) / 2 : 0;
    const yLimit = element ? element.clientHeight * (scale - 1) / 2 : 0;
    const bounded = { scale, x: clamp(next.x, -xLimit, xLimit), y: clamp(next.y, -yLimit, yLimit) };
    current.current = bounded;
    setView(bounded);
  }
  function reset() { update(initialView); pointers.current.clear(); gesture.current = null; tap.current = null; swipe.current = null; }
  function changePhoto(next: number) {
    reset(); limit.current = 3; setMaxZoom(3);
    setIndex((next + photos.length) % photos.length);
  }
  function close() { setOpen(false); setPreviewZoom(false); reset(); }
  function show() { setIndex(initialIndex); reset(); setPreviewZoom(false); setOpen(true); }
  function zoomAt(scale: number, point?: Point) {
    const rect = viewport.current?.getBoundingClientRect();
    const previous = current.current;
    const nextScale = clamp(scale, 1, limit.current);
    const ratio = nextScale / previous.scale;
    const anchor = rect && point ? { x: point.x - rect.left - rect.width / 2, y: point.y - rect.top - rect.height / 2 } : { x: 0, y: 0 };
    update({ scale: nextScale, x: anchor.x - (anchor.x - previous.x) * ratio, y: anchor.y - (anchor.y - previous.y) * ratio });
  }
  function beginGesture() { gesture.current = { points: [...pointers.current.values()], view: { ...current.current } }; }
  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") lastTouch.current = Date.now();
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) swipe.current = { point: { x: event.clientX, y: event.clientY }, time: Date.now(), moved: false, multiple: false };
    else if (swipe.current) { swipe.current.multiple = true; tap.current = null; }
    beginGesture();
  }
  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const start = gesture.current;
    const points = [...pointers.current.values()];
    if (!start || start.points.length !== points.length) return;
    if (swipe.current && Math.hypot(event.clientX - swipe.current.point.x, event.clientY - swipe.current.point.y) > 10) swipe.current.moved = true;
    if (points.length >= 2) {
      const a = start.points[0], b = start.points[1], c = points[0], d = points[1];
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      if (distance < 1) return;
      const scale = clamp(start.view.scale * Math.hypot(d.x - c.x, d.y - c.y) / distance, 1, limit.current);
      const rect = event.currentTarget.getBoundingClientRect();
      const anchor = { x: (a.x + b.x) / 2 - rect.left - rect.width / 2, y: (a.y + b.y) / 2 - rect.top - rect.height / 2 };
      const shift = { x: (c.x + d.x - a.x - b.x) / 2, y: (c.y + d.y - a.y - b.y) / 2 };
      update({ scale, x: anchor.x - (anchor.x - start.view.x) * scale / start.view.scale + shift.x, y: anchor.y - (anchor.y - start.view.y) * scale / start.view.scale + shift.y });
    } else if (start.view.scale > 1) {
      update({ scale: start.view.scale, x: start.view.x + points[0].x - start.points[0].x, y: start.view.y + points[0].y - start.points[0].y });
    }
  }
  function pointerEnd(event: ReactPointerEvent<HTMLDivElement>, canceled = false) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId);
    const start = swipe.current;
    if (!pointers.current.size && start && !canceled && !start.multiple) {
      const dx = event.clientX - start.point.x, dy = event.clientY - start.point.y;
      if (current.current.scale === 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3 && Date.now() - start.time < 900) {
        changePhoto(index + (dx < 0 ? 1 : -1));
      } else if (!start.moved && event.pointerType !== "mouse") {
        const point = { x: event.clientX, y: event.clientY };
        if (tap.current && Date.now() - tap.current.time < 320 && Math.hypot(point.x - tap.current.point.x, point.y - tap.current.point.y) < 30) {
          zoomAt(current.current.scale > 1 ? 1 : 2, point); tap.current = null;
        } else tap.current = { time: Date.now(), point };
      }
    }
    if (canceled) tap.current = null;
    if (!pointers.current.size) { swipe.current = null; gesture.current = null; }
    else beginGesture();
  }

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const modal = dialog.current;
    const button = trigger.current;
    document.body.style.overflow = "hidden";
    modal?.showModal();
    return () => { document.body.style.overflow = previousOverflow; modal?.close(); button?.focus({ preventScroll: true }); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const resize = () => { current.current = initialView; setView(initialView); };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [open]);

  const control: CSSProperties = { border: "1px solid #dedbd5", borderRadius: 999, padding: "8px 12px", background: "#fff", color: "#1a1a1a", cursor: "pointer", minWidth: 44, minHeight: 44 };
  return <>
    <button ref={trigger} type="button" aria-label={`Ver detalle de ${title}`} aria-haspopup="dialog"
      onPointerLeave={() => setPreviewZoom(false)}
      onPointerDown={event => { previewStart.current = { x: event.clientX, y: event.clientY }; previewDragged.current = false; }}
      onPointerMove={event => {
        if (previewStart.current && Math.hypot(event.clientX - previewStart.current.x, event.clientY - previewStart.current.y) > 12) previewDragged.current = true;
        if (event.pointerType !== "mouse") return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (origin.current) origin.current.style.transformOrigin = `${clamp((event.clientX - rect.left) / rect.width * 100, 0, 100)}% ${clamp((event.clientY - rect.top) / rect.height * 100, 0, 100)}%`;
      }}
      onPointerCancel={() => { previewDragged.current = true; previewStart.current = null; }}
      onClick={event => {
        if (event.detail !== 0 && previewDragged.current) return;
        previewStart.current = null;
        if (event.detail === 0 || (event.nativeEvent as PointerEvent).pointerType !== "mouse") show();
        else setPreviewZoom(value => !value);
      }}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, padding: 0, background: "#fff", cursor: previewZoom ? "zoom-out" : "zoom-in", overflow: "hidden" }}>
      <div className="product-zoom-preview" ref={origin} style={{ position: "absolute", inset: 0, transform: previewZoom ? "scale(2.2)" : "scale(1)", transition: "transform 180ms ease-out" }}>
        <Image src={src} alt={title} fill sizes="(max-width: 900px) 150vw, 100vw" style={{ ...getProductImageTransform(layout), background: "#fff" }} />
      </div>
    </button>
    <button type="button" aria-label={`Ampliar foto de ${title}`} aria-haspopup="dialog" onClick={show}
      style={{ ...control, position: "absolute", bottom: 18, right: 18, display: "flex", alignItems: "center", gap: 7, boxShadow: "0 2px 12px #0001", fontSize: 12 }}>
      <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /></svg>Ampliar
    </button>
    <dialog ref={dialog} aria-label={`Foto ampliada de ${title}`} onCancel={close} onClose={() => setOpen(false)}
      onTouchStart={event => event.stopPropagation()} onTouchMove={event => event.stopPropagation()} onTouchEnd={event => event.stopPropagation()} onTouchCancel={event => event.stopPropagation()}
      onKeyDown={event => {
        if (event.target instanceof HTMLButtonElement) return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); if (current.current.scale === 1) changePhoto(index + (event.key === "ArrowRight" ? 1 : -1)); else update({ ...current.current, x: current.current.x + (event.key === "ArrowRight" ? -50 : 50) }); }
        if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); update({ ...current.current, y: current.current.y + (event.key === "ArrowDown" ? -50 : 50) }); }
      }}
      style={{ position: "fixed", inset: 0, margin: "auto", padding: 0, width: "100vw", height: "100dvh", maxWidth: "100vw", maxHeight: "100dvh", border: 0, background: "#f5f1ea", color: "#1a1a1a", overflow: "hidden" }}>
      {open ? <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 16px", flexShrink: 0, background: "#fff", borderBottom: "1px solid #e6e6e6" }}>
          <span style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
          <button type="button" autoFocus onClick={close} style={control} aria-label="Cerrar foto ampliada">Cerrar ×</button>
        </div>
        <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
          <div ref={viewport} tabIndex={0} aria-label="Foto ampliada. Usá dos dedos para ampliar o las flechas para recorrerla."
            onDoubleClick={event => { if (Date.now() - lastTouch.current < 700) return; zoomAt(current.current.scale > 1 ? 1 : 2, { x: event.clientX, y: event.clientY }); }}
            onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={event => pointerEnd(event)} onPointerCancel={event => pointerEnd(event, true)}
            onLostPointerCapture={event => pointerEnd(event, true)}
            style={{ position: "absolute", inset: 0, overflow: "hidden", touchAction: "none", cursor: view.scale > 1 ? "grab" : "zoom-in", overscrollBehavior: "contain" }}>
            <div style={{ position: "absolute", inset: 0, transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: "center" }}>
              {/* Original resolution is requested only while the viewer is open. */}
              <Image key={photo.url} src={photo.url} alt={`Detalle de ${title}, foto ${index + 1}`} fill unoptimized draggable={false}
                onLoad={event => {
                  const image = event.currentTarget, element = viewport.current;
                  if (!element || !image.naturalWidth || !image.naturalHeight) return;
                  const fit = Math.min(element.clientWidth / image.naturalWidth, element.clientHeight / image.naturalHeight);
                  const maximum = clamp(1 / fit, 1, 3);
                  limit.current = maximum; setMaxZoom(maximum);
                  update({ ...current.current, scale: Math.min(current.current.scale, maximum) });
                }}
                style={{ objectFit: "contain", userSelect: "none", pointerEvents: "none" }} />
            </div>
          </div>
          {photos.length > 1 ? <>
            <button type="button" onClick={() => changePhoto(index - 1)} aria-label="Foto anterior" style={{ ...control, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: .9 }}>‹</button>
            <button type="button" onClick={() => changePhoto(index + 1)} aria-label="Foto siguiente" style={{ ...control, position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", opacity: .9 }}>›</button>
          </> : null}
        </div>
        <div style={{ display: "grid", justifyItems: "center", gap: 8, padding: "10px 16px max(12px, env(safe-area-inset-bottom))", background: "#fff", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button type="button" disabled={view.scale <= 1} onClick={() => zoomAt(view.scale - .5)} style={control} aria-label="Reducir zoom">−</button>
            <output aria-live="polite" style={{ minWidth: 42, textAlign: "center", fontSize: 13 }}>{view.scale.toFixed(1)}×</output>
            <button type="button" disabled={view.scale >= maxZoom} onClick={() => zoomAt(view.scale + .5)} style={control} aria-label="Aumentar zoom">+</button>
            <button type="button" onClick={reset} style={{ ...control, fontSize: 12 }}>Restablecer</button>
            <span aria-live="polite" style={{ fontSize: 12, color: "#6e6e6e", whiteSpace: "nowrap" }}>{index + 1} / {photos.length}</span>
          </div>
          <small style={{ color: "#6e6e6e", textAlign: "center", fontSize: 11 }}>Dos dedos o doble toque para ampliar. Deslizá sin zoom para cambiar de foto.</small>
        </div>
      </div> : null}
    </dialog>
    <style jsx>{`@media (prefers-reduced-motion: reduce) { .product-zoom-preview { transition: none !important; } }`}</style>
  </>;
}
