import { createClient } from "@/lib/supabase/server";
import HomeFeed from "@/components/home/HomeFeed";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <HomeFeed userId={user?.id ?? null} />;
}
