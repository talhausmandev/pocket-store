"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_DURATION_MS = 1800;

type TopLoadingBarProps = {
  durationMs?: number;
};

const EVENT_START = "pocket-store:top-loading-bar:start";
const EVENT_DONE = "pocket-store:top-loading-bar:done";

export function startTopLoadingBar() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT_START));
}

export function doneTopLoadingBar() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT_DONE));
}

export function TopLoadingBar({ durationMs = DEFAULT_DURATION_MS }: TopLoadingBarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const locationKey = useMemo(() => {
    const query = searchParams?.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const fadeTimeoutRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    const clear = () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (fadeTimeoutRef.current !== null) {
        window.clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
      if (hideTimeoutRef.current !== null) {
        window.clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };

    const start = () => {
      clear();
      setVisible(true);
      setFading(false);
      setProgress(15);

      intervalRef.current = window.setInterval(() => {
        setProgress((p) => (p >= 90 ? 90 : p + 5));
      }, 180);
    };

    const done = () => {
      clear();

      setProgress(100);
      fadeTimeoutRef.current = window.setTimeout(() => setFading(true), 80);
      hideTimeoutRef.current = window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
        setFading(false);
      }, 260);
    };

    window.addEventListener(EVENT_START, start);
    window.addEventListener(EVENT_DONE, done);
    return () => {
      window.removeEventListener(EVENT_START, start);
      window.removeEventListener(EVENT_DONE, done);
      clear();
    };
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    doneTopLoadingBar();
  }, [locationKey]);

  useEffect(() => {
    const onClickCapture = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (href.startsWith("mailto:") || href.startsWith("tel:")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      startTopLoadingBar();
    };

    window.addEventListener("click", onClickCapture, true);
    return () => window.removeEventListener("click", onClickCapture, true);
  }, []);

  if (!visible) return null;

  const widthTransitionMs = Math.min(180, durationMs);

  return (
    <div className="pointer-events-none fixed left-0 top-0 z-[9999] h-[3px] w-full">
      <div
        className="h-full bg-primary"
        style={{
          width: `${progress}%`,
          opacity: fading ? 0 : 1,
          transitionProperty: "width, opacity",
          transitionDuration: `${widthTransitionMs}ms, 220ms`,
          transitionTimingFunction: "cubic-bezier(0.2, 0.0, 0.2, 1), linear",
        }}
      />
    </div>
  );
}
