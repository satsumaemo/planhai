"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Report {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter: { nickname: string | null } | null;
  creation: { id: string; title: string } | null;
}

export default function AdminReportsPage() {
  const t = useTranslations("admin");
  const tr = useTranslations("report");
  const router = useRouter();
  const supabase = createClient();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      let query = supabase
        .from("reports")
        .select("id, reason, description, status, created_at, reporter:reporter_id(nickname), creation:creation_id(id, title)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Admin reports error:", error.message);
      }
      setReports((data as unknown as Report[]) ?? []);
      setLoading(false);
    }
    load();
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (reportId: string, newStatus: string) => {
    await supabase.from("reports").update({ status: newStatus }).eq("id", reportId);
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
    );
  };

  const reasonLabel = (reason: string) => {
    const map: Record<string, string> = {
      spam: tr("reasonSpam"),
      inappropriate: tr("reasonInappropriate"),
      copyright: tr("reasonCopyright"),
      other: tr("reasonOther"),
    };
    return map[reason] ?? reason;
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      reviewed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    };
    return (
      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
        {t(`status_${status}`)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
        {t("title")}
      </h1>

      {/* Status filter */}
      <div className="mb-6 flex gap-2">
        {["all", "pending", "reviewed", "resolved"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setLoading(true); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              statusFilter === s
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            {s === "all" ? t("filterAll") : t(`status_${s}`)}
          </button>
        ))}
      </div>

      {/* Reports list */}
      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("noReports")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* Creation link */}
                  <div className="mb-2 flex items-center gap-2">
                    {report.creation ? (
                      <Link
                        href={`/c/${report.creation.id}`}
                        className="truncate text-sm font-semibold text-gray-900 hover:underline dark:text-white"
                      >
                        {report.creation.title}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-400">{t("deletedCreation")}</span>
                    )}
                    {statusBadge(report.status)}
                  </div>

                  {/* Reason */}
                  <div className="mb-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="rounded bg-gray-100 px-2 py-0.5 font-medium dark:bg-gray-800">
                      {reasonLabel(report.reason)}
                    </span>
                    <span>{t("reportedBy")} {report.reporter?.nickname ?? "Anonymous"}</span>
                    <span>{new Date(report.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* Description */}
                  {report.description && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {report.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-1.5">
                  {report.status === "pending" && (
                    <button
                      onClick={() => updateStatus(report.id, "reviewed")}
                      className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30"
                    >
                      {t("markReviewed")}
                    </button>
                  )}
                  {report.status !== "resolved" && (
                    <button
                      onClick={() => updateStatus(report.id, "resolved")}
                      className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-600 transition hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/30"
                    >
                      {t("markResolved")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
