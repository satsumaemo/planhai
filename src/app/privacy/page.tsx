"use client";

import { useTranslations } from "next-intl";

export default function PrivacyPage() {
  const t = useTranslations("privacy");

  const sections = [
    "intro",
    "collection",
    "usage",
    "thirdParty",
    "cookies",
    "security",
    "retention",
    "rights",
    "children",
    "changes",
    "contact",
  ] as const;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
        {t("title")}
      </h1>
      <p className="mb-10 text-sm text-gray-500 dark:text-gray-400">
        {t("lastUpdated")}
      </p>

      <div className="space-y-8">
        {sections.map((key) => (
          <section key={key}>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              {t(`${key}.title`)}
            </h2>
            <div className="whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {t(`${key}.body`)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
