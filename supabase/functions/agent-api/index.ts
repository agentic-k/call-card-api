import { Hono } from 'jsr:@hono/hono'
import type { Context } from 'jsr:@hono/hono'
import { createCorsMiddleware } from "../_shared/cors.ts"
import { v4 as uuidv4 } from 'npm:uuid'

// Environment variables for LangSmith
const LANGSMITH_API_KEY = Deno.env.get('LANGSMITH_API_KEY');
const LANGSMITH_API_URL = Deno.env.get('LANGSMITH_API_URL');
const LANGSMITH_CALL_TEMPLATE_CREATE_TEMPLATE_ASSISTANT_ID = Deno.env.get('LANGSMITH_CALL_TEMPLATE_CREATE_TEMPLATE_ASSISTANT_ID');

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

  // if (!linkedinProfileData && !linkedinCompanyData && !templateContext) {
  //   return c.json({ error: 'At least one of `linkedinProfileData` or `linkedinCompanyData` or `templateContext` is required' }, 400)
  // }

  if (!LANGSMITH_API_KEY || !LANGSMITH_API_URL || !LANGSMITH_CALL_TEMPLATE_CREATE_TEMPLATE_ASSISTANT_ID) {
    return c.json({ error: 'Missing required LangSmith environment variables' }, 500)
  }

  try {
    // Create a new thread
    const threadResponse = await fetch(`${LANGSMITH_API_URL}/threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': LANGSMITH_API_KEY
      }
    });

    if (!threadResponse.ok) {
      throw new Error(`Failed to create thread: ${await threadResponse.text()}`);
    }

    const thread = await threadResponse.json();
    const threadId = thread.id;

    // Prepare the context message
    const contextMessage = {
      templateContext,
      linkedinProfileData,
      linkedinCompanyData,
      companyName
    };

    // Create and wait for run
    const runResponse = await fetch(`${LANGSMITH_API_URL}/threads/${threadId}/runs/wait`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': LANGSMITH_API_KEY
      },
      body: JSON.stringify({
        assistant_id: LANGSMITH_CALL_TEMPLATE_CREATE_TEMPLATE_ASSISTANT_ID,
        input: {
          messages: [
            {
              role: "human",
              content: JSON.stringify(contextMessage)
            }
          ]
        }
      })
    });

    if (!runResponse.ok) {
      throw new Error(`Failed to create/wait for run: ${await runResponse.text()}`);
    }

    const agentResponse = await runResponse.json();
    const lastMessage = agentResponse.messages[agentResponse.messages.length - 1];
    
    // Parse the assistant's response and convert it to our template format
    const templateResponse = JSON.parse(lastMessage.content) as APIResponse;
    
    // Process the API response to add required IDs
    const processedTemplate = processApiResponse(templateResponse);
    
    return c.json(processedTemplate);

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