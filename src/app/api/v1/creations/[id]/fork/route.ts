import { authenticate, jsonSuccess, jsonError, supabaseAdmin } from "@/lib/api/middleware";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;

  const { data: origRaw } = await supabaseAdmin
    .from("creations")
    .select("*")
    .eq("id", id)
    .single();

  const original = origRaw as any;
  if (!original) return jsonError(404, "Creation not found");

  const { data: forkedRaw, error } = await supabaseAdmin
    .from("creations")
    .insert({
      title: original.title,
      description: original.description,
      category: original.category,
      sub_category: original.sub_category,
      file_url: original.file_url,
      thumbnail_url: original.thumbnail_url,
      tools: original.tools,
      ai_model: original.ai_model,
      license: original.license,
      visibility: "public",
      user_id: auth.userId,
    } as any)
    .select("id, title, category, created_at")
    .single();

  const forked = forkedRaw as any;
  if (error || !forked) return jsonError(500, error?.message ?? "Fork failed");

  await supabaseAdmin.from("forks").insert({
    original_creation_id: id,
    forked_creation_id: forked.id,
  } as any);

  const { data: tagRows } = await supabaseAdmin
    .from("creation_tags")
    .select("tag_id")
    .eq("creation_id", id);
  const tags = (tagRows ?? []) as any[];
  if (tags.length > 0) {
    await supabaseAdmin.from("creation_tags").insert(
      tags.map((t: any) => ({ creation_id: forked.id, tag_id: t.tag_id })) as any
    );
  }

  if (original.user_id !== auth.userId) {
    await supabaseAdmin.from("notifications").insert({
      user_id: original.user_id,
      actor_id: auth.userId,
      type: "fork",
      creation_id: id,
    } as any);
  }

  return jsonSuccess(forked);
}
