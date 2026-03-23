"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type Reason = "spam" | "inappropriate" | "copyright" | "other";

interface ReportButtonProps {
  creationId: string;
}

export default function ReportButton({ creationId }: ReportButtonProps) {
  const t = useTranslations("report");
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleSubmit = async () => {
    if (!reason || !userId) return;
    setSubmitting(true);

    const { error } = await supabase.from("reports").insert({
      reporter_id: userId,
      creation_id: creationId,
      reason,
      description: description.trim() || null,
      status: "pending",
    });

    setSubmitting(false);
    setOpen(false);
    setReason(null);
    setDescription("");

    if (error) {
      setToast(t("error"));
    } else {
      setToast(t("success"));
    }
    setTimeout(() => setToast(null), 3000);
  };

  const reasons: { key: Reason; label: string }[] = [
    { key: "spam", label: t("reasonSpam") },
    { key: "inappropriate", label: t("reasonInappropriate") },
    { key: "copyright", label: t("reasonCopyright") },
    { key: "other", label: t("reasonOther") },
  ];

  return (
    <>
      {/* Report trigger button */}
      <button
        onClick={() => {
          if (!userId) return;
          setOpen(true);
        }}
        title={userId ? t("report") : t("loginRequired")}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
        </svg>
        {t("report")}
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            ref={modalRef}
            className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900"
          >
            <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
              {t("title")}
            </h3>
            <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
              {t("subtitle")}
            </p>

            {/* Reason selection */}
            <div className="mb-4 space-y-2">
              {reasons.map((r) => (
                <label
                  key={r.key}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-3 text-sm font-medium transition ${
                    reason === r.key
                      ? "border-gray-900 bg-gray-50 text-gray-900 dark:border-white dark:bg-gray-800 dark:text-white"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.key}
                    checked={reason === r.key}
                    onChange={() => setReason(r.key)}
                    className="sr-only"
                  />
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                      reason === r.key
                        ? "border-gray-900 dark:border-white"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {reason === r.key && (
                      <span className="h-2 w-2 rounded-full bg-gray-900 dark:bg-white" />
                    )}
                  </span>
                  {r.label}
                </label>
              ))}
            </div>

            {/* Description (shown for "other", optional for rest) */}
            {reason && (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={reason === "other" ? t("descriptionRequired") : t("descriptionOptional")}
                rows={3}
                className="mb-4 w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-gray-400 dark:focus:ring-gray-400"
              />
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                  setReason(null);
                  setDescription("");
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason || (reason === "other" && !description.trim()) || submitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? t("submitting") : t("submit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-900 px-5 py-3 text-sm font-medium text-white shadow-lg dark:bg-white dark:text-gray-900">
          {toast}
        </div>
      )}
    </>
  );
}
