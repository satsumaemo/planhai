"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Creation {
  id: string;
  title: string;
  thumbnail_url: string | null;
  category: string;
  view_count: number;
  like_count: number;
  created_at: string;
}

interface Stats {
  totalCreations: number;
  totalViews: number;
  totalLikes: number;
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tu = useTranslations("upload");
  const router = useRouter();
  const supabase = createClient();

  const [creations, setCreations] = useState<Creation[]>([]);
  const [stats, setStats] = useState<Stats>({ totalCreations: 0, totalViews: 0, totalLikes: 0 });
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"created_at" | "view_count" | "like_count">("created_at");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("creations")
        .select("id, title, thumbnail_url, category, view_count, like_count, created_at")
        .eq("user_id", user.id)
        .order(sortBy, { ascending: false });

      const rows = (data ?? []) as Creation[];
      setCreations(rows);
      setStats({
        totalCreations: rows.length,
        totalViews: rows.reduce((sum, c) => sum + (c.view_count ?? 0), 0),
        totalLikes: rows.reduce((sum, c) => sum + (c.like_count ?? 0), 0),
      });
      setLoading(false);
    }
    load();
  }, [sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: t("totalCreations"), value: stats.totalCreations, icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
    { label: t("totalViews"), value: stats.totalViews, icon: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z" },
    { label: t("totalLikes"), value: stats.totalLikes, icon: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-white">
        {t("title")}
      </h1>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
              <svg className="h-6 w-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {card.value.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sort & Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("myCreations")}
        </h2>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300"
        >
          <option value="created_at">{t("sortDate")}</option>
          <option value="view_count">{t("sortViews")}</option>
          <option value="like_count">{t("sortLikes")}</option>
        </select>
      </div>

      {/* Creations List */}
      {creations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 dark:border-gray-700">
          <svg className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{t("noCreations")}</p>
          <Link
            href="/new"
            className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {t("createFirst")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {creations.map((c) => (
            <Link
              key={c.id}
              href={`/c/${c.id}`}
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              {/* Thumbnail */}
              <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                {c.thumbnail_url ? (
                  <img src={c.thumbnail_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <svg className="h-5 w-5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {c.title}
                </h3>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium dark:bg-gray-800">
                    {tu(`categories.${c.category}`)}
                  </span>
                  <span>{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex shrink-0 items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {c.view_count ?? 0}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                  {c.like_count ?? 0}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
