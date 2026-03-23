"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [nickname, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyGenerating, setApiKeyGenerating] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  // ─── Load profile ───
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUsername(profile.nickname ?? "");
        setBio(profile.bio ?? "");
        setWebsite(profile.website ?? "");
        setAvatarUrl(profile.avatar_url ?? null);
        setApiKey(profile.api_key ?? null);
      }
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Avatar upload ───
  const onAvatarDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file || !userId) return;
      setAvatarUploading(true);

      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar-${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (!error) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(path);
        setAvatarUrl(publicUrl);
      }
      setAvatarUploading(false);
    },
    [supabase, userId]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: onAvatarDrop,
    accept: { "image/*": [] },
    multiple: false,
    maxSize: 5 * 1024 * 1024,
  });

  // ─── Save ───
  const handleSave = async () => {
    if (!userId) return;
    setSaveStatus("saving");

    await supabase
      .from("profiles")
      .update({
        nickname: nickname.trim() || null,
        bio: bio.trim() || null,
        website: website.trim() || null,
        avatar_url: avatarUrl,
      })
      .eq("id", userId);

    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="space-y-6">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="h-9 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-24 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  const initials = (nickname?.[0] ?? "?").toUpperCase();

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-white">
        {t("title")}
      </h1>

      <div className="space-y-6">
        {/* Avatar */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
            {t("avatar")}
          </label>
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-200 text-xl font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                {initials}
              </div>
            )}
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {avatarUploading ? "..." : t("changeAvatar")}
              </button>
            </div>
          </div>
        </div>

        {/* Username */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-white">
            {t("nickname")}
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t("nicknamePlaceholder")}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-gray-400 dark:focus:ring-gray-400"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-white">
            {t("bio")}
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t("bioPlaceholder")}
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-gray-400 dark:focus:ring-gray-400"
          />
        </div>

        {/* Website */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-white">
            {t("website")}
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder={t("websitePlaceholder")}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-gray-400 dark:focus:ring-gray-400"
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saveStatus === "saving"}
          className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
        >
          {saveStatus === "saving"
            ? t("saving")
            : saveStatus === "saved"
              ? t("saved")
              : t("save")}
        </button>

        {/* ─── API Key ─── */}
        <hr className="border-gray-200 dark:border-gray-700" />

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              {t("apiKeyTitle")}
            </label>
            <Link
              href="/docs"
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              {t("viewDocs")}
            </Link>
          </div>
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            {t("apiKeyDesc")}
          </p>

          {apiKey ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-hidden text-ellipsis rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200">
                  {apiKey}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(apiKey);
                    setApiKeyCopied(true);
                    setTimeout(() => setApiKeyCopied(false), 2000);
                  }}
                  className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {apiKeyCopied ? t("apiKeyCopied") : "Copy"}
                </button>
              </div>
              <button
                onClick={async () => {
                  setApiKeyGenerating(true);
                  const res = await fetch("/api/v1/key", { method: "POST" });
                  const data = await res.json();
                  if (data.api_key) setApiKey(data.api_key);
                  setApiKeyGenerating(false);
                }}
                disabled={apiKeyGenerating}
                className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50 dark:text-red-400"
              >
                {apiKeyGenerating ? "..." : t("regenerateKey")}
              </button>
              <p className="text-xs text-gray-400">{t("apiKeyHidden")}</p>
            </div>
          ) : (
            <button
              onClick={async () => {
                setApiKeyGenerating(true);
                const res = await fetch("/api/v1/key", { method: "POST" });
                const data = await res.json();
                if (data.api_key) setApiKey(data.api_key);
                setApiKeyGenerating(false);
              }}
              disabled={apiKeyGenerating}
              className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {apiKeyGenerating ? "..." : t("generateKey")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
