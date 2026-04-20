"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { resolveAssetUrl } from "@/lib/asset-url";

export type CategoryCarouselItem = {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  description?: string;
  href?: string;
  tone?: "soft" | "warm";
};

type Props = {
  categories: CategoryCarouselItem[];
};

export default function CategoryCarouselClient({ categories }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const moveByCard = (direction: "prev" | "next") => {
    const track = trackRef.current;
    if (!track) return;

    const firstCard = track.querySelector<HTMLElement>("[data-category-card]");
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0");
    const cardWidth = firstCard?.offsetWidth ?? 320;
    const delta = cardWidth + gap;

    track.scrollBy({
      left: direction === "next" ? delta : -delta,
      behavior: "smooth",
    });
  };

  return (
    <div className="theme-category-carousel-shell" style={shellStyle}>
      <button
        type="button"
        onClick={() => moveByCard("prev")}
        className="theme-button"
        aria-label="Ver categorias anteriores"
        style={sideButtonStyle}
      >
        <ArrowLeft />
      </button>

      <div
        ref={trackRef}
        className="theme-horizontal-scroll theme-category-carousel-track"
        style={trackStyle}
      >
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={cat.href ?? `/category/${cat.slug}`}
            className="theme-hover-lift theme-block-card theme-category-card"
            data-category-card="true"
            style={cardStyle}
          >
            <div
              className="theme-ambient-pan theme-category-media"
              data-tone={cat.tone ?? "soft"}
              style={mediaStyle}
            >
              {cat.imageUrl ? (
                <Image
                  src={resolveAssetUrl(cat.imageUrl) ?? cat.imageUrl}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 768px) 82vw, 340px"
                  style={{
                    objectFit: "cover",
                    objectPosition: "center center",
                  }}
                />
              ) : (
                "Placeholder"
              )}
            </div>

            <div>
              <h3 style={titleStyle}>{cat.name}</h3>
              <p style={descriptionStyle}>{cat.description ?? "Ver seleccion"}</p>
            </div>
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={() => moveByCard("next")}
        className="theme-button"
        aria-label="Ver mas categorias"
        style={sideButtonStyle}
      >
        <ArrowRight />
      </button>
    </div>
  );
}

function ArrowLeft() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const shellStyle = {
  display: "grid",
  gridTemplateColumns: "clamp(38px, 3vw, 48px) minmax(0, 1fr) clamp(38px, 3vw, 48px)",
  alignItems: "center",
  gap: 12,
  width: "min(100%, 1600px)",
  maxWidth: 1600,
  margin: "0 auto",
} as const;

const sideButtonStyle = {
  width: "clamp(38px, 3vw, 48px)",
  height: "clamp(160px, 18vw, 188px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-strong-bg, rgba(255,255,255,0.92))",
  color: "var(--text-strong)",
  cursor: "pointer",
  borderRadius: 18,
  alignSelf: "center",
} as const;

const trackStyle = {
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "clamp(138px, 12vw, 188px)",
  alignItems: "stretch",
  gap: 14,
  overflowX: "auto",
  overscrollBehaviorX: "contain",
  scrollSnapType: "x mandatory" as const,
  paddingBottom: 0,
  scrollbarWidth: "none",
  msOverflowStyle: "none",
} as const;

const cardStyle = {
  textDecoration: "none",
  color: "inherit",
  border: "1px solid var(--border-soft)",
  borderRadius: 22,
  minHeight: "clamp(160px, 18vw, 188px)",
  height: "100%",
  padding: 0,
  display: "block",
  overflow: "hidden",
  scrollSnapAlign: "start" as const,
  position: "relative" as const,
} as const;

const mediaStyle = {
  minHeight: "clamp(160px, 18vw, 188px)",
  height: "100%",
  borderRadius: 22,
  background: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(0,0,0,0.06))",
  display: "grid",
  placeItems: "center",
  color: "rgba(255,255,255,0.92)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.18em",
  fontSize: 12,
  position: "relative" as const,
  overflow: "hidden",
} as const;

const titleStyle = {
  position: "absolute" as const,
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  margin: 0,
  width: "calc(100% - 24px)",
  textAlign: "center" as const,
  fontSize: "clamp(0.95rem, 1.1vw, 1.08rem)",
  lineHeight: 1.1,
  textTransform: "none" as const,
  color: "#fffdf8",
  textShadow: "0 2px 12px rgba(73, 52, 28, 0.18)",
  zIndex: 2,
} as const;

const descriptionStyle = {
  margin: 0,
  display: "none",
} as const;
