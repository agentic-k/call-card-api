import { v4 as uuidv4 } from 'npm:uuid'
import type { APIResponse, MeetingTemplate } from './types.ts'

// --------------------
// Environment Variables
// --------------------
// NOTE: When running Supabase functions locally, use host.docker.internal instead of 
// 127.0.0.1 or localhost in LANGSMITH_API_URL to connect to services running on host machine
// Example: http://host.docker.internal:2024 instead of http://127.0.0.1:2024

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
    const url = `${LANGSMITH_API_URL}${path}`;
    const res = await fetch(url, {
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
    const data = await lsFetch('/threads', {
      method: 'POST',
      body: JSON.stringify({
        metadata: {},
        if_exists: "raise"
      })
    });

    if (data.error || !data.thread_id) {
      throw new Error(data.error || 'No thread ID in response');
    }

    return data.thread_id;
  } catch (error) {
    console.error('[createThread] Error:', error instanceof Error ? error.message : error);
    throw new Error('Failed to create thread');
  }
}

export function runAssistant(threadId: string, input: Record<string, unknown>) {
  return lsFetch(
    `/threads/${threadId}/runs/wait`,
    {
      method: 'POST',
      body: JSON.stringify({
        assistant_id: LANGSMITH_CALL_TEMPLATE_CREATE_TEMPLATE_ASSISTANT_ID,
        input: input
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
