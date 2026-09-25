"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "@/lib/icons";

type ThemeChoice = "light" | "dark";

function subscribe(callback: () => void) {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  query.addEventListener("change", callback);
  return () => {
    observer.disconnect();
    query.removeEventListener("change", callback);
  };
}

function getThemeSnapshot(): ThemeChoice {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, () => "dark");

  function toggle() {
    const next: ThemeChoice = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private mode: theme applies for this visit only.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-foreground"
    >
      {theme === "dark" ? (
        <SunIcon className="h-5 w-5" />
      ) : (
        <MoonIcon className="h-5 w-5" />
      )}
    </button>
  );
}
