import { Hono } from 'jsr:@hono/hono'
import { cors } from 'jsr:@hono/hono/cors'
import type { Context } from 'jsr:@hono/hono'

// IMPORT Shared 
import { getSupabaseUserClient, getUserFromContext } from '../_libs/supabase.ts'
import { corsHeaders } from '../_libs/cors.ts'

const app = new Hono()

// Apply CORS to all routes
app.use('/store-google-refresh-token', cors(corsHeaders))

app.post('/store-google-refresh-token', async (c: Context) => {
  try {
    const user = await getUserFromContext(c)
    if (!user) {
      return c.json({ error: 'User not authenticated' }, 401)
    }

    const { refreshToken } = await c.req.json()
    if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.trim() === '') {
      return c.json({ error: 'A valid refreshToken is required' }, 400)
    }

    const supabase = getSupabaseUserClient(c)

    const { data, error } = await supabase
      .from('user_google_tokens')
      .upsert({
        user_id: user.id,
        refresh_token: refreshToken
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting refresh token:', error)
      return c.json({ error: error.message }, 500)
    }

    return c.json({ success: true, data }, 200)

  } catch (error) {
    console.error('Error in store-google-refresh-token function:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return c.json({ error: errorMessage }, 500)
  }
})

export default app 