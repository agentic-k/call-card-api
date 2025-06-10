import { LinkedInProfile, LinkedInCompany } from './types.ts';

// Mock LinkedIn Profile Data
export const mockLinkedInProfile: LinkedInProfile = {
  id: "gentilello",
  name: "Lawrence Gentilello",
  city: "San Francisco, California, United States",
  country_code: "US",
  about: "Lawrence is CEO and Founder of Optery (Y Combinator W22, StartX F21), whose mission is to…",
  posts: [],
  current_company: {
    link: "https://www.linkedin.com/company/optery?trk=public_profile_topcard-current-company",
    name: "Optery",
    company_id: "optery"
  },
  experience: null,
  url: "https://www.linkedin.com/in/gentilello/",
  educations_details: "Stanford University",
  volunteer_experience: [],
  location: "San Francisco",
  current_company_company_id: "optery",
  current_company_name: "Optery"
};

// Mock LinkedIn Company Data
export const mockLinkedInCompany: LinkedInCompany = {
  id: "techcorp-123",
  name: "TechCorp Inc.",
  about: "Leading technology company focused on innovative software solutions for enterprise clients. We build scalable platforms that help businesses transform digitally.",
  unformatted_about: "Leading technology company focused on innovative software solutions for enterprise clients. We build scalable platforms that help businesses transform digitally.",
  description: "Enterprise Software Solutions",
  slogan: "Transforming Business Through Technology",
  company_size: "201-500 employees",
  organization_type: "Private Company",
  industries: ["Software Development", "Technology", "Enterprise Solutions"],
  website: "https://techcorp.com",
  website_simplified: "techcorp.com",
  crunchbase_url: "https://crunchbase.com/organization/techcorp",
  company_id: "techcorp-123",
  url: "https://linkedin.com/company/techcorp",
  followers: 15420,
  employees_in_linkedin: 387,
  locations: [
    "San Francisco, CA",
    "New York, NY",
    "Austin, TX"
  ],
  funding: {
    last_round_date: "2023-06-15",
    last_round_type: "Series B",
    rounds: 3,
    last_round_raised: "$25M"
  },
  investors: [
    "Venture Capital Partners",
    "Tech Investment Fund",
    "Innovation Capital"
  ],
  timestamp: "2024-01-15T10:30:00Z"
};

// Mock API Response Helper
export function createMockResponse(data: any) {
  return {
    success: true,
    data: data,
    message: 'Mock data returned for development'
  };
} 