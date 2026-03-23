import { authenticate, jsonSuccess, jsonError, supabaseAdmin } from "@/lib/api/middleware";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("creations")
    .select("*, profiles:user_id(id, nickname, avatar_url)")
    .eq("id", id)
    .eq("visibility", "public")
    .single();

  if (error || !data) return jsonError(404, "Creation not found");

  return jsonSuccess(data);
}
