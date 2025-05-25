import { LinkedInProfile, LinkedInCompany } from './types.ts';

// Mock LinkedIn Profile Data
export const mockLinkedInProfile: LinkedInProfile = {
  id: "john-doe-123",
  name: "John Doe",
  city: "San Francisco",
  country_code: "US",
  about: "Experienced software engineer passionate about building scalable web applications. 5+ years in full-stack development with expertise in React, Node.js, and cloud technologies.",
  posts: [
    {
      title: "Excited to share our latest product launch!",
      attribution: "John Doe",
      img: "https://example.com/post-image-1.jpg",
      link: "https://linkedin.com/posts/john-doe-123/activity-1",
      interaction: "125 likes, 23 comments",
      id: "post-1"
    },
    {
      title: "Great insights from the tech conference today",
      attribution: "John Doe",
      img: null,
      link: "https://linkedin.com/posts/john-doe-123/activity-2",
      interaction: "89 likes, 15 comments",
      id: "post-2"
    }
  ],
  current_company: {
    link: "https://linkedin.com/company/techcorp",
    name: "TechCorp Inc.",
    company_id: "techcorp-123"
  },
  experience: "Senior Software Engineer at TechCorp Inc. (2021-Present), Software Engineer at StartupXYZ (2019-2021)",
  url: "https://linkedin.com/in/john-doe-123",
  educations_details: "Computer Science, Stanford University",
  education: [
    {
      title: "Master of Science in Computer Science",
      url: "https://stanford.edu",
      start_year: "2017",
      end_year: "2019",
      description: "Specialized in Machine Learning and Distributed Systems",
      description_html: "<p>Specialized in Machine Learning and Distributed Systems</p>",
      institute_logo_url: "https://example.com/stanford-logo.png"
    }
  ],
  volunteer_experience: [
    {
      cause: "Education",
      duration: "2 years",
      duration_short: "2y",
      end_date: "2023-12",
      start_date: "2021-01",
      subtitle: "Code for Good",
      title: "Volunteer Coding Instructor"
    }
  ],
  honors_and_awards: [
    {
      title: "Employee of the Year",
      publication: "TechCorp Inc.",
      date: "2023",
      description: "Recognized for outstanding contribution to product development"
    }
  ],
  location: "San Francisco, CA",
  activity: [
    {
      interaction: "liked",
      link: "https://linkedin.com/posts/activity-1",
      title: "AI trends in 2024",
      img: "https://example.com/activity-1.jpg",
      id: "activity-1"
    }
  ],
  current_company_company_id: "techcorp-123",
  current_company_name: "TechCorp Inc."
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