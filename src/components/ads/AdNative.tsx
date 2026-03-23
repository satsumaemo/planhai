"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

interface AdNativeProps {
  slot?: string;
}

const isEnabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";
const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? "";

export default function AdNative({ slot }: AdNativeProps) {
  const t = useTranslations("ads");
  const pushed = useRef(false);

  useEffect(() => {
    if (!isEnabled || pushed.current) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push(
        {}
      );
      pushed.current = true;
    } catch {
      // AdSense not loaded
    }
  }, []);

  // Placeholder card matching the feed card style
  if (!isEnabled) {
    return (
      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
        {/* Ad label */}
        <span className="absolute right-2 top-2 z-10 rounded bg-gray-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {t("label")}
        </span>

        {/* Placeholder body */}
        <div className="flex aspect-video w-full items-center justify-center bg-gray-100 dark:bg-gray-800/50">
          <div className="flex flex-col items-center gap-1.5">
            <svg
              className="h-8 w-8 text-gray-300 dark:text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
              />
            </svg>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {t("placeholder")}
            </span>
          </div>
        </div>

        <div className="p-3.5">
          <div className="mb-2 h-3 w-16 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="mb-1 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <span className="absolute right-2 top-2 z-10 rounded bg-gray-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:bg-gray-700 dark:text-gray-400">
        {t("label")}
      </span>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format="fluid"
        data-ad-layout-key="-6t+ed+2i-1n-4w"
      />
    </div>
  );
}
