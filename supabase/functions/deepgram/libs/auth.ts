// auth.ts
import { createClient } from "jsr:@supabase/supabase-js@2.49.4";
import { User } from "./types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_URL or SUPABASE_ANON_KEY is not set");
}

/**
 * Verifies a Supabase JWT from Sec-WebSocket-Protocol
 */
export async function checkUser(token: string | null): Promise<User | null> {
  if (!token) {
    console.warn("No authentication token provided");
    return null;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // Use getUser for server-side verification :contentReference[oaicite:3]{index=3}
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Authentication failed:", userError?.message);
    return null;
  }

  console.info("Authenticated user:", user.id);
  return user;
}
