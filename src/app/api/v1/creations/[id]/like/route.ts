import { authenticate, jsonSuccess, jsonError, supabaseAdmin } from "@/lib/api/middleware";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;

  const { data: creationRaw } = await supabaseAdmin
    .from("creations")
    .select("id, user_id")
    .eq("id", id)
    .single();

  const creation = creationRaw as any;
  if (!creation) return jsonError(404, "Creation not found");

  const { data: existingRaw } = await supabaseAdmin
    .from("likes")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("creation_id", id)
    .maybeSingle();

  const existing = existingRaw as any;
  if (existing) {
    await supabaseAdmin.from("likes").delete().eq("id", existing.id);
    return jsonSuccess({ liked: false });
  }

  await supabaseAdmin.from("likes").insert({
    user_id: auth.userId,
    creation_id: id,
  } as any);

  if (creation.user_id !== auth.userId) {
    await supabaseAdmin.from("notifications").insert({
      user_id: creation.user_id,
      actor_id: auth.userId,
      type: "like",
      creation_id: id,
    } as any);
  }

  return jsonSuccess({ liked: true });
}
