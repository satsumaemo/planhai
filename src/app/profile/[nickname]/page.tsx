"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AdBanner from "@/components/ads/AdBanner";

interface Profile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
}

interface Creation {
  id: string;
  title: string;
  thumbnail_url: string | null;
  category: string;
  like_count: number;
  created_at: string;
}

type Tab = "creations" | "liked" | "bookmarks";

export default function ProfilePage() {
  const params = useParams();
  const nickname = params.nickname as string;
  const t = useTranslations("profile");
  const tu = useTranslations("upload");
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [tab, setTab] = useState<Tab>("creations");
  const [items, setItems] = useState<Creation[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // ─── Load profile ───
  useEffect(() => {
    async function load() {
      setLoading(true);

      // Current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      // Profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("nickname", nickname)
        .single();

      if (!prof) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(prof);
      setIsOwner(user?.id === prof.id);

      // Counts
      const [{ count: followers }, { count: followings }] = await Promise.all([
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", prof.id),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", prof.id),
      ]);
      setFollowerCount(followers ?? 0);
      setFollowingCount(followings ?? 0);

      // Check follow status
      if (user && user.id !== prof.id) {
        const { data: follow } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", prof.id)
          .maybeSingle();
        setIsFollowing(!!follow);
      }

      setLoading(false);
    }
    load();
  }, [nickname]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Load tab content ───
  const loadTab = useCallback(async () => {
    if (!profile) return;
    setItems([]);

    if (tab === "creations") {
      const { data } = await supabase
        .from("creations")
        .select("*")
        .eq("user_id", profile.id)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(50);
      setItems((data as Creation[]) ?? []);
    } else if (tab === "liked") {
      const { data: likeRows } = await supabase
        .from("likes")
        .select("creation_id")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(50);
      const likeIds = likeRows?.map((r: any) => r.creation_id) ?? [];
      if (likeIds.length > 0) {
        const { data: creations } = await supabase
          .from("creations")
          .select("*")
          .in("id", likeIds);
        setItems((creations as Creation[]) ?? []);
      }
    } else if (tab === "bookmarks" && isOwner) {
      const { data: bmRows } = await supabase
        .from("bookmarks")
        .select("creation_id")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(50);
      const bmIds = bmRows?.map((r: any) => r.creation_id) ?? [];
      if (bmIds.length > 0) {
        const { data: creations } = await supabase
          .from("creations")
          .select("*")
          .in("id", bmIds);
        setItems((creations as Creation[]) ?? []);
      }
    }
  }, [profile, tab, isOwner, supabase]);

  useEffect(() => {
    loadTab();
  }, [loadTab]);

  // ─── Follow / Unfollow ───
  const handleFollowToggle = async () => {
    if (!currentUserId || !profile) return;
    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", profile.id);
      setIsFollowing(false);
      setFollowerCount((c) => c - 1);
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, following_id: profile.id });
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
    }
  };

  // ─── Not found ───
  if (notFound) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-20">
        <p className="text-gray-500 dark:text-gray-400">{t("userNotFound")}</p>
      </div>
    );
  }

  // ─── Loading ───
  if (loading || !profile) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
          <div className="space-y-3">
            <div className="h-6 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-60 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  const initials = (profile.nickname?.[0] ?? "?").toUpperCase();
  const tabs: { key: Tab; label: string; ownerOnly?: boolean }[] = [
    { key: "creations", label: t("creations") },
    { key: "liked", label: t("liked") },
    { key: "bookmarks", label: t("bookmarks"), ownerOnly: true },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* ─── Profile Header ─── */}
      <div className="mb-8 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* Avatar */}
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="h-24 w-24 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gray-200 text-2xl font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            {initials}
          </div>
        )}

        <div className="flex-1 text-center sm:text-left">
          <div className="mb-2 flex flex-col items-center gap-3 sm:flex-row">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {profile.nickname ?? "Anonymous"}
            </h1>
            {isOwner ? (
              <Link
                href="/settings"
                className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {t("editProfile")}
              </Link>
            ) : currentUserId ? (
              <button
                onClick={handleFollowToggle}
                className={`rounded-lg px-5 py-1.5 text-sm font-medium transition ${
                  isFollowing
                    ? "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                    : "bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                }`}
              >
                {isFollowing ? t("unfollow") : t("follow")}
              </button>
            ) : null}
          </div>

          {/* Stats */}
          <div className="mb-3 flex justify-center gap-6 sm:justify-start">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <strong className="font-semibold text-gray-900 dark:text-white">
                {followerCount}
              </strong>{" "}
              {t("followers")}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <strong className="font-semibold text-gray-900 dark:text-white">
                {followingCount}
              </strong>{" "}
              {t("following")}
            </span>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
              {profile.bio}
            </p>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.342" />
              </svg>
              {profile.website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="mb-6 flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {tabs
          .filter((t) => !t.ownerOnly || isOwner)
          .map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`relative px-4 py-2.5 text-sm font-medium transition ${
                tab === item.key
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {item.label}
              {tab === item.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white" />
              )}
            </button>
          ))}
      </div>

      {/* ─── Content Grid (Masonry-like) ─── */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tab === "creations"
              ? t("noCreations")
              : tab === "liked"
                ? t("noLiked")
                : t("noBookmarks")}
          </p>
        </div>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/creation/${item.id}`}
              className="group mb-4 block break-inside-avoid overflow-hidden rounded-xl border border-gray-200 bg-white transition duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
            >
              {item.thumbnail_url ? (
                <img
                  src={item.thumbnail_url}
                  alt={item.title}
                  className="w-full object-cover transition duration-200 group-hover:scale-105"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <svg className="h-8 w-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                </div>
              )}
              <div className="p-3">
                <span className="mb-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {tu(`categories.${item.category}`)}
                </span>
                <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">
                  {item.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ─── Bottom Ad ─── */}
      <div className="mt-8">
        <AdBanner className="w-full" />
      </div>
    </div>
  );
}
