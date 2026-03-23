import { authenticate, jsonSuccess, jsonError, supabaseAdmin } from "@/lib/api/middleware";

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => null);
  if (!body || !body.title || !body.category) {
    return jsonError(400, "title and category are required");
  }

  const { data: dataRaw, error } = await supabaseAdmin
    .from("creations")
    .insert({
      title: body.title,
      description: body.description ?? null,
      category: body.category,
      sub_category: body.sub_category ?? null,
      file_url: body.file_url ?? null,
      thumbnail_url: body.thumbnail_url ?? null,
      tools: body.tools ?? null,
      ai_model: body.ai_model ?? null,
      demo_url: body.demo_url ?? null,
      license: body.license ?? null,
      visibility: body.visibility ?? "public",
      user_id: auth.userId,
    } as any)
    .select("id, title, category, sub_category, visibility, created_at")
    .single();

  const data = dataRaw as any;
  if (error) return jsonError(500, error.message);

  // Tags
  if (Array.isArray(body.tags) && body.tags.length > 0) {
    const tags = body.tags.slice(0, 5);
    await (supabaseAdmin.from("tags") as any).upsert(
      tags.map((name: string) => ({ name })),
      { onConflict: "name" }
    );
    const { data: tagRows } = await supabaseAdmin
      .from("tags")
      .select("id, name")
      .in("name", tags);
    if (tagRows) {
      await supabaseAdmin.from("creation_tags").insert(
        tagRows.map((t: any) => ({ creation_id: data.id, tag_id: t.id })) as any
      );
    }
  }

  return jsonSuccess(data);
}
