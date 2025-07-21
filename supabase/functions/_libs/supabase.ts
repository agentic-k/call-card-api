// functions/_libs/supabase.ts
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.49.4';
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import type { Context } from '@hono/hono'

/**
 * Returns a Supabase client instance with the service_role_key
 * for admin-level operations. Bypasses RLS.
 */
export function getSupabaseServiceRoleClient<Database>(): SupabaseClient<Database> {
  return createClient<Database>(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

/**
 * Returns a Supabase client instance that forwards the incoming
 * Authorization header (JWT) for RLS.
 */
export function getSupabaseUserClient(c: Context): SupabaseClient {
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
  const supabase = getSupabaseUserClient(c)
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()
  if (error) {
    throw new Error(`Auth error: ${error.message}`)
  }
  return user
}
