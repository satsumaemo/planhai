import { useTranslations } from "next-intl";
import Link from "next/link";

export default function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <span className="text-lg font-bold text-gray-900 dark:text-white">Planhai</span>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t("copyright", { year })}
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Planhai</h3>
            <ul className="mt-3 space-y-2">
              {(["about", "terms", "privacy", "contact"] as const).map((key) => (
                <li key={key}>
                  <Link href={`/${key}`} className="text-sm text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("categories")}</h3>
            <ul className="mt-3 space-y-2">
              {(["development", "design", "marketing", "business"] as const).map((key) => (
                <li key={key}>
                  <Link href={`/explore?category=${key}`} className="text-sm text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
