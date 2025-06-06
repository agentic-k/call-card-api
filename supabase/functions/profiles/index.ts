import { Hono } from 'jsr:@hono/hono'
import { cors } from 'jsr:@hono/hono/cors'
import type { Context } from 'jsr:@hono/hono'
import { getSupabaseClient, getUserFromContext } from '../_shared/supabase.ts'

// IMPORT Shared 
import { corsHeaders } from '../_shared/cors.ts'

const app = new Hono()

// Apply CORS to all routes including both /profiles/*
app.use('/profiles/*', cors(corsHeaders))

app.get('/profiles', async (c: Context) => {
  const supabase = getSupabaseClient(c)
  const user = await getUserFromContext(c)
  if (!user) return c.json({ error: 'User not found' }, 404)

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (error) return c.json({ error: error.message }, 404)
  return c.json(data)
})

app.post('/profiles', async (c: Context) => {
  const payload = await c.req.json()
  const supabase = getSupabaseClient(c)
  const user = await getUserFromContext(c)
  if (!user) return c.json({ error: 'User not found' }, 404)
    
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      ...payload
    })
    .single()
  if (error) return c.json({ error: error.message }, 400)
  return c.json({ 
    success: true, 
    message: 'Profile created successfully', 
    data 
  }, 201)
})

app.put('/profiles', async (c: Context) => {
  const payload = await c.req.json()
  const supabase = getSupabaseClient(c)
  const user = await getUserFromContext(c)
  if (!user) return c.json({ error: 'User not found' }, 404)

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', user.id)
    .single()
  if (error) return c.json({ error: error.message }, 400)
  return c.json({ 
    success: true, 
    message: 'Profile updated successfully', 
    data 
  }, 200)
})

export default app
