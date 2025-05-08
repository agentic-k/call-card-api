import { Hono } from 'jsr:@hono/hono'
import type { Context } from 'jsr:@hono/hono'
import { createCorsMiddleware } from "../_shared/cors.ts"

const app = new Hono()

// Apply CORS middleware
app.use('/agent-api/*', createCorsMiddleware())


// Route: Create Call Pack
app.post('/agent-api/create-call-pack', async (c: Context) => {
  
  const payload = await c.req.json()
  const { linkedinProfileData, linkedinCompanyData, companyName } = 
    payload as { linkedinProfileData?: any, linkedinCompanyData?: any, companyName?: string }

  if (!linkedinProfileData || !linkedinCompanyData) {
    console.error('Both linkedinProfileData and linkedinCompanyData are missing in payload');
    return c.json({ error: 'At least one of `linkedinProfileData` or `linkedinCompanyData` is required' }, 400)
  }

  // TODO : Add logic to call Langsmith Agent to create call-pack

  try {
    return c.json({ data: [
      linkedinProfileData,
      linkedinCompanyData,
      companyName
    ] }, 201);
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