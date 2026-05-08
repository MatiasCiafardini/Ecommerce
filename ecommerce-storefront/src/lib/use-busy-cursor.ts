"use client";

import { useEffect } from "react";

let busyCursorLocks = 0;

export function useBusyCursor(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === "undefined") {
      return;
    }

    busyCursorLocks += 1;
    document.documentElement.classList.add("app-busy-cursor");

    return () => {
      busyCursorLocks = Math.max(0, busyCursorLocks - 1);

      if (busyCursorLocks === 0) {
        document.documentElement.classList.remove("app-busy-cursor");
      }
    };
  }, [active]);
}
