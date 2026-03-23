import { authenticate, jsonSuccess, jsonError, supabaseAdmin } from "@/lib/api/middleware";

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const category = searchParams.get("category");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  if (!q) return jsonError(400, "q (query) parameter is required");

  let query = supabaseAdmin
    .from("creations")
    .select("id, title, description, category, thumbnail_url, like_count, view_count, created_at, profiles:user_id(id, nickname, avatar_url)")
    .eq("visibility", "public")
    .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    .order("view_count", { ascending: false })
    .limit(limit + 1);

  if (category) query = query.eq("category", category);
  if (cursor) query = query.gt("id", cursor);

  const { data, error } = await query;
  if (error) return jsonError(500, error.message);

  const rows = (data ?? []) as any[];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1]?.id : null;

  return jsonSuccess(items, nextCursor);
}
