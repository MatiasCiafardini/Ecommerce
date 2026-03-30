"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

type AnimationPreset = "up" | "soft" | "none";

type Props = {
  preset: AnimationPreset;
  delayMs?: number;
  children: ReactNode;
};

export default function BlockReveal({ preset, delayMs = 0, children }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasAnimatedRef = useRef(false);

  useLayoutEffect(() => {
    if (preset === "none") {
      return;
    }

    const node = containerRef.current;
    if (!node) {
      return;
    }

    const hiddenTransform = preset === "soft" ? "translateY(20px) scale(0.985)" : "translateY(28px)";
    const hiddenFilter = preset === "soft" ? "blur(1px) saturate(0.94)" : "blur(1px) saturate(0.92)";

    const clearInlineRevealStyles = () => {
      node.style.opacity = "1";
      node.style.transform = "none";
      node.style.filter = "none";
      node.style.willChange = "auto";
    };

    const prepareHiddenState = () => {
      node.style.opacity = "0";
      node.style.transform = hiddenTransform;
      node.style.filter = hiddenFilter;
      node.style.willChange = "opacity, transform, filter";
    };

    const runAnimation = () => {
      if (hasAnimatedRef.current) {
        return;
      }

      hasAnimatedRef.current = true;

      if (typeof node.animate !== "function") {
        clearInlineRevealStyles();
        return;
      }

      const animation = node.animate(
        [
          {
            opacity: 0,
            transform: hiddenTransform,
            filter: hiddenFilter,
          },
          {
            opacity: 1,
            transform: "translateY(0) scale(1)",
            filter: "blur(0) saturate(1)",
          },
        ],
        {
          duration: preset === "soft" ? 620 : 580,
          delay: delayMs,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        },
      );

      animation.onfinish = clearInlineRevealStyles;
      animation.oncancel = clearInlineRevealStyles;
    };

    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const rect = node.getBoundingClientRect();
    const isAlreadyVisible = rect.top < viewportHeight * 0.92 && rect.bottom > 0;

    if (isAlreadyVisible) {
      clearInlineRevealStyles();
      return;
    }

    prepareHiddenState();

    if (typeof IntersectionObserver === "undefined") {
      requestAnimationFrame(runAnimation);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) {
          return;
        }

        observer.disconnect();
        runAnimation();
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -10% 0px",
      },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      clearInlineRevealStyles();
    };
  }, [delayMs, preset]);

  return <div ref={containerRef}>{children}</div>;
}
