import { Hono } from 'jsr:@hono/hono'
import type { Context } from 'jsr:@hono/hono'
import { getSupabaseClient } from '../_shared/supabase.ts'
import { createCorsMiddleware } from "../_shared/cors.ts"


const app = new Hono()

// Apply CORS middleware
app.use('/scrape-data-integration/*', createCorsMiddleware())

// Custom error types for better error handling
class BrightDataError extends Error {
  constructor(message: string, public status: number, public details?: any) {
    super(message);
    this.name = 'BrightDataError';
  }
}

// Transform the LinkedIn profile data to keep only relevant fields
function transformLinkedInProfileData(rawData: any): any {
  if (!rawData || !rawData.data) {
    return null;
  }

  const profileData = rawData.data;
  
  // Fields to keep in the transformed output
  return {
    id: profileData.id || null,
    name: profileData.name || null,
    city: profileData.city || null,
    country_code: profileData.country_code || null,
    about: profileData.about || null,
    posts: Array.isArray(profileData.posts) ? profileData.posts.map((post: any) => ({
      title: post.title || null,
      attribution: post.attribution || null,
      img: post.img || null,
      link: post.link || null,
      interaction: post.interaction || null,
      id: post.id || null
    })) : [],
    current_company: profileData.current_company ? {
      link: profileData.current_company.link || null,
      name: profileData.current_company.name || null,
      company_id: profileData.current_company.company_id || null
    } : null,
    experience: profileData.experience || null,
    url: profileData.url || null,
    educations_details: profileData.educations_details || null,
    education: Array.isArray(profileData.education) ? profileData.education.map((edu: any) => ({
      title: edu.title || null,
      url: edu.url || null,
      start_year: edu.start_year || null,
      end_year: edu.end_year || null,
      description: edu.description || null,
      description_html: edu.description_html || null,
      institute_logo_url: edu.institute_logo_url || null
    })) : [],
    volunteer_experience: Array.isArray(profileData.volunteer_experience) ? profileData.volunteer_experience.map((exp: any) => ({
      cause: exp.cause || null,
      duration: exp.duration || null,
      duration_short: exp.duration_short || null,
      end_date: exp.end_date || null,
      start_date: exp.start_date || null,
      subtitle: exp.subtitle || null,
      title: exp.title || null
    })) : [],
    honors_and_awards: Array.isArray(profileData.honors_and_awards) ? profileData.honors_and_awards.map((award: any) => ({
      title: award.title || null,
      publication: award.publication || null,
      date: award.date || null,
      description: award.description || null
    })) : [],
    location: profileData.location || null,
    activity: Array.isArray(profileData.activity) ? profileData.activity.map((act: any) => ({
      interaction: act.interaction || null,
      link: act.link || null,
      title: act.title || null,
      img: act.img || null,
      id: act.id || null
    })) : [],
    current_company_company_id: profileData.current_company_company_id || null,
    current_company_name: profileData.current_company_name || null
  };
}

// Shared Bright Data fetch logic
async function fetchBrightData(url: string, datasetId: string) {
  const apiToken = Deno.env.get('BRIGHTDATA_API_TOKEN')!

  if (!datasetId || !apiToken) {
    throw new BrightDataError(
      'Missing required configuration',
      500,
      { missing: !datasetId ? 'datasetId' : 'BRIGHTDATA_API_TOKEN' }
    );
  }

  const endpoint = `https://api.brightdata.com/datasets/v3/scrape?dataset_id=${datasetId}`

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ url }]),
      redirect: "follow"
    });

    if (!response.ok) {
      throw new BrightDataError(
        'Bright Data API request failed',
        response.status,
        { statusText: response.statusText }
      );
    }

    const result = await response.json();
    
    // Handle empty or invalid response data
    if (!result || (Array.isArray(result) && result.length === 0)) {
      console.warn('No data returned from Bright Data API');
      return {
        success: false,
        data: null,
        message: 'No data found for the provided URL'
      };
    }

    return {
      success: true,
      data: result,
      message: 'Data successfully scraped'
    };

  } catch (error: unknown) {
    console.error('Error fetching data:', error);
    
    if (error instanceof BrightDataError) {
      throw error;
    }

    // Handle network or other unexpected errors
    throw new BrightDataError(
      'Failed to fetch data',
      502,
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

// Route: LinkedIn Profile
app.post('/scrape-data-integration/linkedin-profile', async (c: Context) => {
  console.log('▶️ scraping linkedin profile', c.req)
  const linkedinDatasetId = 'gd_l1viktl72bvl7bjuj0';
  
  const payload = await c.req.json()
  console.log('payload', payload)

  const { url } = payload as { url?: string }
  if (!url) {
    console.error('Missing url in payload');
    return c.json({ error: '`url` is required' }, 400)
  }

  try {
    const scraped = await fetchBrightData(url, linkedinDatasetId);
    
    // Transform the scraped data to keep only relevant fields
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
      // Use fixed status code to avoid type errors
      const statusCode = 502; // Default to bad gateway for API errors
      return c.json({ 
        error: err.message, 
        status: err.status, 
        details: err.details 
      }, statusCode);
    }
    return c.json({ error: 'Internal server error', status: 500 }, 500);
  }
})

// Route: Company Profile
app.post('/scrape-data-integration/linkedin-company-profile', async (c: Context) => {
  const companyDatasetId = 'BRIGHTDATA_COMPANY_DATASET_ID'; // Replace with your actual dataset ID
  
  let payload: any
  try {
    payload = await c.req.json()
  } catch (error) {
    console.error('Invalid JSON payload:', error);
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const { url } = payload as { url?: string }
  if (!url) {
    console.error('Missing url in payload');
    return c.json({ error: '`url` is required' }, 400)
  }

  try {
    const scraped = await fetchBrightData(url, companyDatasetId);
    
    // Transform data if needed (you can create a transformLinkedInCompanyData function if necessary)
    
    if (!scraped || !scraped.data) {
      return c.json({ 
        error: 'No company data found or invalid response structure',
        status: 404
      }, 404);
    }
    
    // Store in Supabase
    const supabase = getSupabaseClient(c)
    const { data, error } = await supabase
      .from('scrapte-data-integrations')
      .insert([{ url, type: 'company', scraped_data: scraped.data }])
      .select()
    
    if (error) {
      console.error('Supabase insert error:', error);
      return c.json({ 
        error: 'Failed to store scraped data',
        details: error.message
      }, 400);
    }
    
    return c.json({ data }, 201);
  } catch (err: any) {
    console.error('Bright Data API error:', err);
    if (err instanceof BrightDataError) {
      const statusCode = 502; // Default to bad gateway for API errors
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
