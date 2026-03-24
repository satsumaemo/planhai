"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useDropzone } from "react-dropzone";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/constants/categories";
import type { AiAnalysisResult } from "@/app/new/page";

interface Step3Props {
  aiResult: AiAnalysisResult | null;
  fileUrl: string;
  selectedCategory: string;
  selectedSubCategory: string;
  selectedTools: string[];
  customTools: string[];
  onBack: () => void;
  onPublished: () => void;
}

export default function Step3EditMeta({
  aiResult,
  fileUrl,
  selectedCategory,
  selectedSubCategory,
  selectedTools,
  customTools,
  onBack,
  onPublished,
}: Step3Props) {
  const t = useTranslations("upload");
  const supabase = createClient();

  // ─── Form state (pre-filled from AI or Step 1) ───
  const [title, setTitle] = useState(aiResult?.title ?? "");
  const [description, setDescription] = useState(aiResult?.description ?? "");
  const [category, setCategory] = useState(
    aiResult?.category ?? selectedCategory
  );
  const [subCategory, setSubCategory] = useState(
    aiResult?.sub_category ?? selectedSubCategory
  );
  const [tags, setTags] = useState<string[]>(
    aiResult?.tags?.slice(0, 5) ?? []
  );
  const [tagInput, setTagInput] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState(fileUrl);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);

  // Optional fields
  const [aiModel, setAiModel] = useState(
    [...selectedTools, ...customTools].join(", ")
  );
  const [demoUrl, setDemoUrl] = useState("");
  const [license, setLicense] = useState("none");
  const [visibility, setVisibility] = useState<
    "public" | "unlisted" | "private"
  >("public");

  // Save state
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "publishing"
  >("idle");

  // AI badge tracking
  const [aiFields] = useState<Set<string>>(() => {
    const fields = new Set<string>();
    if (aiResult) {
      if (aiResult.title) fields.add("title");
      if (aiResult.description) fields.add("description");
      if (aiResult.category) fields.add("category");
      if (aiResult.sub_category) fields.add("subCategory");
      if (aiResult.tags?.length) fields.add("tags");
    }
    return fields;
  });

  const tagInputRef = useRef<HTMLInputElement>(null);

  // ─── Tag handlers ───
  const handleAddTag = () => {
    const val = tagInput.trim().replace(/^#/, "");
    if (!val || tags.length >= 5 || tags.includes(val)) return;
    setTags((prev) => [...prev, val]);
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  // ─── Thumbnail upload ───
  const onThumbnailDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setThumbnailUploading(true);
      const ext = file.name.split(".").pop();
      const path = `thumbnails/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("creations")
        .upload(path, file);
      if (!error) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("creations").getPublicUrl(path);
        setThumbnailUrl(publicUrl);
      }
      setThumbnailUploading(false);
    },
    [supabase]
  );

  const {
    getRootProps: getThumbProps,
    getInputProps: getThumbInputProps,
  } = useDropzone({
    onDrop: onThumbnailDrop,
    accept: { "image/*": [] },
    multiple: false,
    maxSize: 10 * 1024 * 1024,
  });

  // ─── Save / Publish ───
  const handleSave = async (mode: "draft" | "publish") => {
    setSaveStatus(mode === "draft" ? "saving" : "publishing");

    const allTools = [...selectedTools, ...customTools];
    const finalVisibility = mode === "draft" ? "private" : visibility;

    const { data, error } = await supabase
      .from("creations")
      .insert({
        title,
        description,
        category,
        sub_category: subCategory,
        file_url: fileUrl,
        thumbnail_url: thumbnailUrl,
        ai_model: aiModel || null,
        demo_url: demoUrl || null,
        license: license === "none" ? null : license,
        visibility: finalVisibility,
        tools: allTools,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Save error:", error);
      setSaveStatus("idle");
      return;
    }

    // Save tags
    if (tags.length > 0) {
      // Upsert tags
      const tagRows = tags.map((name) => ({ name }));
      await supabase.from("tags").upsert(tagRows, { onConflict: "name" });

      // Fetch tag IDs
      const { data: tagData } = await supabase
        .from("tags")
        .select("id, name")
        .in("name", tags);

      if (tagData && tagData.length > 0) {
        const creationTags = tagData.map((t: any) => ({
          creation_id: data.id,
          tag_id: t.id,
        }));
        await supabase.from("creation_tags").insert(creationTags);
      }
    }

    setSaveStatus("idle");

    if (mode === "publish") {
      onPublished();
    }
  };

  // ─── Active category data ───
  const activeCat = CATEGORIES.find((c) => c.key === category);
  const activeSubs = activeCat?.subCategories ?? [];

  // ─── AI badge component ───
  const AiBadge = ({ field }: { field: string }) =>
    aiFields.has(field) ? (
      <span className="ml-2 inline-flex items-center rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
        {t("aiBadge")}
      </span>
    ) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-sm text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          {t("step2")}
        </button>
        <svg
          className="h-4 w-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {t("step3")}
        </span>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* ═══════ LEFT: Edit Form ═══════ */}
        <div className="flex-1 space-y-6">
          {/* Title */}
          <div>
            <label className="mb-1.5 flex items-center text-sm font-medium text-gray-900 dark:text-white">
              {t("titleLabel")}
              <AiBadge field="title" />
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-gray-400 dark:focus:ring-gray-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 flex items-center text-sm font-medium text-gray-900 dark:text-white">
              {t("descriptionLabel")}
              <AiBadge field="description" />
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-gray-400 dark:focus:ring-gray-400"
            />
          </div>

          {/* Category / Sub-category row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center text-sm font-medium text-gray-900 dark:text-white">
                {t("categoryTitle")}
                <AiBadge field="category" />
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSubCategory("");
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-gray-400 dark:focus:ring-gray-400"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {t(`categories.${c.key}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 flex items-center text-sm font-medium text-gray-900 dark:text-white">
                {t("subCategoryTitle")}
                <AiBadge field="subCategory" />
              </label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-gray-400 dark:focus:ring-gray-400"
              >
                <option value="">{t("subCategoryPlaceholder")}</option>
                {activeSubs.map((s) => (
                  <option key={s.key} value={s.key}>
                    {t(`subCategories.${s.key}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1.5 flex items-center text-sm font-medium text-gray-900 dark:text-white">
              {t("tagsLabel")}
              <AiBadge field="tags" />
            </label>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              {t("tagsDesc")}
            </p>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </span>
              ))}
              {tags.length < 5 ? (
                <input
                  ref={tagInputRef}
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder={tags.length === 0 ? t("tagPlaceholder") : ""}
                  className="min-w-[80px] flex-1 bg-transparent py-0.5 text-sm outline-none dark:text-white"
                />
              ) : (
                <span className="text-xs text-gray-400">
                  {t("maxTagsReached")}
                </span>
              )}
            </div>
          </div>

          {/* Thumbnail */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-white">
              {t("thumbnailLabel")}
            </label>
            <div className="flex items-start gap-4">
              {thumbnailUrl ? (
                <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                  <img
                    src={thumbnailUrl}
                    alt="Thumbnail"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-24 w-40 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                  <svg
                    className="h-8 w-8 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                    />
                  </svg>
                </div>
              )}
              <div {...getThumbProps()}>
                <input {...getThumbInputProps()} />
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {thumbnailUploading
                    ? "..."
                    : thumbnailUrl
                      ? t("thumbnailChange")
                      : t("thumbnailUpload")}
                </button>
              </div>
            </div>
          </div>

          {/* ─── Optional fields ─── */}
          <hr className="border-gray-200 dark:border-gray-700" />

          {/* AI model */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-white">
              {t("aiModelLabel")}
            </label>
            <input
              type="text"
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              placeholder={t("aiModelPlaceholder")}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-gray-400 dark:focus:ring-gray-400"
            />
          </div>

          {/* Demo URL */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-white">
              {t("demoUrlLabel")}
            </label>
            <input
              type="url"
              value={demoUrl}
              onChange={(e) => setDemoUrl(e.target.value)}
              placeholder={t("demoUrlPlaceholder")}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-gray-400 dark:focus:ring-gray-400"
            />
          </div>

          {/* License + Visibility row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-white">
                {t("licenseLabel")}
              </label>
              <select
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-gray-400 dark:focus:ring-gray-400"
              >
                <option value="none">{t("licenseNone")}</option>
                <option value="MIT">MIT</option>
                <option value="Apache-2.0">Apache 2.0</option>
                <option value="GPL-3.0">GPL 3.0</option>
                <option value="CC-BY-4.0">CC BY 4.0</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-white">
                {t("visibilityLabel")}
              </label>
              <select
                value={visibility}
                onChange={(e) =>
                  setVisibility(
                    e.target.value as "public" | "unlisted" | "private"
                  )
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-gray-400 dark:focus:ring-gray-400"
              >
                <option value="public">{t("visibilityPublic")}</option>
                <option value="unlisted">{t("visibilityUnlisted")}</option>
                <option value="private">{t("visibilityPrivate")}</option>
              </select>
            </div>
          </div>

          {/* ─── Action buttons ─── */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => handleSave("draft")}
              disabled={saveStatus !== "idle" || !title.trim()}
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {saveStatus === "saving" ? t("saving") : t("saveDraft")}
            </button>
            <button
              onClick={() => handleSave("publish")}
              disabled={saveStatus !== "idle" || !title.trim()}
              className="rounded-lg bg-gray-900 px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-40 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {saveStatus === "publishing" ? t("publishing") : t("publish")}
            </button>
          </div>
        </div>

        {/* ═══════ RIGHT: Preview Card ═══════ */}
        <div className="w-full shrink-0 lg:w-80">
          <div className="sticky top-20">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              {t("previewTitle")}
            </h3>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
              {/* Thumbnail */}
              <div className="aspect-video w-full bg-gray-100 dark:bg-gray-800">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
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

              {/* Card body */}
              <div className="p-4">
                <p className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
                  {title || t("titlePlaceholder")}
                </p>
                <p className="mb-3 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                  {description || t("descriptionPlaceholder")}
                </p>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Category badge */}
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {t(`categories.${category}`)}
                  </span>
                  {subCategory && (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      {t(`subCategories.${subCategory}`)}
                    </span>
                  )}
                </div>

                {/* Author */}
                <div className="flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    ?
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t("previewAuthor")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
