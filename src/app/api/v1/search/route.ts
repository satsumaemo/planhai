import { authenticate, jsonSuccess, jsonError, supabaseAdmin, getSupabaseAdmin } from "@/lib/api/middleware";
import { calculateActivityScore, calculateProfileCompleteness } from "@/lib/activityScore";

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const category = searchParams.get("category");
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  if (!q) return jsonError(400, "q (query) parameter is required");

  let query = supabaseAdmin
    .from("creations")
    .select("id, title, description, category, thumbnail_url, like_count, view_count, created_at, user_id, profiles:user_id(id, nickname, avatar_url, bio, website)")
    .eq("visibility", "public")
    .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    .limit(200);

  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return jsonError(500, error.message);

  const rows = (data ?? []) as any[];

  // Compute per-creator aggregates for activity score
  const creatorMap = new Map<string, { uploads: number; likesReceived: number; profile: any }>();
  for (const row of rows) {
    const uid = row.user_id;
    if (!creatorMap.has(uid)) {
      creatorMap.set(uid, { uploads: 0, likesReceived: 0, profile: row.profiles });
    }
    const entry = creatorMap.get(uid)!;
    entry.uploads += 1;
    entry.likesReceived += (row.like_count ?? 0);
  }

  // Score and sort by view_count + activity score
  const scored = rows.map((row) => {
    const creator = creatorMap.get(row.user_id);
    const profile = creator?.profile ?? {};
    const activityScore = calculateActivityScore({
      uploadCount: creator?.uploads ?? 0,
      likesReceived: creator?.likesReceived ?? 0,
      forkCount: 0,
      profileCompleteness: calculateProfileCompleteness(profile),
    });
    return {
      ...row,
      _score: (row.view_count ?? 0) + activityScore,
    };
  });

  scored.sort((a, b) => b._score - a._score);
  const items = scored.slice(0, limit).map(({ _score, user_id, ...rest }) => rest);
  const nextCursor = items.length === limit ? items[items.length - 1]?.id : null;

  return jsonSuccess(items, nextCursor);
}
