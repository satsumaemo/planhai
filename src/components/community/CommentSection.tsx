"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Comment {
  id: string;
  content: string;
  parent_id: string | null;
  user_id: string;
  creation_id: string;
  created_at: string;
  profiles: {
    nickname: string | null;
    avatar_url: string | null;
  } | null;
  replies?: Comment[];
}

interface Props {
  creationId: string;
  authorId: string;
}

export default function CommentSection({ creationId, authorId }: Props) {
  const t = useTranslations("community");
  const supabase = createClient();

  const [comments, setComments] = useState<Comment[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      await loadComments();
    }
    init();
  }, [creationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*, profiles:user_id(id, nickname, avatar_url)")
      .eq("creation_id", creationId)
      .order("created_at", { ascending: true });

    if (!data) return;

    // Build tree: separate top-level and replies
    const all = data as Comment[];
    const topLevel: Comment[] = [];
    const repliesMap = new Map<string, Comment[]>();

    all.forEach((c) => {
      if (!c.parent_id) {
        topLevel.push({ ...c, replies: [] });
      } else {
        const list = repliesMap.get(c.parent_id) ?? [];
        list.push(c);
        repliesMap.set(c.parent_id, list);
      }
    });

    topLevel.forEach((c) => {
      c.replies = repliesMap.get(c.id) ?? [];
    });

    setComments(topLevel);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newComment.trim()) return;
    setSubmitting(true);

    await supabase.from("comments").insert({
      content: newComment.trim(),
      user_id: userId,
      creation_id: creationId,
      parent_id: null,
    });

    // Notification
    if (authorId !== userId) {
      await supabase.from("notifications").insert({
        user_id: authorId,
        actor_id: userId,
        type: "comment",
        creation_id: creationId,
      });
    }

    setNewComment("");
    setSubmitting(false);
    await loadComments();
  };

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        {t("comments")} ({comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0)})
      </h2>

      {/* New comment form */}
      {userId ? (
        <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t("commentPlaceholder")}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-gray-400 dark:focus:ring-gray-400"
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="shrink-0 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-40 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {t("submit")}
          </button>
        </form>
      ) : (
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          <Link href="/login" className="font-medium text-gray-900 underline dark:text-white">
            {t("loginToComment")}
          </Link>
        </div>
      )}

      {/* Comments list */}
      {comments.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
          {t("noComments")}
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              creationId={creationId}
              authorId={authorId}
              userId={userId}
              onRefresh={loadComments}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Single comment with replies ───
function CommentItem({
  comment,
  creationId,
  authorId,
  userId,
  onRefresh,
}: {
  comment: Comment;
  creationId: string;
  authorId: string;
  userId: string | null;
  onRefresh: () => Promise<void>;
}) {
  const t = useTranslations("community");
  const supabase = createClient();

  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [submitting, setSubmitting] = useState(false);

  const isOwner = userId === comment.user_id;
  const profile = comment.profiles;
  const replies = comment.replies ?? [];

  const handleReply = async () => {
    if (!userId || !replyText.trim()) return;
    setSubmitting(true);

    await supabase.from("comments").insert({
      content: replyText.trim(),
      user_id: userId,
      creation_id: creationId,
      parent_id: comment.id,
    });

    if (authorId !== userId) {
      await supabase.from("notifications").insert({
        user_id: authorId,
        actor_id: userId,
        type: "comment",
        creation_id: creationId,
      });
    }

    setReplyText("");
    setShowReplyInput(false);
    setSubmitting(false);
    setShowReplies(true);
    await onRefresh();
  };

  const handleEdit = async () => {
    if (!editText.trim()) return;
    setSubmitting(true);
    await supabase
      .from("comments")
      .update({ content: editText.trim() })
      .eq("id", comment.id);
    setEditing(false);
    setSubmitting(false);
    await onRefresh();
  };

  const handleDelete = async () => {
    if (!confirm(t("deleteConfirm"))) return;
    await supabase.from("comments").delete().eq("id", comment.id);
    await onRefresh();
  };

  const timeAgo = getTimeAgo(comment.created_at);

  return (
    <div>
      <div className="flex gap-3">
        {/* Avatar */}
        <Link href={`/profile/${profile?.nickname ?? ""}`} className="shrink-0">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              {(profile?.nickname?.[0] ?? "?").toUpperCase()}
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Link href={`/profile/${profile?.nickname ?? ""}`} className="text-sm font-semibold text-gray-900 dark:text-white">
              {profile?.nickname ?? "Anonymous"}
            </Link>
            <span className="text-xs text-gray-400">{timeAgo}</span>
          </div>

          {/* Content */}
          {editing ? (
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              <button onClick={handleEdit} disabled={submitting} className="text-sm font-medium text-gray-900 dark:text-white">
                {t("save")}
              </button>
              <button onClick={() => setEditing(false)} className="text-sm text-gray-500">
                {t("cancel")}
              </button>
            </div>
          ) : (
            <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">
              {comment.content}
            </p>
          )}

          {/* Actions */}
          {!editing && (
            <div className="mt-1 flex gap-3">
              {userId && (
                <button
                  onClick={() => setShowReplyInput(!showReplyInput)}
                  className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  {t("reply")}
                </button>
              )}
              {isOwner && (
                <>
                  <button
                    onClick={() => { setEditing(true); setEditText(comment.content); }}
                    className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    {t("edit")}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="text-xs font-medium text-red-400 hover:text-red-600"
                  >
                    {t("delete")}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Reply input */}
          {showReplyInput && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t("replyPlaceholder")}
                onKeyDown={(e) => e.key === "Enter" && handleReply()}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              <button
                onClick={handleReply}
                disabled={submitting || !replyText.trim()}
                className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-gray-900"
              >
                {t("submit")}
              </button>
            </div>
          )}

          {/* Replies */}
          {replies.length > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400"
            >
              {showReplies
                ? t("hideReplies")
                : `${t("showReplies")} (${replies.length})`}
            </button>
          )}

          {showReplies && replies.length > 0 && (
            <div className="mt-3 space-y-3 border-l-2 border-gray-100 pl-4 dark:border-gray-800">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  creationId={creationId}
                  authorId={authorId}
                  userId={userId}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}
