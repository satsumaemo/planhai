import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Use 307 to ensure browser follows redirect immediately
      const redirectUrl = new URL(next, origin);
      return NextResponse.redirect(redirectUrl.toString(), { status: 307 });
    }
  }

  // Also handle token_hash for magic link / email OTP
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any,
    });
    if (!error) {
      const redirectUrl = new URL(next, origin);
      return NextResponse.redirect(redirectUrl.toString(), { status: 307 });
    }
  }

  // Error: redirect to login
  return NextResponse.redirect(`${origin}/login`);
}
