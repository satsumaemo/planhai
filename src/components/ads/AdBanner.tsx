"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

interface AdBannerProps {
  slot?: string;
  className?: string;
}

const isEnabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";
const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? "";

export default function AdBanner({ slot, className = "" }: AdBannerProps) {
  const t = useTranslations("ads");
  const adRef = useRef<HTMLDivElement>(null);
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

  // Placeholder when AdSense is disabled
  if (!isEnabled) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50 ${className}`}
        style={{ minHeight: 90 }}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="rounded bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {t("label")}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {t("placeholder")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div ref={adRef} className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
