"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

interface Props {
  creationId: string;
}

export default function BookmarkButton({ creationId }: Props) {
  const t = useTranslations("community");
  const supabase = createClient();

  const [bookmarked, setBookmarked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("creation_id", creationId)
        .maybeSingle();
      setBookmarked(!!data);
    }
    init();
  }, [creationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = async () => {
    if (!userId) return;

    const was = bookmarked;
    setBookmarked(!was);

    if (was) {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", userId)
        .eq("creation_id", creationId);
      if (error) setBookmarked(true);
    } else {
      const { error } = await supabase
        .from("bookmarks")
        .insert({ user_id: userId, creation_id: creationId });
      if (error) setBookmarked(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={!userId}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
        bookmarked
          ? "text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-950/30"
          : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      } disabled:cursor-default disabled:opacity-50`}
      title={bookmarked ? t("bookmarked") : t("bookmark")}
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill={bookmarked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
        />
      </svg>
    </button>
  );
}
