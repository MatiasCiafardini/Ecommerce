"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { resolveAssetUrl } from "@/lib/asset-url";

type HeroCarouselSlide = {
  image: string;
  responsiveImage?: string;
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

const carouselTransition = "transform 920ms cubic-bezier(0.16, 1, 0.3, 1)";
const autoplayDelayMs = 4200;

function hasTextContent(value?: string) {
  return typeof value === "string" && value.trim().length > 0;
}

export default function HeroCarousel({
  slides = defaultSlides,
  buttonText,
  buttonLink = "/product",
  showContentCard = true,
}: Props) {
  const safeSlides = slides.length > 0 ? slides : defaultSlides;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [virtualIndex, setVirtualIndex] = useState(safeSlides.length > 1 ? 1 : 0);
  const [isTransitionEnabled, setIsTransitionEnabled] = useState(true);
  const [autoplayResetKey, setAutoplayResetKey] = useState(0);

  const renderedSlides = useMemo(() => {
    if (safeSlides.length <= 1) {
      return safeSlides;
    }

    const firstSlide = safeSlides[0];
    const lastSlide = safeSlides[safeSlides.length - 1];

    return [lastSlide, ...safeSlides, firstSlide];
  }, [safeSlides]);

  const goToSlide = (nextIndex: number, options?: { resetAutoplay?: boolean }) => {
    if (safeSlides.length === 0) {
      setActiveIndex(0);
      return;
    }

    const normalizedIndex =
      ((nextIndex % safeSlides.length) + safeSlides.length) % safeSlides.length;
    setActiveIndex(normalizedIndex);
    setIsTransitionEnabled(true);
    setVirtualIndex(normalizedIndex + 1);

    if (options?.resetAutoplay) {
      setAutoplayResetKey((key) => key + 1);
    }
  };

  const handleAutoplayAdvance = useEffectEvent(() => {
    goToSlide(activeIndex + 1);
  });

  useEffect(() => {
    if (safeSlides.length <= 1) {
      return;
    }

    const timeout = window.setTimeout(() => {
      handleAutoplayAdvance();
    }, autoplayDelayMs);

    return () => window.clearTimeout(timeout);
  }, [activeIndex, autoplayResetKey, safeSlides.length]);

  useEffect(() => {
    if (safeSlides.length <= 1) {
      return;
    }

    const track = trackRef.current;
    if (!track) {
      return;
    }

    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName !== "transform") {
        return;
      }

      if (virtualIndex === 0) {
        setIsTransitionEnabled(false);
        setVirtualIndex(safeSlides.length);
        return;
      }

      if (virtualIndex === renderedSlides.length - 1) {
        setIsTransitionEnabled(false);
        setVirtualIndex(1);
      }
    };

    track.addEventListener("transitionend", handleTransitionEnd);
    return () => track.removeEventListener("transitionend", handleTransitionEnd);
  }, [renderedSlides.length, safeSlides.length, virtualIndex]);

  useEffect(() => {
    if (isTransitionEnabled) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setIsTransitionEnabled(true);
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isTransitionEnabled]);

  const slideBasis = `${100 / renderedSlides.length}%`;

  return (
    <section
      className="theme-block-section theme-block-section--hero-carousel"
      data-hero-carousel-variant={showContentCard ? "card" : "editorial"}
      style={{ padding: 0 }}
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
          ref={trackRef}
          className="theme-hero-carousel-track"
          data-transition-enabled={isTransitionEnabled ? "true" : "false"}
          style={{
            display: "flex",
            width: `${renderedSlides.length * 100}%`,
            minHeight: "clamp(460px, 62vh, 600px)",
            transform: `translate3d(-${virtualIndex * (100 / renderedSlides.length)}%, 0, 0)`,
            willChange: "transform",
            backfaceVisibility: "hidden",
          }}
        >
          {renderedSlides.map((slide, index) => {
            const slideImage = resolveAssetUrl(slide.image) ?? slide.image;
            const slideResponsiveImage = slide.responsiveImage
              ? (resolveAssetUrl(slide.responsiveImage) ?? slide.responsiveImage)
              : "";
            const isCenter = slide.align === "center";
            const hasSlideContent =
              hasTextContent(slide.eyebrow) ||
              hasTextContent(slide.title) ||
              hasTextContent(slide.subtitle);
            const isCloneFirst = safeSlides.length > 1 && index === renderedSlides.length - 1;
            const isCloneLast = safeSlides.length > 1 && index === 0;
            const isInitialSlide = safeSlides.length > 1 ? index === 1 : index === 0;
            const logicalIndex = isCloneLast
              ? safeSlides.length - 1
              : isCloneFirst
                ? 0
                : Math.max(0, index - 1);

            return (
              <div
                key={`${slide.title}-${index}`}
                aria-hidden={logicalIndex !== activeIndex}
                style={{
                  position: "relative",
                  flex: `0 0 ${slideBasis}`,
                  minWidth: slideBasis,
                  minHeight: "clamp(460px, 62vh, 600px)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 0,
                  }}
                >
                  <picture>
                    {slideResponsiveImage ? (
                      <source media="(max-width: 768px)" srcSet={slideResponsiveImage} />
                    ) : null}
                    <Image
                      className="theme-hero-carousel-image"
                      src={slideImage}
                      alt=""
                      fill
                      priority={isInitialSlide}
                      sizes="100vw"
                      draggable={false}
                      style={{
                        objectFit: "cover",
                        objectPosition: "var(--hero-carousel-image-position, center)",
                        userSelect: "none",
                        pointerEvents: "none",
                      }}
                    />
                  </picture>
                </div>

                <div
                  className="theme-hero-carousel-overlay"
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 1,
                    background:
                      "var(--hero-carousel-overlay, linear-gradient(180deg, color-mix(in srgb, var(--paper) 8%, transparent) 0%, color-mix(in srgb, var(--background) 12%, transparent) 100%))",
                  }}
                />

                <div
                  className="theme-hero-carousel-content"
                  style={{
                    position: "relative",
                    zIndex: 2,
                    minHeight: "clamp(460px, 62vh, 600px)",
                    padding: "var(--hero-carousel-content-padding, 48px 20px 20px)",
                    display: "grid",
                    alignItems: "end",
                  }}
                  >
                    <div
                      style={{
                        width: "100%",
                        maxWidth: "var(--store-wide-max)",
                      margin: "0 auto",
                        display: "grid",
                        alignItems: "end",
                      }}
                    >
                      {hasSlideContent ? (
                        showContentCard ? (
                          <div
                            className="theme-hero-carousel-copy theme-hero-carousel-copy--card"
                            style={{
                              maxWidth: "var(--hero-carousel-copy-max-width, 560px)",
                              display: "grid",
                              gap: "var(--hero-carousel-copy-gap, 16px)",
                              padding: "var(--hero-carousel-copy-padding, 28px)",
                              minHeight: "clamp(360px, 42vw, 520px)",
                              borderRadius: "var(--theme-radius-panel)",
                              background:
                                "color-mix(in srgb, var(--page-panel-bg) 82%, transparent)",
                              border: "1px solid var(--border-soft)",
                              backdropFilter: "blur(14px)",
                              alignContent: "space-between",
                              justifyItems: isCenter ? "center" : "start",
                              textAlign: isCenter ? "center" : "left",
                            }}
                          >
                            <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
                              {slide.eyebrow ? (
                                <span
                                  className="theme-hero-carousel-eyebrow"
                                  style={{
                                    textTransform: "uppercase",
                                    letterSpacing: "0.18em",
                                    fontSize: 12,
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  {slide.eyebrow}
                                </span>
                              ) : null}

                              {hasTextContent(slide.title) ? (
                                <h1
                                  className="theme-hero-carousel-title"
                                  style={{
                                    margin: 0,
                                    fontSize: "clamp(2.2rem, 6vw, 4.6rem)",
                                    lineHeight: 0.96,
                                    letterSpacing: "-0.05em",
                                    color: "var(--text-strong)",
                                  }}
                                >
                                  {slide.title}
                                </h1>
                              ) : null}

                              {slide.subtitle ? (
                                <p
                                  className="theme-hero-carousel-subtitle"
                                  style={{
                                    margin: 0,
                                    maxWidth: "var(--hero-carousel-subtitle-max-width, 46rem)",
                                    color: "var(--text-muted)",
                                    lineHeight: 1.7,
                                    fontSize: "1rem",
                                  }}
                                >
                                  {slide.subtitle}
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
                        ) : (
                          <div
                            className="theme-hero-carousel-copy theme-hero-carousel-copy--editorial"
                            style={{
                              maxWidth: "var(--hero-carousel-copy-max-width, 620px)",
                              display: "grid",
                              gap: "var(--hero-carousel-copy-gap, 18px)",
                              justifyItems: isCenter ? "center" : "start",
                              textAlign: isCenter ? "center" : "left",
                              alignContent: "end",
                            }}
                          >
                            {slide.eyebrow ? (
                              <span
                                className="theme-hero-carousel-eyebrow"
                                style={{
                                  display: "inline-flex",
                                  width: "fit-content",
                                  padding: "10px 14px",
                                  borderRadius: 999,
                                  border: "1px solid rgba(255,255,255,0.22)",
                                  background: "rgba(255,255,255,0.12)",
                                  backdropFilter: "blur(10px)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.18em",
                                  fontSize: 12,
                                  color: "#fffaf3",
                                }}
                              >
                                {slide.eyebrow}
                              </span>
                            ) : null}

                            {hasTextContent(slide.title) ? (
                              <h1
                                className="theme-hero-carousel-title"
                                style={{
                                  margin: 0,
                                  fontSize: "clamp(2.8rem, 7vw, 5.8rem)",
                                  lineHeight: 0.92,
                                  letterSpacing: "-0.05em",
                                  color: "#fffaf3",
                                  textShadow: "0 10px 30px rgba(62, 42, 24, 0.22)",
                                }}
                              >
                                {slide.title}
                              </h1>
                            ) : null}

                            {slide.subtitle ? (
                              <p
                                className="theme-hero-carousel-subtitle"
                                style={{
                                  margin: 0,
                                  maxWidth: "var(--hero-carousel-subtitle-max-width, 46rem)",
                                  color: "rgba(255,250,243,0.92)",
                                  lineHeight: 1.8,
                                  fontSize: "clamp(1rem, 1.5vw, 1.08rem)",
                                  textShadow: "0 8px 24px rgba(62, 42, 24, 0.16)",
                                }}
                              >
                                {slide.subtitle}
                              </p>
                            ) : null}

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
                                  border: "1px solid rgba(255,250,243,0.86)",
                                  background: "rgba(255,250,243,0.9)",
                                  color: "var(--text-strong)",
                                  textDecoration: "none",
                                  fontWeight: 700,
                                }}
                              >
                                {buttonText}
                              </Link>
                            ) : null}
                          </div>
                        )
                      ) : null}
                    </div>
                  </div>
                </div>
            );
          })}
        </div>

        {safeSlides.length > 1 ? (
          <>
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
                zIndex: 3,
              }}
            >
              {safeSlides.map((slide, index) => (
                <button
                  key={`${slide.title}-${index}`}
                  type="button"
                  aria-label={`Ver banner ${index + 1}`}
                  aria-pressed={index === activeIndex}
                  onClick={() => goToSlide(index, { resetAutoplay: true })}
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
          </>
        ) : null}
      </div>

      <style jsx>{`
        .theme-hero-carousel-track[data-transition-enabled="true"] {
          transition: ${carouselTransition};
        }

        .theme-hero-carousel-track[data-transition-enabled="false"] {
          transition: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .theme-hero-carousel-track[data-transition-enabled="true"] {
            transition: ${carouselTransition} !important;
          }

          .theme-hero-carousel-track[data-transition-enabled="false"] {
            transition: none !important;
          }
        }
      `}</style>
    </section>
  );
}
