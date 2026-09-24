"use client";

import { useRef, useState } from "react";

const HOVER_OPEN_DELAY_MS = 350;
const HOVER_CLOSE_DELAY_MS = 180;

export function useHoverPanel<S extends { key: string }>() {
  const [active, setActive] = useState<S | null>(null);
  const activeKeyRef = useRef<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  function clearTimers() {
    clearTimeout(hoverTimer.current);
    clearTimeout(closeTimer.current);
  }

  function hoverOpen(selection: S) {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      clearTimeout(closeTimer.current);
      setActive(selection);
      activeKeyRef.current = selection.key;
    }, HOVER_OPEN_DELAY_MS);
  }

  function keepAlive() {
    clearTimeout(closeTimer.current);
  }

  function hoverClose() {
    clearTimeout(hoverTimer.current);
    closeTimer.current = setTimeout(() => {
      setActive(null);
      activeKeyRef.current = null;
    }, HOVER_CLOSE_DELAY_MS);
  }

  function close() {
    clearTimers();
    setActive(null);
    activeKeyRef.current = null;
  }

  /** Touch devices: tap opens the panel pinned; tapping the same card closes it. */
  function toggleTouch(selection: S) {
    if (activeKeyRef.current === selection.key) {
      close();
    } else {
      clearTimers();
      setActive(selection);
      activeKeyRef.current = selection.key;
    }
  }

  return {
    active,
    hoverOpen,
    hoverClose,
    keepAlive,
    toggleTouch,
    close,
  };
}

/**
 * True on devices without hover (phones/tablets in touch mode).
 * Safe to call in event handlers; do not use for render output (SSR safe).
 */
export function isTouchOnly(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(hover: none)").matches
  );
}
