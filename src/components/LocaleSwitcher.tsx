"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";

export default function LocaleSwitcher() {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const toggleLocale = () => {
    const next = locale === "ko" ? "en" : "ko";
    startTransition(async () => {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      window.location.reload();
    });
  };

  return (
    <button
      onClick={toggleLocale}
      disabled={isPending}
      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
    >
      {isPending ? "..." : locale === "ko" ? "KO" : "EN"}
    </button>
  );
}
