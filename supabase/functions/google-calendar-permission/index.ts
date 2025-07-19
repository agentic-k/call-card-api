import { Hono } from 'jsr:@hono/hono'
import type { Context } from 'jsr:@hono/hono'
import { createCorsMiddleware } from '../_libs/cors.ts'
import { getSupabaseServiceRoleClient } from '../_libs/supabase.ts'
import type { Database } from '../_libs/types/database.types.ts'

const app = new Hono()

app.use('/google-calendar-permission', createCorsMiddleware())

app.get('/google-calendar-permission', async (c: Context) => {
  try {
    const supabaseAdmin = getSupabaseServiceRoleClient<Database>()
    
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Authorization header is missing' }, 401);
    }

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt)

    if (userError || !user) {
      return c.json({ error: userError?.message || 'User not found or not authenticated' }, 401)
    }

    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('user_google_tokens')
      .select('google_refresh_token')
      .eq('user_id', user.id)
      .single()

    if (tokenError) {
      if (tokenError.code === 'PGRST116') { // No rows found
        return c.json({ status: 'pending' })
      }
      console.error('Database error fetching google token:', tokenError)
      return c.json({ error: `Database error: ${tokenError.message}` }, 500)
    }

    if (tokenData && tokenData.google_refresh_token) {
      return c.json({ status: 'granted' })
    }

    return c.json({ status: 'pending' })

  } catch (error: unknown) {
    console.error('Error in /google-calendar-permission:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return c.json({ error: errorMessage }, 500)
  }
})

export default app 