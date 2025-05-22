// auth.ts `checkUser()` and auth helpers

import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import { config } from "./utils.ts";
import type { User } from "./types.ts";

/**
 * Verify JWT, return User or null
 */
export async function checkUser(token?: string): Promise<User | null> {
  if (!token) return null;

  // 1. Init client once
  const client = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  // 2. Try session
  const { data: sessionRes, error: sessionErr } = await client.auth.getSession();
  if (sessionErr || !sessionRes.session) {
    // 3. Fallback to getUser
    const { data: userRes, error: userErr } = await client.auth.getUser();
    if (userErr || !userRes.user) return null;
    return { id: userRes.user.id, email: userRes.user.email || undefined };
  }

  // 4. Return from session
  const user = sessionRes.session.user;
  return { id: user.id, email: user.email || undefined };
}