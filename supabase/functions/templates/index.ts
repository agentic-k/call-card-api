import { Hono } from 'jsr:@hono/hono'
import { cors } from 'jsr:@hono/hono/cors'
import type { Context } from 'jsr:@hono/hono'

// IMPORT Shared 
import { getSupabaseClient, getUserFromContext } from '../_shared/supabase.ts'
import { corsHeaders } from '../_shared/cors.ts'

const app = new Hono()

// Apply CORS to all routes including both /templates and /templates/:id
app.use('/templates/*', cors(corsHeaders))

app.get('/templates', async (c: Context) => {
  const supabase = getSupabaseClient(c)
  const user = await getUserFromContext(c)
  if (!user) return c.json({ error: 'User not found' }, 404)
  

  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('user_id', user.id);
  if (error) return c.json({ error: error.message }, 404)
  return c.json(data)
})

// todo: add middleware to check if user is authenticated and add user_id to payload
app.get('/templates/:id', async (c: Context) => {
  const id = c.req.param('id')
  const supabase = getSupabaseClient(c)
  
  // Get User from Context
  const user = await getUserFromContext(c)
  if (!user) return c.json({ error: 'User not found' }, 404)

  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('template_id', id)
    .eq('user_id', user.id)
    .single();

  if (error) return c.json({ error: error.message }, 404)
  return c.json(data)
})

// todo: add middleware to check if user is authenticated and add user_id to payload
app.post('/templates', async (c: Context) => {
  const payload = await c.req.json()
  const supabase = getSupabaseClient(c)

  // Get User from Context
  const user = await getUserFromContext(c)
  if (!user) return c.json({ error: 'User not found' }, 404)

  const { data, error } = await supabase
    .from('templates')
    .insert({
      ...payload,
      user_id: user.id
    })
    .select()
    .single();

  console.log('data', data)
  
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data, 201)
})

app.put('/templates/:id', async (c: Context) => {
  const id = c.req.param('id')
  const payload = await c.req.json()
  const supabase = getSupabaseClient(c)
  
  // Get User from Context
  const user = await getUserFromContext(c)
  if (!user) return c.json({ error: 'User not found' }, 404)

  // First check if the template belongs to the user
  const { data: template, error: templateError } = await supabase
    .from('templates')
    .select('template_id')
    .eq('template_id', id)
    .eq('user_id', user.id)
    .single();
  
  if (templateError) return c.json({ error: 'Template not found or access denied' }, 404)

  // Update the template
  const { data, error } = await supabase
    .from('templates')
    .update(payload)
    .eq('template_id', id)
    .eq('user_id', user.id)
    .select()
    .single()
    
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

app.delete('/templates/:id', async (c: Context) => {
  const id = c.req.param('id')
  const supabase = getSupabaseClient(c)
  
  // Get User from Context
  const user = await getUserFromContext(c)
  if (!user) return c.json({ error: 'User not found' }, 404)

  // First check if the template belongs to the user
  const { data: template, error: templateError } = await supabase
    .from('templates')
    .select('template_id')
    .eq('template_id', id)
    .eq('user_id', user.id)
    .single();
  
  if (templateError) return c.json({ error: 'Template not found or access denied' }, 404)

  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('template_id', id)
    .eq('user_id', user.id)
    
  if (error) return c.json({ error: error.message }, 400)
  return c.json({ success: true })
})

export default app
