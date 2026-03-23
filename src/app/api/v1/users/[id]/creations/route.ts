import { authenticate, jsonSuccess, jsonError, supabaseAdmin } from "@/lib/api/middleware";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;

  const { id: userId } = await params;
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  let query = supabaseAdmin
    .from("creations")
    .select("id, title, description, category, thumbnail_url, like_count, view_count, created_at")
    .eq("user_id", userId)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;
  if (error) return jsonError(500, error.message);

  const rows = (data ?? []) as any[];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1]?.created_at : null;

  return jsonSuccess(items, nextCursor);
}
