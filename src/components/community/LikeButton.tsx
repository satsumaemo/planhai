"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

interface Props {
  creationId: string;
  authorId: string;
  initialCount: number;
}

export default function LikeButton({ creationId, authorId, initialCount }: Props) {
  const t = useTranslations("community");
  const supabase = createClient();

  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("creation_id", creationId)
        .maybeSingle();
      setLiked(!!data);
    }
    init();
  }, [creationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = async () => {
    if (!userId) return;

    // Optimistic
    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount((c) => c + (wasLiked ? -1 : 1));

    if (wasLiked) {
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("user_id", userId)
        .eq("creation_id", creationId);
      if (error) {
        setLiked(true);
        setCount((c) => c + 1);
      }
    } else {
      const { error } = await supabase
        .from("likes")
        .insert({ user_id: userId, creation_id: creationId });
      if (error) {
        setLiked(false);
        setCount((c) => c - 1);
        return;
      }
      // Notification
      if (authorId !== userId) {
        await supabase.from("notifications").insert({
          user_id: authorId,
          actor_id: userId,
          type: "like",
          creation_id: creationId,
        });
      }
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={!userId}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
        liked
          ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
          : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      } disabled:cursor-default disabled:opacity-50`}
      title={liked ? t("liked") : t("like")}
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
      {count}
    </button>
  );
}
