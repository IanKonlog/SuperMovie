"use client";

import { useRef, useState } from "react";

const HOVER_OPEN_DELAY_MS = 350;
const HOVER_CLOSE_DELAY_MS = 180;

export function useHoverPanel<S extends { key: string }>() {
  const [active, setActive] = useState<S | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  function hoverOpen(selection: S) {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      clearTimeout(closeTimer.current);
      setActive(selection);
    }, HOVER_OPEN_DELAY_MS);
  }

  function keepAlive() {
    clearTimeout(closeTimer.current);
  }

  function hoverClose() {
    clearTimeout(hoverTimer.current);
    closeTimer.current = setTimeout(() => {
      setActive(null);
    }, HOVER_CLOSE_DELAY_MS);
  }

  function close() {
    clearTimeout(hoverTimer.current);
    clearTimeout(closeTimer.current);
    setActive(null);
  }

  return { active, hoverOpen, hoverClose, keepAlive, close };
}
