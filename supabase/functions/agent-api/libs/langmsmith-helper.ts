import { v4 as uuidv4 } from 'npm:uuid'
import type { APIResponse, MeetingTemplate } from './types.ts'

// --------------------
// Environment Variables
// --------------------
const {
  LANGSMITH_API_KEY,
  LANGSMITH_API_URL,
  LANGSMITH_CALL_TEMPLATE_CREATE_TEMPLATE_ASSISTANT_ID
} = Deno.env.toObject()

// Validate environment variables
export function validateEnv() {
  if (
    !LANGSMITH_API_KEY ||
    !LANGSMITH_API_URL ||
    !LANGSMITH_CALL_TEMPLATE_CREATE_TEMPLATE_ASSISTANT_ID
  ) {
    throw new Error(
      'Missing one of LANGSMITH_API_KEY, LANGSMITH_API_URL, or LANGSMITH_CALL_TEMPLATE_CREATE_TEMPLATE_ASSISTANT_ID'
    )
  }
}

// --------------------
// LangSmith Fetch Helper
// --------------------
export async function lsFetch(path: string, options: RequestInit = {}) {
  try {
    
    const res = await fetch(`${LANGSMITH_API_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': LANGSMITH_API_KEY!
      },
      ...options
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[lsFetch] ${res.status} error for ${path}: ${errBody}`);
      throw new Error(`LangSmith fetch failed [${path}]: ${errBody}`);
    }
    
    const data = await res.json();
    return data;

  } catch (error) {
    console.error(`[lsFetch] Failed to fetch ${path}:`, error instanceof Error ? error.message : error);
    return { error: 'An error occurred while fetching from Agent' };
  }
}

// --------------------
// Thread + Run Helpers
// --------------------
export async function createThread(): Promise<string> {
  try {
    const response = await lsFetch('/threads', { 
      method: 'POST',
      body: JSON.stringify({}) // Send empty object instead of no body
    });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    if (!response.thread_id) {
      console.error('[createThread] No thread ID in response:', response);
      throw new Error('Failed to create thread: No ID returned');
    }
    
    return response.thread_id;
  } catch (error) {
    console.error('[createThread] Thread creation failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}

export function runAssistant(threadId: string, input: unknown) {
  return lsFetch(
    `/threads/${threadId}/runs/wait`,
    {
      method: 'POST',
      body: JSON.stringify({
        assistant_id: LANGSMITH_CALL_TEMPLATE_CREATE_TEMPLATE_ASSISTANT_ID,
        input: {
          messages: [
            { role: 'human', content: JSON.stringify(input) }
          ]
        }
      })
    }
  );
}

// --------------------
// Response Processor
// --------------------
export function processApiResponse(template: APIResponse): MeetingTemplate {
  return {
    id: uuidv4(),
    name: template.name,
    description: template.description,
    totalDurationMinutes: template.totalDurationMinutes,
    sections: template.sections.map(sec => ({
      id: uuidv4(),
      title: sec.title,
      durationMinutes: sec.durationMinutes,
      questions: sec.questions.map(q => ({
        id: uuidv4(),
        text: q.text,
        checked: false
      }))
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}
