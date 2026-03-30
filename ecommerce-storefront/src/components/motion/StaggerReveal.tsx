"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  delayMs?: number;
  distancePx?: number;
};

export default function StaggerReveal({ children, delayMs = 0, distancePx = 18 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasAnimatedRef = useRef(false);

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node || hasAnimatedRef.current) {
      return;
    }

    const hiddenTransform = `translateY(${distancePx}px)`;

    const clearInlineStyles = () => {
      node.style.opacity = "1";
      node.style.transform = "none";
      node.style.filter = "none";
      node.style.willChange = "auto";
    };

    const prepareHiddenState = () => {
      node.style.opacity = "0";
      node.style.transform = hiddenTransform;
      node.style.filter = "blur(1px) saturate(0.94)";
      node.style.willChange = "opacity, transform, filter";
    };

    const runAnimation = () => {
      if (hasAnimatedRef.current) {
        return;
      }

      hasAnimatedRef.current = true;

      if (typeof node.animate !== "function") {
        clearInlineStyles();
        return;
      }

      const animation = node.animate(
        [
          {
            opacity: 0,
            transform: hiddenTransform,
            filter: "blur(1px) saturate(0.94)",
          },
          {
            opacity: 1,
            transform: "translateY(0)",
            filter: "blur(0) saturate(1)",
          },
        ],
        {
          duration: 620,
          delay: delayMs,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        },
      );

      animation.onfinish = clearInlineStyles;
      animation.oncancel = clearInlineStyles;
    };

    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const rect = node.getBoundingClientRect();
    const isNearViewport = rect.top < viewportHeight * 0.95 && rect.bottom > 0;

    prepareHiddenState();

    if (isNearViewport || typeof IntersectionObserver === "undefined") {
      runAnimation();
      return () => clearInlineStyles();
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
      clearInlineStyles();
    };
  }, [delayMs, distancePx]);

  return <div ref={containerRef}>{children}</div>;
}
