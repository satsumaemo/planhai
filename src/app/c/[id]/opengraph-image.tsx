import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const alt = "Planhai Creation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: creation } = await supabase
    .from("creations")
    .select("title, description, category, thumbnail_url, like_count, view_count, profiles:user_id(nickname, avatar_url)")
    .eq("id", id)
    .single();

  const title = creation?.title ?? "Planhai Creation";
  const description = creation?.description?.slice(0, 120) ?? "";
  const category = creation?.category ?? "";
  const profile = creation?.profiles as any;
  const authorName = profile?.nickname ?? "Anonymous";
  const likes = creation?.like_count ?? 0;
  const views = creation?.view_count ?? 0;
  const thumbnailUrl = creation?.thumbnail_url;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          padding: "48px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Thumbnail area */}
        {thumbnailUrl && (
          <div
            style={{
              width: "440px",
              height: "534px",
              borderRadius: "16px",
              overflow: "hidden",
              display: "flex",
              flexShrink: 0,
              marginRight: "48px",
            }}
          >
            <img
              src={thumbnailUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        )}

        {/* Text area */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* Category badge */}
          {category && (
            <div
              style={{
                display: "flex",
                marginBottom: "16px",
              }}
            >
              <span
                style={{
                  backgroundColor: "rgba(255,255,255,0.15)",
                  color: "#94a3b8",
                  padding: "6px 16px",
                  borderRadius: "999px",
                  fontSize: "20px",
                  fontWeight: 600,
                }}
              >
                {category}
              </span>
            </div>
          )}

          {/* Title */}
          <h1
            style={{
              fontSize: thumbnailUrl ? "40px" : "52px",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.2,
              marginBottom: "16px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            {title}
          </h1>

          {/* Description */}
          {description && (
            <p
              style={{
                fontSize: "22px",
                color: "#94a3b8",
                lineHeight: 1.5,
                marginBottom: "24px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {description}
            </p>
          )}

          {/* Author & Stats */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              marginTop: "auto",
            }}
          >
            <span style={{ fontSize: "22px", color: "#e2e8f0", fontWeight: 600 }}>
              {authorName}
            </span>
            <span style={{ fontSize: "20px", color: "#64748b" }}>
              {views.toLocaleString()} views
            </span>
            <span style={{ fontSize: "20px", color: "#64748b" }}>
              {likes.toLocaleString()} likes
            </span>
          </div>

          {/* Branding */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: "24px",
            }}
          >
            <span
              style={{
                fontSize: "28px",
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.5px",
              }}
            >
              Planhai
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
