"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AdBanner from "@/components/ads/AdBanner";
import LikeButton from "@/components/community/LikeButton";
import BookmarkButton from "@/components/community/BookmarkButton";
import CommentSection from "@/components/community/CommentSection";
import ForkButton from "@/components/community/ForkButton";

interface Creation {
  id: string;
  title: string;
  description: string | null;
  category: string;
  sub_category: string | null;
  file_url: string | null;
  thumbnail_url: string | null;
  demo_url: string | null;
  license: string | null;
  tools: string[] | null;
  ai_model: string | null;
  view_count: number;
  like_count: number;
  created_at: string;
  profiles: {
    id: string;
    nickname: string | null;
    avatar_url: string | null;
  } | null;
}

export default function CreationDetailPage() {
  const { id } = useParams();
  const t = useTranslations("upload");
  const supabase = createClient();

  const [creation, setCreation] = useState<Creation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("creations")
        .select("*, profiles:user_id(id, nickname, avatar_url)")
        .eq("id", id)
        .single();

      setCreation(data as Creation | null);
      setLoading(false);

      // Increment view count
      if (data) {
        await supabase.rpc("increment_view_count", { creation_id: id });
      }
    }
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="flex-1 space-y-4">
            <div className="aspect-video w-full animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
            <div className="h-8 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="w-full lg:w-72">
            <div className="h-64 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  if (!creation) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <p className="text-gray-500 dark:text-gray-400">Not found</p>
      </div>
    );
  }

  const profile = creation.profiles;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* ─── Main content ─── */}
        <div className="flex-1">
          {/* Thumbnail / Media */}
          {creation.thumbnail_url && (
            <div className="mb-6 overflow-hidden rounded-xl">
              <img
                src={creation.thumbnail_url}
                alt={creation.title}
                className="w-full object-cover"
              />
            </div>
          )}

          {/* Title */}
          <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
            {creation.title}
          </h1>

          {/* Author + meta */}
          <div className="mb-6 flex items-center gap-3">
            <Link
              href={`/profile/${profile?.nickname ?? ""}`}
              className="flex items-center gap-2"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  {(profile?.nickname?.[0] ?? "?").toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {profile?.nickname ?? "Anonymous"}
              </span>
            </Link>
            <span className="text-xs text-gray-400">
              {new Date(creation.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Category badges */}
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {t(`categories.${creation.category}`)}
            </span>
            {creation.sub_category && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {t(`subCategories.${creation.sub_category}`)}
              </span>
            )}
          </div>

          {/* Description */}
          {creation.description && (
            <p className="mb-6 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {creation.description}
            </p>
          )}

          {/* Demo URL */}
          {creation.demo_url && (
            <a
              href={creation.demo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-6 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              Demo
            </a>
          )}

          {/* Tools */}
          {creation.tools && creation.tools.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                {t("toolsTitle")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {creation.tools.map((tool) => (
                  <span
                    key={tool}
                    className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 dark:border-gray-600 dark:text-gray-400"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Fork info (origin badge + remix counter + fork list) */}
          <ForkButton
            creationId={creation.id}
            authorId={profile?.id ?? ""}
          />

          {/* Action buttons */}
          <div className="mb-6 flex items-center gap-2 border-y border-gray-200 py-2 dark:border-gray-800">
            <LikeButton
              creationId={creation.id}
              authorId={profile?.id ?? ""}
              initialCount={creation.like_count ?? 0}
            />
            <BookmarkButton creationId={creation.id} />
            <span className="ml-auto flex items-center gap-1 text-sm text-gray-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {creation.view_count ?? 0}
              {creation.license && (
                <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                  {creation.license}
                </span>
              )}
            </span>
          </div>

          {/* Comments */}
          <div className="mb-8">
            <CommentSection
              creationId={creation.id}
              authorId={profile?.id ?? ""}
            />
          </div>

          {/* ─── Bottom Ad ─── */}
          <AdBanner className="w-full" />
        </div>

        {/* ─── Sidebar ─── */}
        <div className="w-full shrink-0 lg:w-72">
          <div className="sticky top-20 space-y-6">
            {/* Sidebar Ad */}
            <AdBanner className="w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
