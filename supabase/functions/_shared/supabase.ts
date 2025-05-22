// functions/_shared/supabase.ts
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2.49.4'
import type { Context } from 'jsr:@hono/hono'

/**
 * Returns a Supabase client instance that forwards the incoming
 * Authorization header (JWT) for RLS.
 */
export function getSupabaseClient(c: Context): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: {
          Authorization: c.req.header('Authorization')!
        }
      }
    }
  )
}

/**
 * Convenience: fetches the authenticated user from Supabase Auth.
 */
export async function getUserFromContext(c: Context) {
  const supabase = getSupabaseClient(c)
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()
  if (error) {
    throw new Error(`Auth error: ${error.message}`)
  }
  return user
}


// TODO: Add a middleware that returns user Id