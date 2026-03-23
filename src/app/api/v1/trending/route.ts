import { authenticate, jsonSuccess, jsonError, supabaseAdmin, getSupabaseAdmin } from "@/lib/api/middleware";
import { calculateActivityScore, calculateProfileCompleteness } from "@/lib/activityScore";

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  let query = supabaseAdmin
    .from("creations")
    .select("id, title, description, category, thumbnail_url, like_count, view_count, created_at, user_id, profiles:user_id(id, nickname, avatar_url, bio, website)")
    .eq("visibility", "public");

  if (category) query = query.eq("category", category);

  const { data, error } = await query.limit(200);
  if (error) return jsonError(500, error.message);

  const rows = (data ?? []) as any[];

  // Compute per-creator aggregate stats for activity score
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

  // Fetch fork counts per creator
  const creatorIds = [...creatorMap.keys()];
  const forkCounts = new Map<string, number>();
  if (creatorIds.length > 0) {
    const { data: forkData } = await getSupabaseAdmin()
      .from("forks")
      .select("original_id, creations!forks_original_id_fkey(user_id)")
      .in("creations.user_id", creatorIds);

    if (forkData) {
      for (const f of forkData as any[]) {
        const uid = f.creations?.user_id;
        if (uid) forkCounts.set(uid, (forkCounts.get(uid) ?? 0) + 1);
      }
    }
  }

  // Score each creation: base score (view_count) + creator activity score boost
  const scored = rows.map((row) => {
    const creator = creatorMap.get(row.user_id);
    const profile = creator?.profile ?? {};
    const activityScore = calculateActivityScore({
      uploadCount: creator?.uploads ?? 0,
      likesReceived: creator?.likesReceived ?? 0,
      forkCount: forkCounts.get(row.user_id) ?? 0,
      profileCompleteness: calculateProfileCompleteness(profile),
    });
    return {
      ...row,
      _score: (row.view_count ?? 0) + activityScore,
    };
  });

  scored.sort((a, b) => b._score - a._score);
  const items = scored.slice(0, limit).map(({ _score, user_id, ...rest }) => rest);
  const nextCursor = items.length === limit ? String(items[items.length - 1]?.view_count) : null;

  return jsonSuccess(items, nextCursor);
}
