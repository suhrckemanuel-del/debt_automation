"use client";

import { useEffect } from "react";

/**
 * Moves keyboard focus to the passage addressed by the URL fragment so
 * evidence deep links remain usable without a pointer. The browser still
 * owns :target highlighting and initial scroll.
 */
export function PassageFocus() {
  useEffect(() => {
    const focusTarget = () => {
      const raw = window.location.hash.slice(1);
      if (!raw) {
        return;
      }
      let id = raw;
      try {
        id = decodeURIComponent(raw);
      } catch {
        // A malformed fragment is ignored rather than thrown to the user.
      }
      const element = document.getElementById(id);
      if (element instanceof HTMLElement) {
        element.focus({ preventScroll: true });
        element.scrollIntoView({ block: "start" });
      }
    };
    focusTarget();
    window.addEventListener("hashchange", focusTarget);
    return () => window.removeEventListener("hashchange", focusTarget);
  }, []);
  return null;
}
