"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/constants/categories";
import CategoryIcon from "@/components/upload/CategoryIcon";

const PAGE_SIZE = 20;

interface Creation {
  id: string;
  title: string;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  like_count: number;
  view_count: number;
  created_at: string;
  profiles: {
    id: string;
    nickname: string | null;
    avatar_url: string | null;
  } | null;
}

export default function ExplorePage() {
  const t = useTranslations("explore");
  const tu = useTranslations("upload");
  const router = useRouter();
  const supabase = createClient();

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [toolFilter, setToolFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<Creation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Collect all tools from categories (or from selected category)
  const availableTools = categoryFilter
    ? CATEGORIES.find((c) => c.key === categoryFilter)?.tools ?? []
    : [...new Set(CATEGORIES.flatMap((c) => c.tools))];

  const fetchData = useCallback(
    async (pageNum: number, reset = false) => {
      setLoading(true);
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("creations")
        .select("*, profiles:user_id(id, nickname, avatar_url)")
        .eq("visibility", "public")
        .order("created_at", { ascending: false });

      if (categoryFilter) {
        query = query.eq("category", categoryFilter);
      }

      if (toolFilter) {
        query = query.contains("tools", [toolFilter]);
      }

      if (searchQuery.trim()) {
        const pattern = `%${searchQuery.trim()}%`;
        query = query.or(
          `title.ilike.${pattern},description.ilike.${pattern}`
        );
      }

      const { data, error } = await query.range(from, to);

      if (error) {
        console.error("Explore fetch error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as Creation[];
      if (reset) {
        setItems(rows);
      } else {
        setItems((prev) => [...prev, ...rows]);
      }
      setHasMore(rows.length === PAGE_SIZE);
      setLoading(false);
    },
    [supabase, categoryFilter, toolFilter, searchQuery]
  );

  // Reset on filter/search change
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchData(0, true);
  }, [categoryFilter, toolFilter, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load more
  useEffect(() => {
    if (page > 0) fetchData(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Intersection observer
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((p) => p + 1);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  // Debounced search
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleSearchChange = (val: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearchQuery(val), 400);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
        {t("title")}
      </h1>

      {/* Search bar */}
      <div className="relative mb-6">
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
          type="text"
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-gray-400 dark:focus:ring-gray-400"
        />
      </div>

      {/* Category grid */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {/* All */}
        <button
          onClick={() => setCategoryFilter(null)}
          className={`flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition ${
            categoryFilter === null
              ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
              : "border-gray-200 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-500"
          }`}
        >
          {t("allCategories")}
        </button>
        {CATEGORIES.map((cat) => {
          const active = categoryFilter === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() =>
                setCategoryFilter(active ? null : cat.key)
              }
              className={`flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition ${
                active
                  ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-500"
              }`}
            >
              <CategoryIcon
                icon={cat.icon}
                className={`h-4 w-4 shrink-0 ${active ? "text-white dark:text-gray-900" : "text-gray-400"}`}
              />
              <span className="truncate">
                {tu(`categories.${cat.key}`)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tool / AI Model filter */}
      {availableTools.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-3 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            {t("toolFilter")}
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setToolFilter(null)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                toolFilter === null
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {t("allTools")}
            </button>
            {availableTools.map((tool) => (
              <button
                key={tool}
                onClick={() => setToolFilter(toolFilter === tool ? null : tool)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  toolFilter === tool
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                {tool}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results grid */}
      {items.length === 0 && !loading ? (
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
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
            />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("noResults")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/c/${item.id}`}
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
                    <svg
                      className="h-10 w-10 text-gray-300 dark:text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                      />
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
                      <img
                        src={item.profiles.avatar_url}
                        alt=""
                        className="h-5 w-5 rounded-full object-cover"
                      />
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
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                      />
                    </svg>
                    {item.like_count ?? 0}
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {/* Skeleton */}
          {loading &&
            Array.from({ length: page === 0 ? 8 : 4 }).map((_, i) => (
              <div
                key={`skel-${i}`}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="aspect-video w-full animate-pulse bg-gray-200 dark:bg-gray-800" />
                <div className="space-y-2.5 p-3.5">
                  <div className="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
                      <div className="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                    </div>
                    <div className="h-3 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Infinite scroll trigger */}
      <div ref={loaderRef} className="h-4" />
    </div>
  );
}
