import { Hono } from 'jsr:@hono/hono'
import type { Context } from 'jsr:@hono/hono'
import { createCorsMiddleware } from "../_shared/cors.ts"
import { v4 as uuidv4 } from 'npm:uuid'

// Types for meeting templates
interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface MeetingSection {
  id: string;
  title: string;
  durationMinutes: number;
  questions: ChecklistItem[];
}

interface MeetingTemplate {
  id: string;
  name: string;
  description: string;
  totalDurationMinutes: number;
  sections: MeetingSection[];
  createdAt: string;
  updatedAt: string;
}

interface AITemplateRequest {
  templateContext: string;
  linkedinProfileData?: any;
  linkedinCompanyData?: any;
  companyName?: string;
}

interface APIResponse {
  name: string;
  description: string;
  totalDurationMinutes: number;
  sections: Array<{
    title: string;
    durationMinutes: number;
    questions: Array<{
      text: string;
    }>;
  }>;
}

const app = new Hono()

// Apply CORS middleware
app.use('/agent-api/*', createCorsMiddleware())


// Helper function to process API response and add required IDs
const processApiResponse = (template: APIResponse): MeetingTemplate => {
  const processedTemplate: MeetingTemplate = {
    id: uuidv4(),
    name: template.name,
    description: template.description,
    totalDurationMinutes: template.totalDurationMinutes,
    sections: template.sections.map(section => ({
      id: uuidv4(),
      title: section.title,
      durationMinutes: section.durationMinutes,
      questions: section.questions.map(question => ({
        id: uuidv4(),
        text: question.text,
        checked: false
      }))
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return processedTemplate;
};

// Route: Generate Meeting Template
app.post('/agent-api/create-call-pack', async (c: Context) => {
  const payload = await c.req.json()
  const { templateContext, linkedinProfileData, linkedinCompanyData, companyName } = 
    payload as AITemplateRequest

    if (!linkedinProfileData && !linkedinCompanyData && !templateContext) {
      // validation logic, such that either one of [linkedinProfileData or linkedinCompanyData] is present or templateContext is present
      return c.json({ error: 'At least one of `linkedinProfileData` or `linkedinCompanyData` or `templateContext` is required' }, 400)
    }


  try {
    // In the future, this would call an AI agent with the context data
    // For now, return mock data for testing
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock API response
    const mockApiResponse: APIResponse = {
      name: `AI Template: ${templateContext}`,
      description: `AI-generated template for: ${templateContext} (30 Minutes Total)`,
      totalDurationMinutes: 30,
      sections: [
        {
          title: "Introduction and Rapport Building",
          durationMinutes: 3,
          questions: [
            {
              text: "Thank you for taking the time to speak with me today. How are things going in your industry right now?"
            },
            {
              text: "I've reviewed your company's recent initiatives, and I'm excited to discuss how our solutions can support your goals."
            }
          ]
        },
        {
          title: "Needs Assessment and Qualification",
          durationMinutes: 5,
          questions: [
            {
              text: "Can you share some of the challenges you're currently facing with your existing software solutions?"
            },
            {
              text: "Who else would be involved in the decision-making process for this project?"
            },
            {
              text: "What is your timeline for implementing a new solution?"
            },
            {
              text: "Do you have a budget range in mind for this project?"
            }
          ]
        },
        {
          title: "Solution Presentation",
          durationMinutes: 8,
          questions: [
            {
              text: "Our software typically helps companies like yours achieve a X% improvement in [specific metric] within [timeframe]."
            },
            {
              text: "Here's how we differentiate from other solutions in the market..."
            },
            {
              text: "Let me share a quick success story: [Brief case study relevant to the client's industry]."
            }
          ]
        },
        {
          title: "Objection Handling and ROI Discussion",
          durationMinutes: 5,
          questions: [
            {
              text: "What concerns do you have about implementing a new software solution?"
            },
            {
              text: "Many of our clients initially had concerns about [common objection], but found that [solution]."
            },
            {
              text: "Considering the potential improvements, how do you see this impacting your bottom line?"
            }
          ]
        },
        {
          title: "Closing and Next Steps",
          durationMinutes: 4,
          questions: [
            {
              text: "Based on what we've discussed, do you see enough value to move forward with a trial or demo?"
            },
            {
              text: "What would be the best next step for us to take together?"
            },
            {
              text: "Can we schedule a follow-up meeting to discuss this with your team?"
            }
          ]
        },
        {
          title: "Wrap-Up and Follow-Up",
          durationMinutes: 2,
          questions: [
            {
              text: "I'll follow up with an email summarizing our conversation and the agreed next steps."
            },
            {
              text: "Thank you again for your time and consideration. I look forward to our next conversation."
            }
          ]
        }
      ]
    };

    // Add context to the response for debugging
    const context = {
      linkedinProfileData,
      linkedinCompanyData,
      companyName
    };

    // Process the API response to add required IDs
    const template = processApiResponse(mockApiResponse);
    
    return c.json({ 
      template,
      context // Include the context that would be sent to the AI agent
    }, 201);
  } catch (err: any) {
    console.error('Error generating template:', err);
    return c.json({ 
      error: err.message, 
      status: err.status || 500, 
      details: err.details 
    }, 502);
  }
})

export default app