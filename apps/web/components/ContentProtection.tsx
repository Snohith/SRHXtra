"use client";

import { useEffect } from "react";

/**
 * Copy-protection deterrents — JS layer (see `globals.css` for the CSS
 * layer and the API's /uploads hotlink guard for media).
 *
 * Blocks the native routes to page content: context menu, copy/cut,
 * selection, dragging, and the common save/print/view-source shortcuts.
 * Form fields (search boxes, selects) keep every native affordance.
 *
 * This is a speed bump, not DRM: DevTools, view-source, curl, and
 * screenshots bypass it by design. It stops the casual "select → copy"
 * / "save image as" path and nothing else, so it never trades away the
 * site's own interactions.
 */

/** Elements where the browser's native editing affordances must survive. */
const EDITING_SELECTOR =
  "input, textarea, select, [contenteditable]:not([contenteditable='false'])";

/** Ctrl/Cmd + key blocked outside editing contexts. */
const BLOCKED_CTRL_KEYS = new Set(["c", "x", "a", "u", "s", "p"]);

/** Ctrl/Cmd + Shift + key (upstream DevTools/console inspection). */
const BLOCKED_DEVTOOLS_KEYS = new Set(["i", "j", "c", "k"]);

const TOAST_TEXT = "Copying is disabled on this site.";
const TOAST_MS = 1600;

let toastTimer: number | undefined;

function isEditingTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(EDITING_SELECTOR) !== null;
}

/** Transient feedback so a blocked copy does not feel like a broken key. */
function showCopyToast(): void {
  document.querySelector(".copy-toast")?.remove();
  const el = document.createElement("div");
  el.className = "copy-toast";
  el.setAttribute("role", "status");
  el.textContent = TOAST_TEXT;
  document.body.appendChild(el);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.remove(), TOAST_MS);
}

export default function ContentProtection() {
  useEffect(() => {
    const blockProtected = (event: Event) => {
      if (!isEditingTarget(event.target)) event.preventDefault();
    };

    const blockCopyWithNotice = (event: Event) => {
      if (isEditingTarget(event.target)) return;
      event.preventDefault();
      showCopyToast();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "F12") {
        event.preventDefault();
        return;
      }
      // `altKey` bails out so AltGr-produced combinations (Windows layout
      // editors, accent input) keep working.
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;

      const key = event.key.toLowerCase();
      const editing = isEditingTarget(event.target);
      if (
        editing &&
        !event.shiftKey &&
        (key === "c" || key === "x" || key === "a")
      ) {
        return; // native clipboard behavior inside form fields
      }
      if (event.shiftKey) {
        if (BLOCKED_DEVTOOLS_KEYS.has(key)) event.preventDefault();
        return;
      }
      if (BLOCKED_CTRL_KEYS.has(key)) {
        event.preventDefault();
        if (key === "c" || key === "x") showCopyToast();
      }
    };

    // Capture phase: page handlers never get to see the blocked events.
    const options = { capture: true } as const;
    document.addEventListener("contextmenu", blockProtected, options);
    document.addEventListener("selectstart", blockProtected, options);
    document.addEventListener("dragstart", blockProtected, options);
    document.addEventListener("copy", blockCopyWithNotice, options);
    document.addEventListener("cut", blockCopyWithNotice, options);
    document.addEventListener("keydown", onKeyDown, options);
    return () => {
      document.removeEventListener("contextmenu", blockProtected, options);
      document.removeEventListener("selectstart", blockProtected, options);
      document.removeEventListener("dragstart", blockProtected, options);
      document.removeEventListener("copy", blockCopyWithNotice, options);
      document.removeEventListener("cut", blockCopyWithNotice, options);
      document.removeEventListener("keydown", onKeyDown, options);
      window.clearTimeout(toastTimer);
    };
  }, []);

  return null;
}
