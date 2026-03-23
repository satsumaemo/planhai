"use client";

import Script from "next/script";

const isEnabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";
const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? "";

export default function AdScript() {
  if (!isEnabled) return null;

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
