"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { getProductImageTransform } from "@/lib/product-image-layout";
import type { StoreProductImage } from "@/types/store";

export default function ProductZoomImage({ src, title, layout }: { src: string; title: string; layout?: StoreProductImage }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [hover, setHover] = useState(false);
  const origin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const currentDialog = dialog.current;
    const currentTrigger = trigger.current;
    document.body.style.overflow = "hidden";
    currentDialog?.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
      currentDialog?.close();
      currentTrigger?.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    const element = viewport.current;
    if (element) {
      element.scrollLeft = (element.scrollWidth - element.clientWidth) / 2;
      element.scrollTop = (element.scrollHeight - element.clientHeight) / 2;
    }
  }, [scale, open]);

  function close() { setOpen(false); setScale(1); setHover(false); }
  const controlStyle: CSSProperties = { border: "1px solid #d8ded9", borderRadius: 999, padding: "10px 14px", background: "#fff", color: "#1a1a1a", cursor: "pointer", minHeight: 44 };

  return <>
    <button ref={trigger} type="button" aria-label={`Ampliar foto de ${title}`} aria-haspopup="dialog"
      onPointerEnter={event => { if (event.pointerType === "mouse") setHover(true); }}
      onPointerLeave={() => setHover(false)}
      onPointerDown={event => { touchStart.current = { x: event.clientX, y: event.clientY }; dragged.current = false; }}
      onPointerMove={event => {
        if (touchStart.current && Math.hypot(event.clientX - touchStart.current.x, event.clientY - touchStart.current.y) > 12) dragged.current = true;
        if (event.pointerType !== "mouse") return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (origin.current) origin.current.style.transformOrigin = `${Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100))}% ${Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100))}%`;
      }}
      onPointerCancel={() => { dragged.current = true; touchStart.current = null; }}
      onClick={event => { if (event.detail !== 0 && dragged.current) return; touchStart.current = null; setOpen(true); setHover(false); }}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, padding: 0, background: "#fff", cursor: "zoom-in", overflow: "hidden", color: "#1a1a1a" }}>
      <div className="product-zoom-preview" ref={origin} style={{ position: "absolute", inset: 0, transform: hover ? "scale(2.2)" : "scale(1)", transition: "transform 180ms ease-out" }}>
        <Image src={src} alt={title} fill sizes="(max-width: 900px) 150vw, 100vw" style={{ ...getProductImageTransform(layout), background: "#fff" }} />
      </div>
      <span style={{ position: "absolute", bottom: 18, right: 18, display: "flex", alignItems: "center", gap: 7, borderRadius: 999, padding: "9px 12px", background: "rgba(255,255,255,.94)", boxShadow: "0 2px 12px #0001", fontSize: 12 }}>
        <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6M7 10h6M10 7v6"/></svg>Ampliar
      </span>
    </button>
    <dialog ref={dialog} aria-label={`Foto ampliada de ${title}`} onCancel={close} onClose={() => setOpen(false)}
      onTouchStart={event => event.stopPropagation()} onTouchEnd={event => event.stopPropagation()} onTouchCancel={event => event.stopPropagation()}
      style={{ position: "fixed", inset: 0, margin: "auto", padding: 0, width: "100vw", height: "100dvh", maxWidth: "100vw", maxHeight: "100dvh", border: 0, background: "#f5f1ea", color: "#1a1a1a", overflow: "hidden" }}>
      {open ? <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", flexShrink: 0, background: "#fff", borderBottom: "1px solid #e6e6e6" }}>
          <span style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
          <button type="button" autoFocus onClick={close} style={controlStyle} aria-label="Cerrar foto ampliada">Cerrar ✕</button>
        </div>
        <div ref={viewport} tabIndex={0} aria-label="Foto ampliada. Usá las flechas para recorrerla." onDoubleClick={() => setScale(current => current === 1 ? 2 : 1)}
          onPointerDown={event => {
            if (event.pointerType !== "mouse" || scale === 1) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop };
          }}
          onPointerMove={event => { if (drag.current) { event.currentTarget.scrollLeft = drag.current.left + drag.current.x - event.clientX; event.currentTarget.scrollTop = drag.current.top + drag.current.y - event.clientY; } }}
          onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
          style={{ flex: 1, minHeight: 0, overflow: "auto", cursor: scale > 1 ? "grab" : "zoom-in", overscrollBehavior: "contain" }}>
          <div style={{ position: "relative", width: `${scale * 100}%`, height: `${scale * 100}%`, minHeight: "100%" }}>
            <Image src={src} alt={`Detalle de ${title}`} fill sizes="300vw" draggable={false} style={{ objectFit: "contain", userSelect: "none", pointerEvents: "none" }} />
          </div>
        </div>
        <div style={{ display: "grid", justifyItems: "center", gap: 8, padding: "12px 16px max(12px, env(safe-area-inset-bottom))", background: "#fff", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button type="button" disabled={scale === 1} onClick={() => setScale(current => Math.max(1, current - 1))} style={controlStyle} aria-label="Reducir zoom">−</button>
            <output aria-live="polite" style={{ minWidth: 42, textAlign: "center" }}>{scale}×</output>
            <button type="button" disabled={scale === 3} onClick={() => setScale(current => Math.min(3, current + 1))} style={controlStyle} aria-label="Aumentar zoom">+</button>
            <button type="button" onClick={() => setScale(1)} style={controlStyle}>Restablecer</button>
          </div>
          <small style={{ color: "#6e6e6e", textAlign: "center" }}>Aumentá el zoom y deslizá la foto para explorar los detalles.</small>
        </div>
      </div> : null}
    </dialog>
    <style jsx>{`@media (prefers-reduced-motion: reduce) { .product-zoom-preview { transition: none !important; } }`}</style>
  </>;
}
