import { Hono } from 'jsr:@hono/hono'
import type { Context } from 'jsr:@hono/hono'
import { createCorsMiddleware } from "../_shared/cors.ts"

const app = new Hono()

// Apply CORS middleware
app.use('/agent-api/*', createCorsMiddleware())


// Route: Create Call Pack
app.post('/agent-api/create-call-pack', async (c: Context) => {
  
  const payload = await c.req.json()

  const { url } = payload as { url?: string }
  if (!url) {
    console.error('Missing url in payload');
    return c.json({ error: '`url` is required' }, 400)
  }

  try {
    return c.json({ data: 'success' }, 201);
  } catch (err: any) {
    console.error('Bright Data API error:', err);
    return c.json({ 
      error: err.message, 
      status: err.status, 
      details: err.details 
    }, 502);
  }
})


export default app