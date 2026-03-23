"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/constants/categories";

interface Creation {
  id: string;
  title: string;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  like_count: number;
  profiles: {
    nickname: string | null;
    avatar_url: string | null;
  } | null;
}

export default function SearchPage() {
  const t = useTranslations("search");
  const tu = useTranslations("upload");
  const th = useTranslations("home");
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [results, setResults] = useState<Creation[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Search on initial query
  useEffect(() => {
    if (initialQ) {
      doSearch(initialQ, null);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doSearch = async (q: string, cat: string | null) => {
    if (!q.trim()) return;
    setSearching(true);
    setSearched(true);

    let qb = supabase
      .from("creations")
      .select("*, profiles:user_id(id, nickname, avatar_url)")
      .eq("visibility", "public");

    // Text search — use ilike for broader matching
    const pattern = `%${q.trim()}%`;
    qb = qb.or(`title.ilike.${pattern},description.ilike.${pattern}`);

    if (cat) {
      qb = qb.eq("category", cat);
    }

    const { data } = await qb
      .order("view_count", { ascending: false })
      .limit(60);

    setResults((data as Creation[]) ?? []);
    setSearching(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.replace(`/search?q=${encodeURIComponent(query)}`);
    doSearch(query, categoryFilter);
  };

  const handleCategoryChange = (cat: string | null) => {
    setCategoryFilter(cat);
    if (query.trim()) {
      doSearch(query, cat);
    }
  };

  const categoryTabs = [
    { key: null, label: th("allCategories") },
    ...CATEGORIES.map((c) => ({
      key: c.key,
      label: tu(`categories.${c.key}`),
    })),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* ─── Search bar ─── */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            className="w-full rounded-xl border border-gray-300 bg-white py-3.5 pl-12 pr-4 text-base outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-gray-400 dark:focus:ring-gray-400"
          />
        </div>
      </form>

      {/* ─── Category filter ─── */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categoryTabs.map((cat) => (
          <button
            key={cat.key ?? "all"}
            onClick={() => handleCategoryChange(cat.key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              categoryFilter === cat.key
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ─── Results ─── */}
      {searching && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-white" />
        </div>
      )}

      {!searching && searched && (
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {t("resultCount", { count: results.length })}
        </p>
      )}

      {!searching && searched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <svg
            className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("noResults")}
          </p>
        </div>
      )}

      {!searching && results.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((item) => (
            <Link
              key={item.id}
              href={`/creation/${item.id}`}
              className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <svg className="h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-3.5">
                <span className="mb-2 inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {tu(`categories.${item.category}`)}
                </span>
                <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">
                  {item.title}
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.profiles?.avatar_url ? (
                      <img src={item.profiles.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[9px] font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                        {(item.profiles?.nickname?.[0] ?? "?").toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {item.profiles?.nickname ?? "Anonymous"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                    {item.like_count ?? 0}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
