import { LinkedInProfile, LinkedInCompany, BrightDataError, ScrapedDataResponse } from './types.ts';

// Transform LinkedIn profile data
export function transformLinkedInProfileData(rawData: any): LinkedInProfile | null {
  if (!rawData?.data) return null;

  const profileData = rawData.data;
  
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

// Transform LinkedIn company data
export function transformLinkedInCompanyProfileData(rawData: any): LinkedInCompany | null {
  if (!rawData?.data) return null;

  const companyData = rawData.data;
  
  return {
    id: companyData.id || null,
    name: companyData.name || null,
    about: companyData.about || null,
    unformatted_about: companyData.unformatted_about || null,
    description: companyData.description || null,
    slogan: companyData.slogan || null,
    company_size: companyData.company_size || null,
    organization_type: companyData.organization_type || null,
    industries: companyData.industries || null,
    website: companyData.website || null,
    website_simplified: companyData.website_simplified || null,
    crunchbase_url: companyData.crunchbase_url || null,
    company_id: companyData.company_id || null,
    url: companyData.url || null,
    followers: companyData.followers || null,
    employees_in_linkedin: companyData.employees_in_linkedin || null,
    locations: Array.isArray(companyData.locations) ? companyData.locations : [],
    funding: companyData.funding ? {
      last_round_date: companyData.funding.last_round_date || null,
      last_round_type: companyData.funding.last_round_type || null,
      rounds: companyData.funding.rounds || null,
      last_round_raised: companyData.funding.last_round_raised || null
    } : null,
    investors: Array.isArray(companyData.investors) ? companyData.investors : [],
    timestamp: companyData.timestamp || null
  };
}

// Fetch data from Bright Data API
export async function fetchBrightData(url: string, datasetId: string): Promise<ScrapedDataResponse> {
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

    throw new BrightDataError(
      'Failed to fetch data',
      502,
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}
