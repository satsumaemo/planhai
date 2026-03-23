import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Supabase admin client (server-side only, bypasses RLS)
// Uses service role key if available, falls back to anon key
let _supabaseAdmin: ReturnType<typeof createClient>;
export function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabaseAdmin;
}

// Rate limiter: 1000 req/hour per API key (lazy init to avoid build errors)
let _ratelimit: Ratelimit | null | undefined;
function getRatelimit(): Ratelimit | null {
  if (_ratelimit !== undefined) return _ratelimit;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url?.startsWith("https://") && token && !token.startsWith("여기")) {
    _ratelimit = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(1000, "1 h"),
      analytics: true,
    });
  } else {
    _ratelimit = null;
  }
  return _ratelimit;
}

export interface AuthResult {
  userId: string;
}

export function jsonSuccess(data: unknown, nextCursor?: string | null) {
  const body: Record<string, unknown> = { data };
  if (nextCursor !== undefined) body.next_cursor = nextCursor;
  return NextResponse.json(body);
}

export function jsonError(code: number, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status: code }
  );
}

/**
 * Authenticate via Bearer token (API key stored in profiles.api_key).
 * Also applies rate limiting.
 */
export async function authenticate(
  request: Request
): Promise<AuthResult | NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonError(401, "Missing or invalid Authorization header. Use: Bearer <api_key>");
  }

  const apiKey = authHeader.slice(7);
  if (!apiKey) {
    return jsonError(401, "API key is empty");
  }

  // Look up user by api_key
  const { data: profileRaw, error } = await getSupabaseAdmin()
    .from("profiles")
    .select("id")
    .eq("api_key", apiKey)
    .maybeSingle();

  const profile = profileRaw as any;
  if (error || !profile) {
    return jsonError(401, "Invalid API key");
  }

  // Rate limit
  const rl = getRatelimit();
  if (rl) {
    const { success, remaining, reset } = await rl.limit(apiKey);
    if (!success) {
      const res = jsonError(429, "Rate limit exceeded. 1,000 requests per hour allowed.");
      res.headers.set("X-RateLimit-Remaining", "0");
      res.headers.set("X-RateLimit-Reset", String(reset));
      return res;
    }
    // We'll set these headers on success responses in the routes if needed
  }

  return { userId: profile.id };
}

// Legacy alias
export const supabaseAdmin = {
  from: (...args: Parameters<ReturnType<typeof createClient>["from"]>) =>
    getSupabaseAdmin().from(...args),
  rpc: (...args: Parameters<ReturnType<typeof createClient>["rpc"]>) =>
    getSupabaseAdmin().rpc(...args),
};
