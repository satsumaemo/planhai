import { authenticate, jsonSuccess, jsonError, supabaseAdmin } from "@/lib/api/middleware";

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  let query = supabaseAdmin
    .from("creations")
    .select("id, title, description, category, thumbnail_url, like_count, view_count, created_at, profiles:user_id(id, nickname, avatar_url)")
    .eq("visibility", "public")
    .order("view_count", { ascending: false })
    .limit(limit + 1);

  if (category) query = query.eq("category", category);
  if (cursor) query = query.lt("view_count", Number(cursor));

  const { data, error } = await query;
  if (error) return jsonError(500, error.message);

  const rows = (data ?? []) as any[];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? String(items[items.length - 1]?.view_count) : null;

  return jsonSuccess(items, nextCursor);
}
