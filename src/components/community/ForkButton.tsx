"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface ForkInfo {
  id: string;
  title: string;
  profiles: { nickname: string | null } | null;
}

interface Props {
  creationId: string;
  authorId: string;
}

export default function ForkButton({ creationId, authorId }: Props) {
  const t = useTranslations("community");
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [forking, setForking] = useState(false);

  // Fork tree state
  const [originalInfo, setOriginalInfo] = useState<ForkInfo | null>(null);
  const [forkCount, setForkCount] = useState(0);
  const [showForkList, setShowForkList] = useState(false);
  const [forkList, setForkList] = useState<ForkInfo[]>([]);
  const [forkListLoading, setForkListLoading] = useState(false);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      // Check if this creation is a fork (has an original)
      const { data: forkRow } = await supabase
        .from("forks")
        .select("original_creation_id")
        .eq("forked_creation_id", creationId)
        .maybeSingle();

      if (forkRow?.original_creation_id) {
        const { data: orig } = await supabase
          .from("creations")
          .select("id, title, user_id")
          .eq("id", forkRow.original_creation_id)
          .single();
        if (orig) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("nickname")
            .eq("id", orig.user_id)
            .single();
          setOriginalInfo({
            id: orig.id,
            title: orig.title,
            profiles: prof ? { nickname: prof.nickname } : null,
          });
        }
      }

      // Count how many times this creation has been forked
      const { count } = await supabase
        .from("forks")
        .select("*", { count: "exact", head: true })
        .eq("original_creation_id", creationId);

      setForkCount(count ?? 0);
    }
    init();
  }, [creationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFork = async () => {
    if (!userId || forking) return;
    setForking(true);

    // 1. Get the original creation data
    const { data: original } = await supabase
      .from("creations")
      .select("*")
      .eq("id", creationId)
      .single();

    if (!original) {
      setForking(false);
      return;
    }

    // 2. Create a copy
    const { data: forked, error } = await supabase
      .from("creations")
      .insert({
        title: original.title,
        description: original.description,
        category: original.category,
        sub_category: original.sub_category,
        file_url: original.file_url,
        thumbnail_url: original.thumbnail_url,
        tools: original.tools,
        ai_model: original.ai_model,
        license: original.license,
        visibility: "private", // draft until user publishes
        user_id: userId,
      })
      .select("id")
      .single();

    if (error || !forked) {
      setForking(false);
      return;
    }

    // 3. Record the fork relationship
    await supabase.from("forks").insert({
      original_creation_id: creationId,
      forked_creation_id: forked.id,
    });

    // 4. Copy tags
    const { data: originalTags } = await supabase
      .from("creation_tags")
      .select("tag_id")
      .eq("creation_id", creationId);

    if (originalTags && originalTags.length > 0) {
      await supabase.from("creation_tags").insert(
        originalTags.map((ct: any) => ({
          creation_id: forked.id,
          tag_id: ct.tag_id,
        }))
      );
    }

    // 5. Notify original author
    if (authorId !== userId) {
      await supabase.from("notifications").insert({
        user_id: authorId,
        actor_id: userId,
        type: "fork",
        creation_id: creationId,
      });
    }

    setForking(false);

    // 6. Navigate to edit page with forked creation
    router.push(`/new?fork=${forked.id}`);
  };

  const loadForkList = async () => {
    setForkListLoading(true);

    const { data: forkRows } = await supabase
      .from("forks")
      .select("forked_creation_id")
      .eq("original_creation_id", creationId)
      .limit(20);

    if (!forkRows || forkRows.length === 0) {
      setForkList([]);
      setForkListLoading(false);
      setShowForkList(true);
      return;
    }

    const ids = forkRows.map((r: any) => r.forked_creation_id);
    const { data: creations } = await supabase
      .from("creations")
      .select("id, title, user_id")
      .in("id", ids);

    const userIds = [...new Set((creations ?? []).map((c: any) => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nickname")
      .in("id", userIds);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    setForkList(
      (creations ?? []).map((c: any) => ({
        id: c.id,
        title: c.title,
        profiles: profileMap.get(c.user_id) ?? null,
      }))
    );
    setForkListLoading(false);
    setShowForkList(true);
  };

  return (
    <>
      {/* Fork origin badge */}
      {originalInfo && (
        <div className="mb-4 flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm dark:border-blue-900 dark:bg-blue-950/30">
          <svg
            className="h-4 w-4 shrink-0 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
            />
          </svg>
          <span className="text-blue-700 dark:text-blue-300">
            {t("forkedFrom")}
          </span>
          <Link
            href={`/c/${originalInfo.id}`}
            className="font-medium text-blue-700 hover:underline dark:text-blue-300"
          >
            @{originalInfo.profiles?.nickname ?? "?"}/{originalInfo.title}
          </Link>
        </div>
      )}

      {/* Fork button + remix counter row */}
      <div className="flex items-center gap-2">
        {/* Fork button */}
        <button
          onClick={handleFork}
          disabled={!userId || forking}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 disabled:cursor-default disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
          title={t("fork")}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
            />
          </svg>
          {forking ? t("forking") : t("fork")}
        </button>

        {/* Remix counter */}
        {forkCount > 0 && (
          <button
            onClick={loadForkList}
            className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            {t("remixedTimes", { count: forkCount })}
          </button>
        )}
      </div>

      {/* Fork list modal */}
      {showForkList && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t("forkList")}
            </h3>
            <button
              onClick={() => setShowForkList(false)}
              className="text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              {t("closeForkList")}
            </button>
          </div>

          {forkListLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-white" />
            </div>
          ) : forkList.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              {t("noForks")}
            </p>
          ) : (
            <ul className="space-y-2">
              {forkList.map((fork) => (
                <li key={fork.id}>
                  <Link
                    href={`/c/${fork.id}`}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <svg
                      className="h-4 w-4 shrink-0 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
                      />
                    </svg>
                    <span className="text-gray-500 dark:text-gray-400">
                      @{fork.profiles?.nickname ?? "?"}
                    </span>
                    <span className="truncate font-medium text-gray-900 dark:text-white">
                      {fork.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
