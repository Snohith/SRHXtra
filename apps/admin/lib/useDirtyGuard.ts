"use client";

import { useEffect } from "react";

/**
 * Warn before leaving the page with unsaved changes.
 *
 * Covers both browser-level exits (tab close / reload via `beforeunload`)
 * and in-app navigation (capture-phase click listener on internal links —
 * the App Router has no navigation-blocker API yet). Declining the confirm
 * cancels the navigation.
 */
export function useDirtyGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Legacy browsers need returnValue set for the prompt to show.
      e.returnValue = "";
    };

    const onClickCapture = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      // Same-page anchors and new-tab links can't lose the draft.
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;
      if (
        window.confirm(
          "You have unsaved changes. Leave this page and discard them?",
        )
      )
        return;
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClickCapture, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, [dirty]);
}
