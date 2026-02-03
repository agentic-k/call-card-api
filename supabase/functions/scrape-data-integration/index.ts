import { Hono } from 'jsr:@hono/hono'
import type { Context } from 'jsr:@hono/hono'
import { createCorsMiddleware } from "../_libs/cors.ts"
import { 
  BrightDataError, 
  RequestPayload 
} from './libs/types.ts'
import { 
  fetchBrightData, 
  transformLinkedInProfileData, 
  transformLinkedInCompanyProfileData 
} from './libs/helper.ts'
import { 
  mockLinkedInProfile, 
  mockLinkedInCompany, 
} from './libs/mock-data.ts'

const app = new Hono()

// Apply CORS middleware
app.use('/scrape-data-integration/*', createCorsMiddleware())

// Environment config
const USE_MOCK_DATA=  Deno.env.get('USE_MOCK_DATA') === 'true';

// Dataset IDs - Load from environment variables
// Set these in your Supabase project settings:
// LINKEDIN_PROFILE_DATASET_ID=your_dataset_id
// LINKEDIN_COMPANY_DATASET_ID=your_dataset_id
const LINKEDIN_PROFILE_DATASET_ID = Deno.env.get('LINKEDIN_PROFILE_DATASET_ID') || 'your_linkedin_profile_dataset_id'
const LINKEDIN_COMPANY_DATASET_ID = Deno.env.get('LINKEDIN_COMPANY_DATASET_ID') || 'your_linkedin_company_dataset_id'

// Route: LinkedIn Profile
app.post('/scrape-data-integration/linkedin-profile', async (c: Context) => {
  const payload = await c.req.json()
  const { url } = payload as RequestPayload

  if (!url) {
    console.error('Missing url in payload');
    return c.json({ error: '`url` is required' }, 400)
  }

  // Return mock data for UI development
  if (USE_MOCK_DATA) {
    console.log('🎭 Using mock data for LinkedIn profile');
    return c.json({ data: mockLinkedInProfile }, 200);
  }

  try {
    const scraped = await fetchBrightData(url, LINKEDIN_PROFILE_DATASET_ID);
    const transformedData = transformLinkedInProfileData(scraped);
    
    if (!transformedData) {
      return c.json({ 
        error: 'No profile data found or invalid response structure',
        status: 404
      }, 404);
    }
    
    return c.json({ data: transformedData }, 201);
  } catch (err: any) {
    console.error('Bright Data API error:', err);
    if (err instanceof BrightDataError) {
      const statusCode = 502;
      return c.json({ 
        error: err.message, 
        status: err.status, 
        details: err.details 
      }, statusCode);
    }
    return c.json({ error: 'Internal server error', status: 500 }, 500);
  }
})

// Route: LinkedIn Company Profile
app.post('/scrape-data-integration/linkedin-company-profile', async (c: Context) => {
  const payload = await c.req.json()
  const { url } = payload as RequestPayload

  if (!url) {
    console.error('Missing url in payload');
    return c.json({ error: '`url` is required' }, 400)
  }

  // Return mock data for UI development
  if (USE_MOCK_DATA) {
    console.log('🎭 Using mock data for LinkedIn company');
    return c.json({ data: mockLinkedInCompany }, 200);
  }

  try {
    const scraped = await fetchBrightData(url, LINKEDIN_COMPANY_DATASET_ID);
    const transformedCompanyData = transformLinkedInCompanyProfileData(scraped);
    
    if (!transformedCompanyData) {
      return c.json({ 
        error: 'No company data found or invalid response structure',
        status: 404
      }, 404);
    }
    
    return c.json({ data: transformedCompanyData }, 201);
  } catch (err: any) {
    console.error('Bright Data API error:', err);
    if (err instanceof BrightDataError) {
      const statusCode = 502;
      return c.json({ 
        error: err.message, 
        status: err.status, 
        details: err.details 
      }, statusCode);
    }
    return c.json({ error: 'Internal server error', status: 500 }, 500);
  }
})

export default app