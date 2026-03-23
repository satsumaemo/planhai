"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/constants/categories";
import CategoryIcon from "@/components/upload/CategoryIcon";
import Step3EditMeta from "@/components/upload/Step3EditMeta";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export interface AiAnalysisResult {
  title: string;
  description: string;
  category: string;
  sub_category: string;
  tags: string[];
  thumbnail_suggestion: string;
}

export default function NewUploadPage() {
  const t = useTranslations("upload");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // ─── Step management ───
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // ─── Fork mode: skip to Step 3 with forked creation data ───
  const [forkData, setForkData] = useState<{
    id: string;
    fileUrl: string;
    category: string;
    subCategory: string;
    tools: string[];
    aiResult: AiAnalysisResult;
  } | null>(null);

  useEffect(() => {
    const forkId = searchParams.get("fork");
    if (!forkId) return;

    async function loadFork() {
      const { data } = await supabase
        .from("creations")
        .select("*")
        .eq("id", forkId)
        .single();
      if (!data) return;

      // Load tags for this creation
      const { data: tagData } = await supabase
        .from("creation_tags")
        .select("tags(name)")
        .eq("creation_id", forkId!);
      const tags = tagData
        ?.map((t: any) => t.tags?.name)
        .filter(Boolean)
        .slice(0, 5) ?? [];

      setForkData({
        id: forkId!,
        fileUrl: data.file_url ?? data.thumbnail_url ?? "",
        category: data.category ?? "other",
        subCategory: data.sub_category ?? "other",
        tools: data.tools ?? [],
        aiResult: {
          title: data.title ?? "",
          description: data.description ?? "",
          category: data.category ?? "other",
          sub_category: data.sub_category ?? "other",
          tags,
          thumbnail_suggestion: "",
        },
      });
      setCurrentStep(3);
    }
    loadFork();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── File / URL state ───
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    url: string;
  } | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "done" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // ─── Category state ───
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(
    null
  );
  const [customSubCategory, setCustomSubCategory] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [customTools, setCustomTools] = useState<string[]>([]);
  const [showCustomToolInput, setShowCustomToolInput] = useState(false);
  const [customToolInput, setCustomToolInput] = useState("");

  // ─── Step 2: AI analysis state ───
  const [analysisStatus, setAnalysisStatus] = useState<
    "idle" | "analyzing" | "done" | "error" | "timeout"
  >("idle");
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const customSubRef = useRef<HTMLInputElement>(null);
  const customToolRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-focus "Other" sub-category input
  useEffect(() => {
    if (selectedSubCategory === "other" && customSubRef.current) {
      customSubRef.current.focus();
    }
  }, [selectedSubCategory]);

  // Auto-focus custom tool input
  useEffect(() => {
    if (showCustomToolInput && customToolRef.current) {
      customToolRef.current.focus();
    }
  }, [showCustomToolInput]);

  // Clean up timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ─── Dropzone handlers ───
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > MAX_FILE_SIZE) {
        setErrorMsg(t("fileTooLarge"));
        return;
      }

      setErrorMsg("");
      setUploadStatus("uploading");
      setExternalUrl("");

      const fileExt = file.name.split(".").pop();
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error } = await supabase.storage
        .from("creations")
        .upload(filePath, file);

      if (error) {
        setUploadStatus("error");
        setErrorMsg(t("uploadError"));
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("creations").getPublicUrl(filePath);

      setUploadedFile({ name: file.name, size: file.size, url: publicUrl });
      setUploadStatus("done");
    },
    [supabase, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: MAX_FILE_SIZE,
  });

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    setExternalUrl(urlInput.trim());
    setUploadedFile(null);
    setUploadStatus("idle");
    setUrlInput("");
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadStatus("idle");
    setErrorMsg("");
  };

  const handleRemoveUrl = () => {
    setExternalUrl("");
  };

  // ─── Category handlers ───
  const handleCategorySelect = (key: string) => {
    if (selectedCategory === key) {
      setSelectedCategory(null);
      setSelectedSubCategory(null);
      setCustomSubCategory("");
      setSelectedTools([]);
      setCustomTools([]);
      setShowCustomToolInput(false);
    } else {
      setSelectedCategory(key);
      setSelectedSubCategory(null);
      setCustomSubCategory("");
      setSelectedTools([]);
      setCustomTools([]);
      setShowCustomToolInput(false);
    }
  };

  const handleToolToggle = (tool: string) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  };

  const handleRemoveCustomTool = (tool: string) => {
    setCustomTools((prev) => prev.filter((t) => t !== tool));
  };

  const handleAddCustomTool = () => {
    const val = customToolInput.trim();
    if (!val) return;
    if (!customTools.includes(val) && !selectedTools.includes(val)) {
      setCustomTools((prev) => [...prev, val]);
    }
    setCustomToolInput("");
  };

  // ─── Step transition: Start AI analysis ───
  const handleNextStep = async () => {
    setCurrentStep(2);
    setAnalysisStatus("analyzing");
    setAiResult(null);
    setElapsedMs(0);

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 100);

    const fileUrl = uploadedFile?.url || externalUrl;

    try {
      const controller = new AbortController();
      const clientTimeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl,
          fileName: uploadedFile?.name,
          locale,
          category: selectedCategory,
          subCategory: selectedSubCategory,
        }),
        signal: controller.signal,
      });

      clearTimeout(clientTimeout);

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 408) {
          setAnalysisStatus("timeout");
        } else {
          setAnalysisStatus("error");
        }
        console.error("AI analysis error:", data.error);
        return;
      }

      const data: AiAnalysisResult = await res.json();
      setAiResult(data);
      setAnalysisStatus("done");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setAnalysisStatus("timeout");
      } else {
        setAnalysisStatus("error");
      }
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsedMs(Date.now() - startTime);
    }
  };

  const handleSkipAnalysis = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setAnalysisStatus("done");
    setAiResult(null);
  };

  const handleBackToStep1 = () => {
    setCurrentStep(1);
    setAnalysisStatus("idle");
    setAiResult(null);
    setElapsedMs(0);
  };

  const handleGoToStep3 = () => {
    setCurrentStep(3);
  };

  const handleBackToStep2 = () => {
    setCurrentStep(2);
  };

  const handlePublished = () => {
    // TODO: Step 4 - Published screen
    window.location.href = "/";
  };

  // ─── Derived state ───
  const activeCat = CATEGORIES.find((c) => c.key === selectedCategory);
  const hasUpload = uploadedFile || externalUrl;
  const subCatValid =
    selectedSubCategory &&
    (selectedSubCategory !== "other" || customSubCategory.trim());
  const isStep1Complete = hasUpload && selectedCategory && subCatValid;

  // ─── STEP 3 RENDER ───
  if (currentStep === 3) {
    return (
      <Step3EditMeta
        aiResult={forkData?.aiResult ?? aiResult}
        fileUrl={forkData?.fileUrl ?? uploadedFile?.url ?? externalUrl}
        selectedCategory={forkData?.category ?? selectedCategory ?? "other"}
        selectedSubCategory={forkData?.subCategory ?? selectedSubCategory ?? "other"}
        selectedTools={forkData?.tools ?? selectedTools}
        customTools={forkData ? [] : customTools}
        onBack={forkData ? () => window.history.back() : handleBackToStep2}
        onPublished={handlePublished}
      />
    );
  }

  // ─── STEP 2 RENDER ───
  if (currentStep === 2) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Step indicator */}
        <div className="mb-8 flex items-center gap-3">
          <button
            onClick={handleBackToStep1}
            className="text-sm text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            {t("step1")}
          </button>
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {t("step2")}
          </span>
        </div>

        {/* Analyzing state */}
        {analysisStatus === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-24">
            {/* Spinner */}
            <div className="relative mb-6">
              <div className="h-16 w-16 rounded-full border-4 border-gray-200 dark:border-gray-700" />
              <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-gray-900 dark:border-t-white" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              {t("analyzingTitle")}
            </h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {t("analyzingDesc")}
            </p>
            <p className="mb-6 font-mono text-xs text-gray-400">
              {(elapsedMs / 1000).toFixed(1)}s
            </p>
            <button
              onClick={handleSkipAnalysis}
              className="text-sm text-gray-500 underline transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              {t("skipAnalysis")}
            </button>
          </div>
        )}

        {/* Error / Timeout state */}
        {(analysisStatus === "error" || analysisStatus === "timeout") && (
          <div className="flex flex-col items-center justify-center py-24">
            <svg className="mb-4 h-12 w-12 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              {analysisStatus === "timeout"
                ? t("analysisTimeout")
                : t("analysisFailed")}
            </p>
            <button
              onClick={() => {
                setAiResult(null);
                setCurrentStep(3);
              }}
              className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {t("continueToEdit")}
            </button>
          </div>
        )}

        {/* Done state - show AI results preview */}
        {analysisStatus === "done" && (
          <div className="space-y-6">
            {/* Success header */}
            {aiResult && (
              <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-3 dark:border-green-900 dark:bg-green-950/30">
                <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-green-800 dark:text-green-300">
                  {t("analysisDone")} ({(elapsedMs / 1000).toFixed(1)}s)
                </span>
              </div>
            )}

            {aiResult ? (
              <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                {/* Title */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("aiSuggestedTitle")}
                  </label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {aiResult.title}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("aiSuggestedDesc")}
                  </label>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    {aiResult.description}
                  </p>
                </div>

                {/* Category & Sub-category */}
                <div className="flex gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      {t("categoryTitle")}
                    </label>
                    <span className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                      {t(`categories.${aiResult.category}`)}
                    </span>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      {t("subCategoryTitle")}
                    </label>
                    <span className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                      {t(`subCategories.${aiResult.sub_category}`)}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("aiSuggestedTags")}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {aiResult.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* No AI result (skipped or failed) */
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-900">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("analysisFailed")}
                </p>
              </div>
            )}

            {/* Continue button */}
            <div className="flex justify-end">
              <button
                onClick={handleGoToStep3}
                className="rounded-lg bg-gray-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
              >
                {t("continueToEdit")}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── STEP 1 RENDER ───
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Page title */}
      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-white">
        {t("pageTitle")}
      </h1>

      {/* ─── Dropzone ─── */}
      <section className="mb-10">
        {!uploadedFile && !externalUrl ? (
          <>
            <div
              {...getRootProps()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition ${
                isDragActive
                  ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30"
                  : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600 dark:hover:bg-gray-800/60"
              }`}
            >
              <input {...getInputProps()} />
              <svg
                className="mb-3 h-10 w-10 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                />
              </svg>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isDragActive ? t("dropzoneActiveTitle") : t("dropzoneTitle")}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("dropzoneDesc")}
              </p>
            </div>

            {/* URL input */}
            <div className="mt-4">
              <p className="mb-2 text-center text-xs text-gray-500 dark:text-gray-400">
                {t("dropzoneOrUrl")}
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                  placeholder={t("urlPlaceholder")}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-gray-400 dark:focus:ring-gray-400"
                />
                <button
                  onClick={handleAddUrl}
                  className="shrink-0 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                >
                  {t("addUrl")}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-900">
            {uploadStatus === "uploading" ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-white" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t("uploadingFile")}
                </span>
              </>
            ) : uploadedFile ? (
              <>
                <svg className="h-5 w-5 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {uploadedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB &middot;{" "}
                    {t("uploadComplete")}
                  </p>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="shrink-0 text-xs text-red-500 hover:text-red-700 dark:text-red-400"
                >
                  {t("removeFile")}
                </button>
              </>
            ) : externalUrl ? (
              <>
                <svg className="h-5 w-5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.342" />
                </svg>
                <p className="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-white">
                  {externalUrl}
                </p>
                <button
                  onClick={handleRemoveUrl}
                  className="shrink-0 text-xs text-red-500 hover:text-red-700 dark:text-red-400"
                >
                  {t("removeUrl")}
                </button>
              </>
            ) : null}
          </div>
        )}

        {errorMsg && (
          <p className="mt-2 text-center text-sm text-red-500">{errorMsg}</p>
        )}
      </section>

      {/* ─── Category grid ─── */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t("categoryTitle")}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => handleCategorySelect(cat.key)}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-4 text-left transition ${
                  isActive
                    ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-800"
                }`}
              >
                <CategoryIcon
                  icon={cat.icon}
                  className={`h-6 w-6 shrink-0 ${isActive ? "text-white dark:text-gray-900" : "text-gray-400"}`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {t(`categories.${cat.key}`)}
                  </p>
                  <p
                    className={`truncate text-xs ${isActive ? "text-gray-300 dark:text-gray-500" : "text-gray-500 dark:text-gray-400"}`}
                  >
                    {t(`categoryDesc.${cat.key}`)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Sub-category dropdown ─── */}
      {activeCat && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
            {t("subCategoryTitle")}
          </h2>
          <select
            value={selectedSubCategory ?? ""}
            onChange={(e) => {
              setSelectedSubCategory(e.target.value || null);
              setCustomSubCategory("");
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-gray-400 dark:focus:ring-gray-400"
          >
            <option value="">{t("subCategoryPlaceholder")}</option>
            {activeCat.subCategories.map((sub) => (
              <option key={sub.key} value={sub.key}>
                {t(`subCategories.${sub.key}`)}
              </option>
            ))}
          </select>

          {/* Other sub-category text input */}
          <div
            className={`grid transition-all duration-300 ease-out ${
              selectedSubCategory === "other"
                ? "mt-3 grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <input
                ref={customSubRef}
                type="text"
                value={customSubCategory}
                onChange={(e) => setCustomSubCategory(e.target.value)}
                placeholder={t("otherSubCategoryPlaceholder")}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-gray-400 dark:focus:ring-gray-400"
              />
            </div>
          </div>
        </section>
      )}

      {/* ─── Tools multi-select chips ─── */}
      {activeCat && (
        <section className="mb-10">
          <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
            {t("toolsTitle")}
          </h2>
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            {t("toolsDesc")}
          </p>
          <div className="flex flex-wrap gap-2">
            {activeCat.tools.map((tool) => {
              const isSelected = selectedTools.includes(tool);
              return (
                <button
                  key={tool}
                  onClick={() => handleToolToggle(tool)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                    isSelected
                      ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                      : "border-gray-300 bg-white text-gray-600 hover:border-gray-500 hover:text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-400 dark:hover:text-white"
                  }`}
                >
                  {tool}
                </button>
              );
            })}

            {customTools.map((tool) => (
              <span
                key={tool}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-900 bg-gray-900 px-3.5 py-1.5 text-sm font-medium text-white dark:border-white dark:bg-white dark:text-gray-900"
              >
                {tool}
                <button
                  onClick={() => handleRemoveCustomTool(tool)}
                  className="ml-0.5 rounded-full p-0.5 transition hover:bg-white/20 dark:hover:bg-gray-900/20"
                  aria-label={`Remove ${tool}`}
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}

            {!showCustomToolInput ? (
              <button
                onClick={() => setShowCustomToolInput(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-gray-400 px-3.5 py-1.5 text-sm font-medium text-gray-500 transition hover:border-gray-600 hover:text-gray-700 dark:border-gray-500 dark:text-gray-400 dark:hover:border-gray-300 dark:hover:text-gray-200"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {t("addCustomTool")}
              </button>
            ) : (
              <div className="inline-flex items-center overflow-hidden rounded-full border border-gray-900 dark:border-white">
                <input
                  ref={customToolRef}
                  type="text"
                  value={customToolInput}
                  onChange={(e) => setCustomToolInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCustomTool();
                    if (e.key === "Escape") {
                      setShowCustomToolInput(false);
                      setCustomToolInput("");
                    }
                  }}
                  onBlur={() => {
                    if (!customToolInput.trim()) {
                      setShowCustomToolInput(false);
                    }
                  }}
                  placeholder={t("customToolPlaceholder")}
                  className="w-36 bg-transparent px-3.5 py-1.5 text-sm outline-none dark:text-white"
                />
                <button
                  onClick={handleAddCustomTool}
                  className="border-l border-gray-900 px-3 py-1.5 text-sm font-medium text-gray-900 transition hover:bg-gray-100 dark:border-white dark:text-white dark:hover:bg-gray-800"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── Next step button ─── */}
      <div className="flex justify-end">
        <button
          disabled={!isStep1Complete}
          onClick={handleNextStep}
          className="rounded-lg bg-gray-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 dark:disabled:opacity-40"
        >
          {t("nextStep")}
        </button>
      </div>
    </div>
  );
}
