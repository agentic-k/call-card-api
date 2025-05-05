import { Hono } from 'jsr:@hono/hono'
import type { Context } from 'jsr:@hono/hono'
import { getSupabaseClient } from '../_shared/supabase.ts'

const app = new Hono()

app.get('/profiles/:id', async (c: Context) => {
  const id = c.req.param('id')
  const supabase = getSupabaseClient(c)
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return c.json({ error: error.message }, 404)
  return c.json(data)
})

app.post('/profiles', async (c: Context) => {
  const payload = await c.req.json()
  const supabase = getSupabaseClient(c)
  const { data, error } = await supabase
    .from('profiles')
    .insert(payload)
    .single()
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data, 201)
})

app.put('/profiles/:id', async (c: Context) => {
  const id = c.req.param('id')
  const payload = await c.req.json()
  const supabase = getSupabaseClient(c)
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', id)
    .single()
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

app.delete('/profiles/:id', async (c: Context) => {
  const id = c.req.param('id')
  const supabase = getSupabaseClient(c)
  const { error } = await supabase.from('profiles').delete().eq('id', id)
  if (error) return c.json({ error: error.message }, 400)
  return c.json({ success: true })
})

export default app
