import { Hono } from 'jsr:@hono/hono'
import { cors } from 'jsr:@hono/hono/cors'
import type { Context } from 'jsr:@hono/hono'

// IMPORT Shared 
import { getSupabaseUserClient, getUserFromContext } from '../_libs/supabase.ts'
import { corsHeaders } from '../_libs/cors.ts'

const app = new Hono()

// Apply CORS to all routes including both /callcard and /callcard/:id
app.use('/callcard/*', cors(corsHeaders))

app.get('/callcard', async (c: Context) => {
  const supabase = getSupabaseUserClient(c)
  const user = await getUserFromContext(c)
  if (!user) return c.json({ error: 'User not found' }, 404)
  

  const { data, error } = await supabase
    .from('callcard')
    .select('*')
    .eq('user_id', user.id);
  if (error) return c.json({ error: error.message }, 404)
  return c.json(data)
})

// todo: add middleware to check if user is authenticated and add user_id to payload
app.get('/callcard/:id', async (c: Context) => {
  const id = c.req.param('id')
  const supabase = getSupabaseUserClient(c)
  
  // Get User from Context
  const user = await getUserFromContext(c)
  if (!user) return c.json({ error: 'User not found' }, 404)

  const { data, error } = await supabase
    .from('callcard')
    .select('*')
    .eq('callcard_id', id)
    .eq('user_id', user.id)
    .single();

  if (error) return c.json({ error: error.message }, 404)
  return c.json(data)
})

// todo: add middleware to check if user is authenticated and add user_id to payload
app.post('/callcard', async (c: Context) => {
  try {
    const payload = await c.req.json()
    console.log('Received payload:', JSON.stringify(payload, null, 2))
    const supabase = getSupabaseUserClient(c)

    // Get User from Context
    const user = await getUserFromContext(c)
    if (!user) {
      console.log('User not found in context')
      return c.json({ error: 'User not found' }, 404)
    }
    console.log('User found:', user.id)

    // Validate required fields
    if (!payload.callcard_name) {
      console.log('Missing required field: callcard_name')
      return c.json({ error: 'callcard_name is required' }, 400)
    }
    
    if (!payload.person_name) {
      console.log('Missing required field: person_name')
      return c.json({ error: 'person_name is required' }, 400)
    }

  // Set default values and merge with payload
  const templateData = {
    ...payload,
    user_id: user.id
    // Removed is_default_template as it doesn't exist in the callcard table
  }

  try {
    console.log('Inserting callcard with data:', JSON.stringify(templateData, null, 2))
    
    const { data, error } = await supabase
      .from('callcard')
      .insert(templateData)
      .select()
      .single();
    
    if (error) {
      console.error('Database error:', error)
      return c.json({ error: error.message, details: error }, 400)
    }
    
    console.log('Callcard created successfully:', data)
    return c.json(data, 201)
  } catch (err) {
    console.error('Unexpected error in callcard creation:', err)
    return c.json({ error: 'Unexpected error during callcard creation', details: String(err) }, 500)
  }
} catch (outerErr) {
  console.error('Outer error in callcard endpoint:', outerErr)
  return c.json({ error: 'Unexpected error processing request', details: String(outerErr) }, 500)
}
})

app.put('/callcard/:id', async (c: Context) => {
  try {
    const id = c.req.param('id')
    const payload = await c.req.json()
    console.log('Received update payload:', JSON.stringify(payload, null, 2))
    
    const supabase = getSupabaseUserClient(c)
    
    // Get User from Context
    const user = await getUserFromContext(c)
    if (!user) {
      console.log('User not found in context')
      return c.json({ error: 'User not found' }, 404)
    }
    console.log('User found:', user.id)

    // First check if the callcard belongs to the user
    const { data: existingCallCard, error: callCardError } = await supabase
      .from('callcard')
      .select('*')
      .eq('callcard_id', id)
      .eq('user_id', user.id)
      .single();
    
    if (callCardError) {
      console.log('CallCard not found or access denied:', callCardError)
      return c.json({ error: 'CallCard not found or access denied' }, 404)
    }
    console.log('Found existing callcard:', existingCallCard)

    // Validate required fields if they are being updated
    if (payload.callcard_name === '') {
      console.log('Validation error: callcard_name cannot be empty')
      return c.json({ error: 'callcard_name cannot be empty' }, 400)
    }
    if (payload.person_name === '') {
      console.log('Validation error: person_name cannot be empty')
      return c.json({ error: 'person_name cannot be empty' }, 400)
    }

    // Prepare update data
    const updateData = {
      ...payload,
      updated_at: new Date().toISOString()
    }
    console.log('Prepared update data:', JSON.stringify(updateData, null, 2))

    // Update the callcard
    const { data, error } = await supabase
      .from('callcard')
      .update(updateData)
      .eq('callcard_id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating callcard:', error)
      return c.json({ error: error.message, details: error }, 400)
    }
    
    console.log('CallCard updated successfully:', data)
    return c.json(data)
  } catch (err) {
    console.error('Unexpected error in callcard update:', err)
    return c.json({ error: 'Unexpected error during callcard update', details: String(err) }, 500)
  }
});

app.delete('/callcard/:id', async (c: Context) => {
  const id = c.req.param('id')
  const supabase = getSupabaseUserClient(c)
  
  // Get User from Context
  const user = await getUserFromContext(c)
  if (!user) return c.json({ error: 'User not found' }, 404)

  // First check if the template belongs to the user
  const { data: _template, error: templateError } = await supabase
    .from('callcard')
    .select('callcard_id')
    .eq('callcard_id', id)
    .eq('user_id', user.id)
    .single();
  
  if (templateError) return c.json({ error: 'Template not found or access denied' }, 404)

  const { error } = await supabase
    .from('callcard')
    .delete()
    .eq('callcard_id', id)
    .eq('user_id', user.id)
    
  if (error) return c.json({ error: error.message }, 400)
  return c.json({ success: true })
})

export default app