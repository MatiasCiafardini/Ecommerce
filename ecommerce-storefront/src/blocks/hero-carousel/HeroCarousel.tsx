"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { resolveAssetUrl } from "@/lib/asset-url";

type HeroCarouselSlide = {
  image: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
};

type Props = {
  slides?: HeroCarouselSlide[];
  buttonText?: string;
  buttonLink?: string;
  showContentCard?: boolean;
};

const defaultSlides: HeroCarouselSlide[] = [
  {
    image: "/images/seed-catalog/promo-running-1.png",
    eyebrow: "Nueva capsula",
    title: "Texturas suaves",
    subtitle: "Liviano y combinable.",
  },
  {
    image: "/images/seed-catalog/promo-running-2.png",
    eyebrow: "Drop curado",
    title: "Capas claras",
    subtitle: "Calma con presencia.",
  },
  {
    image: "/images/seed-catalog/pantalon-studio-pant-front.png",
    eyebrow: "Edicion Aurea",
    title: "Lineas limpias",
    subtitle: "Todos los dias mejor.",
  },
];

export default function HeroCarousel({
  slides = defaultSlides,
  buttonText,
  buttonLink = "/product",
  showContentCard = true,
}: Props) {
  const safeSlides = slides.length > 0 ? slides : defaultSlides;
  const [activeIndex, setActiveIndex] = useState(0);
  const measureRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [heroCardHeight, setHeroCardHeight] = useState("clamp(280px, 32vw, 360px)");

  useEffect(() => {
    if (safeSlides.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % safeSlides.length);
    }, 4200);

    return () => window.clearInterval(interval);
  }, [safeSlides.length]);

  useLayoutEffect(() => {
    if (!showContentCard) {
      return;
    }

    const measureHeight = () => {
      const heights = measureRefs.current
        .map((node) => node?.offsetHeight ?? 0)
        .filter((height) => height > 0);

      if (heights.length === 0) {
        return;
      }

      setHeroCardHeight(`${Math.max(...heights)}px`);
    };

    measureHeight();
    window.addEventListener("resize", measureHeight);

    return () => window.removeEventListener("resize", measureHeight);
  }, [safeSlides, buttonText, buttonLink, showContentCard]);

  const activeSlide = safeSlides[activeIndex];
  const activeSlideImage = resolveAssetUrl(activeSlide.image) ?? activeSlide.image;

  return (
    <section
      className="theme-block-section theme-block-section--hero-carousel"
      style={{
        padding: 0,
      }}
    >
      <div
        className="theme-hero-carousel"
        style={{
          position: "relative",
          minHeight: "clamp(460px, 62vh, 600px)",
          overflow: "hidden",
          backgroundColor: "var(--paper-muted)",
        }}
      >
        <div
          key={activeSlideImage}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
          }}
        >
          {/* Decorative hero media renders more reliably as a plain image for local and uploaded assets. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeSlideImage}
            alt=""
            loading="eager"
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--paper) 8%, transparent) 0%, color-mix(in srgb, var(--background) 12%, transparent) 100%)",
          }}
        />

        {showContentCard ? (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              visibility: "hidden",
              pointerEvents: "none",
              overflow: "hidden",
              zIndex: -1,
            }}
          >
            <div
              style={{
                maxWidth: 1280,
                margin: "0 auto",
                padding: "48px 20px 84px",
                display: "grid",
              }}
            >
              {safeSlides.map((slide, index) => (
                <div
                  key={`${slide.title}-measure-${index}`}
                  ref={(node) => {
                    measureRefs.current[index] = node;
                  }}
                  style={{
                    maxWidth: 560,
                    display: "grid",
                    gap: 16,
                    padding: "28px",
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
                    {slide.eyebrow ? (
                      <span
                        style={{
                          textTransform: "uppercase",
                          letterSpacing: "0.18em",
                          fontSize: 12,
                          lineHeight: 1.2,
                        }}
                      >
                        {slide.eyebrow}
                      </span>
                    ) : null}

                    <h1
                      style={{
                        margin: 0,
                        fontSize: "clamp(2.2rem, 6vw, 4.6rem)",
                        lineHeight: 0.96,
                        letterSpacing: "-0.05em",
                      }}
                    >
                      {slide.title}
                    </h1>

                    {slide.subtitle ? (
                      <p
                        style={{
                          margin: 0,
                          maxWidth: 46 * 16,
                          lineHeight: 1.7,
                          fontSize: "1rem",
                        }}
                      >
                        {slide.subtitle}
                      </p>
                    ) : null}
                  </div>

                  {buttonText ? (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "fit-content",
                        minHeight: 48,
                        padding: "0 22px",
                        boxSizing: "border-box",
                      }}
                    >
                      {buttonText}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div
          style={{
            position: "relative",
            zIndex: 1,
            minHeight: "clamp(460px, 62vh, 600px)",
            maxWidth: 1280,
            margin: "0 auto",
            padding: "48px 20px 84px",
            display: "grid",
            alignItems: "end",
          }}
        >
          {showContentCard ? (
            <div
              style={{
                maxWidth: 560,
                display: "grid",
                gap: 16,
                padding: "28px",
                minHeight: heroCardHeight,
                height: heroCardHeight,
                borderRadius: "var(--theme-radius-panel)",
                background: "color-mix(in srgb, var(--page-panel-bg) 82%, transparent)",
                border: "1px solid var(--border-soft)",
                backdropFilter: "blur(14px)",
                alignContent: "space-between",
                justifyItems: activeSlide.align === "center" ? "center" : "start",
                textAlign: activeSlide.align === "center" ? "center" : "left",
              }}
            >
              <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
                {activeSlide.eyebrow ? (
                  <span
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.18em",
                      fontSize: 12,
                      color: "var(--text-muted)",
                    }}
                  >
                    {activeSlide.eyebrow}
                  </span>
                ) : null}

                <h1
                  style={{
                    margin: 0,
                    fontSize: "clamp(2.2rem, 6vw, 4.6rem)",
                    lineHeight: 0.96,
                    letterSpacing: "-0.05em",
                    color: "var(--text-strong)",
                  }}
                >
                  {activeSlide.title}
                </h1>

                {activeSlide.subtitle ? (
                  <p
                    style={{
                      margin: 0,
                      maxWidth: 46 * 16,
                      color: "var(--text-muted)",
                      lineHeight: 1.7,
                      fontSize: "1rem",
                    }}
                  >
                    {activeSlide.subtitle}
                  </p>
                ) : null}
              </div>

              {buttonText ? (
                <Link
                  href={buttonLink}
                  className="theme-button"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "fit-content",
                    minHeight: 48,
                    padding: "0 22px",
                    borderRadius: 999,
                    border: "1px solid var(--accent-strong)",
                    background: "var(--accent-strong)",
                    color: "var(--accent-contrast)",
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  {buttonText}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>

        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 22,
            transform: "translateX(-50%)",
            display: "flex",
            gap: 10,
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 14px",
            borderRadius: 999,
            background: "color-mix(in srgb, var(--page-panel-bg) 82%, transparent)",
            border: "1px solid var(--border-soft)",
            backdropFilter: "blur(10px)",
          }}
        >
          {safeSlides.map((slide, index) => (
            <button
              key={`${slide.title}-${index}`}
              type="button"
              aria-label={`Ver banner ${index + 1}`}
              aria-pressed={index === activeIndex}
              onClick={() => setActiveIndex(index)}
              style={{
                width: 18,
                height: 18,
                display: "grid",
                placeItems: "center",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                padding: 0,
                background: "transparent",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background:
                    index === activeIndex
                      ? "var(--text-strong)"
                      : "color-mix(in srgb, var(--text-strong) 38%, transparent)",
                  transform: index === activeIndex ? "scale(1.05)" : "scale(1)",
                  transition: "transform 180ms ease, background-color 180ms ease",
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
