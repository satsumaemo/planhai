"use client";

import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/constants/categories";
import AdNative from "@/components/ads/AdNative";

type Tab = "trending" | "latest" | "following";

const PAGE_SIZE = 20;

interface Creation {
  id: string;
  title: string;
  description: string | null;
  category: string;
  sub_category: string | null;
  thumbnail_url: string | null;
  file_url: string | null;
  view_count: number;
  like_count: number;
  created_at: string;
  profiles: {
    id: string;
    nickname: string | null;
    avatar_url: string | null;
  } | null;
}

export default function HomeFeed({ userId }: { userId: string | null }) {
  const t = useTranslations("home");
  const tu = useTranslations("upload");
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("trending");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [items, setItems] = useState<Creation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const loaderRef = useRef<HTMLDivElement>(null);

  // ─── Fetch data ───
  const fetchCreations = useCallback(
    async (pageNum: number, reset = false) => {
      setLoading(true);
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Use explicit FK hint: creations.user_id → profiles.id
      // If no FK exists yet, fall back to just creations columns
      let query = supabase
        .from("creations")
        .select("*, profiles:user_id(id, nickname, avatar_url)")
        .eq("visibility", "public");

      // Category filter
      if (categoryFilter) {
        query = query.eq("category", categoryFilter);
      }

      // Tab ordering
      if (tab === "trending") {
        query = query.order("view_count", { ascending: false });
      } else if (tab === "latest") {
        query = query.order("created_at", { ascending: false });
      } else if (tab === "following" && userId) {
        // Get followed user IDs first
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", userId);

        const followedIds = follows?.map((f) => f.following_id) ?? [];
        if (followedIds.length === 0) {
          setItems(reset ? [] : (prev) => prev);
          setHasMore(false);
          setLoading(false);
          if (reset) setItems([]);
          return;
        }
        query = query
          .in("user_id", followedIds)
          .order("created_at", { ascending: false });
      }

      const { data, error } = await query.range(from, to);

      if (error) {
        console.error("Fetch error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        // If the join fails (no FK), retry without profiles join
        if (error.code === "PGRST200" || error.message?.includes("relationship")) {
          const fallback = supabase
            .from("creations")
            .select("*")
            .eq("visibility", "public");

          if (categoryFilter) fallback.eq("category", categoryFilter);
          if (tab === "trending") fallback.order("view_count", { ascending: false });
          else fallback.order("created_at", { ascending: false });

          const { data: fbData } = await fallback.range(from, to);
          const fbRows = (fbData ?? []).map((r: any) => ({ ...r, profiles: null })) as Creation[];
          if (reset) setItems(fbRows);
          else setItems((prev) => [...prev, ...fbRows]);
          setHasMore(fbRows.length === PAGE_SIZE);
          setLoading(false);
          return;
        }
        setLoading(false);
        return;
      }

      const rows = (data as Creation[]) ?? [];
      if (reset) {
        setItems(rows);
      } else {
        setItems((prev) => [...prev, ...rows]);
      }
      setHasMore(rows.length === PAGE_SIZE);
      setLoading(false);
    },
    [supabase, tab, categoryFilter, userId]
  );

  // Reset on tab/category change
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchCreations(0, true);
  }, [tab, categoryFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load more on page change (skip initial)
  useEffect(() => {
    if (page > 0) {
      fetchCreations(page);
    }
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Intersection Observer ───
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  // ─── Category tabs ───
  const categoryTabs = [
    { key: null, label: t("allCategories") },
    ...CATEGORIES.map((c) => ({
      key: c.key,
      label: tu(`categories.${c.key}`),
    })),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* ─── Tabs ─── */}
      <div className="mb-6 flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {(["trending", "latest", "following"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition ${
              tab === key
                ? "text-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {t(key)}
            {tab === key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white" />
            )}
          </button>
        ))}
      </div>

      {/* ─── Following login required ─── */}
      {tab === "following" && !userId && (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {t("loginRequired")}
          </p>
          <Link
            href="/login"
            className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {t("loginRequired")}
          </Link>
        </div>
      )}

      {/* ─── Category filter ─── */}
      {!(tab === "following" && !userId) && (
        <>
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categoryTabs.map((cat) => (
              <button
                key={cat.key ?? "all"}
                onClick={() => setCategoryFilter(cat.key)}
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

          {/* ─── Card Grid ─── */}
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
              {items.map((item, idx) => (
                <Fragment key={item.id}>
                  {idx > 0 && idx % 6 === 0 && <AdNative />}
                  <CreationCard item={item} />
                </Fragment>
              ))}

              {/* Skeleton loading */}
              {loading &&
                Array.from({ length: page === 0 ? 8 : 4 }).map((_, i) => (
                  <SkeletonCard key={`skel-${i}`} />
                ))}
            </div>
          )}

          {/* Infinite scroll trigger */}
          <div ref={loaderRef} className="h-4" />

          {loading && items.length > 0 && (
            <p className="py-4 text-center text-sm text-gray-400">
              {t("loadingMore")}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Creation Card ───
function CreationCard({ item }: { item: Creation }) {
  const tu = useTranslations("upload");
  const profile = item.profiles;

  return (
    <Link
      href={`/creation/${item.id}`}
      className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
    >
      {/* Thumbnail */}
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

      {/* Body */}
      <div className="p-3.5">
        {/* Category badge */}
        <span className="mb-2 inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {tu(`categories.${item.category}`)}
        </span>

        {/* Title */}
        <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">
          {item.title}
        </h3>

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          {/* Author */}
          <div className="flex items-center gap-2">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[9px] font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                {(profile?.nickname?.[0] ?? "?").toUpperCase()}
              </div>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {profile?.nickname ?? "Anonymous"}
            </span>
          </div>

          {/* Likes */}
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
  );
}

// ─── Skeleton Card ───
function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
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
  );
}
