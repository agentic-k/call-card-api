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
  LANGSMITH_CALL_TEMPLATE_CREATE_TEMPLATE_ASSISTANT_ID,
  LANGSMITH_CALL_CARD_LEAD_SCORING_ASSISTANT_ID
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
  
  // Warn if lead scoring assistant ID is missing but don't throw error
  if (!LANGSMITH_CALL_CARD_LEAD_SCORING_ASSISTANT_ID) {
    console.warn('LANGSMITH_CALL_CARD_LEAD_SCORING_ASSISTANT_ID is not set. Lead scoring functionality will use mock data.')
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

/**
 * Run a LangSmith assistant based on the specified mode
 * @param threadId - The thread ID to run the assistant on
 * @param input - The input data for the assistant
 * @param mode - The assistant mode to use ('create-template' or 'lead-scoring')
 * @returns The assistant response
 */
export function runAssistant(
  threadId: string, 
  input: Record<string, unknown>, 
  mode: 'create-template' | 'lead-scoring' = 'create-template'
) {
  let assistantId: string;
  
  switch (mode) {
    case 'lead-scoring':
      if (!LANGSMITH_CALL_CARD_LEAD_SCORING_ASSISTANT_ID) {
        throw new Error('LANGSMITH_CALL_CARD_LEAD_SCORING_ASSISTANT_ID is not set');
      }
      assistantId = LANGSMITH_CALL_CARD_LEAD_SCORING_ASSISTANT_ID;
      console.log(`Using lead-scoring assistant: ${assistantId}`);
      break;
    
    case 'create-template':
    default:
      assistantId = LANGSMITH_CALL_TEMPLATE_CREATE_TEMPLATE_ASSISTANT_ID;
      console.log(`Using create-template assistant: ${assistantId}`);
      break;
  }
  
  return lsFetch(
    `/threads/${threadId}/runs/wait`,
    {
      method: 'POST',
      body: JSON.stringify({
        assistant_id: assistantId,
        input: input
      })
    }
  );
}

// --------------------
// Response Processors
// --------------------
export function processApiResponse(template: APIResponse): MeetingTemplate {
  return {
    id: uuidv4(),
    name: template.name,
    description: template.description,
    useCases: template.useCases.map(useCase => ({
      id: uuidv4(),
      title: useCase.title,
      description: useCase.description,
      questions: useCase.questions.map(q => ({
        id: uuidv4(),
        text: q.text,
        checked: false
      }))
    })),
    painPoints: template.painPoints.map(painPoint => ({
      id: uuidv4(),
      title: painPoint.title,
      description: painPoint.description,
      questions: painPoint.questions.map(q => ({
        id: uuidv4(),
        text: q.text,
        checked: false
      }))
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

/**
 * Process lead scoring response from LangSmith
 * 
 * This function converts the raw input or response from LangSmith into the expected LeadScoringResponse format
 * 
 * @param rawResponse - The raw response from LangSmith
 * @returns A properly formatted LeadScoringResponse object
 */
export function processLeadScoringResponse(rawResponse: Record<string, unknown>) {
  // If we get back the input payload, we need to transform it
  if (rawResponse.framework && Array.isArray(rawResponse.questions) && typeof rawResponse.questions[0] === 'string') {
    // This is the input payload, not the expected response
    // Transform it into the expected format
    const framework = rawResponse.framework;
    const questions = rawResponse.questions.map((q: string) => {
      return {
        question: q,
        status: "unanswered" as "unanswered" | "answered_by_buyer" | "answered_via_confirmation" | "partial_or_unclear",
        asked: false,
        confidence: 0.0,
        evidence: "Question not analyzed in transcript",
        turn_ids: [] as number[]
      };
    });

    // Check if any questions were asked in the transcript
    const transcriptData = rawResponse.transcript as { turns?: Array<{ text: string, speaker: string }> };
    if (transcriptData?.turns) {
      const transcript = transcriptData.turns.map((t) => t.text).join(' ').toLowerCase();
      
      // Simple matching to see if any questions appear in the transcript
      questions.forEach((q) => {
        const questionWords = q.question.toLowerCase().split(' ');
        const significantWords = questionWords.filter((w: string) => w.length > 4);
        
        // Check if significant words from the question appear in the transcript
        const matchCount = significantWords.filter((word: string) => transcript.includes(word)).length;
        const matchRatio = matchCount / significantWords.length;
        
        if (matchRatio > 0.5) {
          q.asked = true;
          q.status = "partial_or_unclear" as const;
          q.confidence = 0.6;
          q.evidence = "Question appears to have been discussed in the transcript";
        }
      });
    }

    return {
      framework,
      questions,
      nextBestQuestions: [],
      summary: "Automated analysis based on transcript content"
    };
  }
  
  // If we already have the expected format, return it as is
  if (rawResponse.framework && 
      Array.isArray(rawResponse.questions) && 
      rawResponse.questions.length > 0 && 
      typeof rawResponse.questions[0] === 'object' &&
      'status' in rawResponse.questions[0]) {
    return rawResponse;
  }
  
  // If we have a message format, try to extract the response
  const messages = rawResponse.messages as Array<{content: string | Record<string, unknown>}> | undefined;
  if (messages && messages.length > 0) {
    try {
      const lastMessage = messages[messages.length - 1];
      const content = typeof lastMessage.content === 'string' 
        ? JSON.parse(lastMessage.content) 
        : lastMessage.content;
        
      if (content.framework && Array.isArray(content.questions)) {
        return content;
      }
    } catch (error) {
      console.error('Error parsing message content:', error);
    }
  }
  
  // If we can't determine the format, throw an error
  throw new Error('Unable to process lead scoring response: Invalid format');
}
