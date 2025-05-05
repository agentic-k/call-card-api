import { createClient } from 'jsr:@supabase/supabase-js@2'
import type { Context } from 'jsr:@hono/hono'

export function getSupabaseClient(c: Context) {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: {
          // forward the incoming JWT for RLS
          Authorization: c.req.header('Authorization')!
        }
      }
    }
  )
}

export async function getUserFromContext(c: Context) {
  const supabase = getSupabaseClient(c)
  const { data, error } = await supabase.auth.getUser()
  if (error) return c.json({ error: error.message }, 401)
  return data.user
}
