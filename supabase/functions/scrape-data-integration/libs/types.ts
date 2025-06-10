// LinkedIn Profile Types
export interface LinkedInProfile {
  id: string | null;
  name: string | null;
  city: string | null;
  country_code: string | null;
  about: string | null;
  posts: Post[];
  current_company: Company | null;
  experience: any;
  url: string | null;
  educations_details: any;
  volunteer_experience: VolunteerExperience[];
  location: string | null;
  current_company_company_id: string | null;
  current_company_name: string | null;
}

export interface Post {
  title: string | null;
  attribution: string | null;
  img: string | null;
  link: string | null;
  interaction: string | null;
  id: string | null;
}

export interface Company {
  link: string | null;
  name: string | null;
  company_id: string | null;
}

export interface Education {
  title: string | null;
  url: string | null;
  start_year: string | null;
  end_year: string | null;
  description: string | null;
  description_html: string | null;
  institute_logo_url: string | null;
}

export interface VolunteerExperience {
  cause: string | null;
  duration: string | null;
  duration_short: string | null;
  end_date: string | null;
  start_date: string | null;
  subtitle: string | null;
  title: string | null;
}

export interface Award {
  title: string | null;
  publication: string | null;
  date: string | null;
  description: string | null;
}

export interface Activity {
  interaction: string | null;
  link: string | null;
  title: string | null;
  img: string | null;
  id: string | null;
}

// LinkedIn Company Types
export interface LinkedInCompany {
  id: string | null;
  name: string | null;
  about: string | null;
  unformatted_about: string | null;
  description: string | null;
  slogan: string | null;
  company_size: string | null;
  organization_type: string | null;
  industries: any;
  website: string | null;
  website_simplified: string | null;
  crunchbase_url: string | null;
  company_id: string | null;
  url: string | null;
  followers: number | null;
  employees_in_linkedin: number | null;
  locations: any[];
  funding: Funding | null;
  investors: any[];
  timestamp: string | null;
}

export interface Funding {
  last_round_date: string | null;
  last_round_type: string | null;
  rounds: number | null;
  last_round_raised: string | null;
}

// API Response Types
export interface ScrapedDataResponse {
  success: boolean;
  data: any;
  message: string;
}

export interface RequestPayload {
  url?: string;
}

// Error Types
export class BrightDataError extends Error {
  constructor(message: string, public status: number, public details?: any) {
    super(message);
    this.name = 'BrightDataError';
  }
}
