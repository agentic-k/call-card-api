import { Hono } from 'jsr:@hono/hono'
import type { Context } from 'jsr:@hono/hono'
import { createCorsMiddleware } from '../_libs/cors.ts'
import type { AITemplateRequest } from './libs/types.ts'
import { 
  validateEnv, 
  createThread, 
  runAssistant, 
  processApiResponse,
  processLeadScoringResponse
} from './libs/langmsmith-helper.ts'

import {
  validateOpenAIEnv
} from './libs/openai-helper.ts'

import type { LeadScoringRequest } from './libs/types.ts'

// Validate environment variables
validateEnv()
validateOpenAIEnv()

const app = new Hono()

// ---------------------------------------------------------------------------------------------------- //
// 2) Global Middlewares
// ---------------------------------------------------------------------------------------------------- //
app.use('/agent-api/*', createCorsMiddleware())

/**
 * @deprecated 'just remove this route'
 */
// ---------------------------------------------------------------------------------------------------- //
// Create-Call-Pack Route
// ---------------------------------------------------------------------------------------------------- //
app.post('/agent-api/create-call-pack', async (c: Context) => {
  const payload = await c.req.json() as AITemplateRequest
  
  if (!payload.prospectLinkedinUrl || !payload.prospectCompanyUrl || !payload.clientCompanyUrl) {
    return c.json({ error: 'Missing required fields: prospectLinkedinUrl, prospectCompanyUrl, and clientCompanyUrl' }, 400);
  }

  const agentPayload = {
    "template_context": payload.callCardContext,
    "linkedin_profile_url": payload.prospectLinkedinUrl,
    "prospect_company_url": payload.prospectCompanyUrl,
    "client_company_url": payload.clientCompanyUrl,
  };

  try {
    const threadId = await createThread()
    const assistantRes = await runAssistant(threadId, agentPayload, 'create-template')

    if (!assistantRes || !assistantRes.messages || assistantRes.messages.length === 0) {
      throw new Error('Failed to get a valid response from the AI agent.');
    }

    const lastMsg = assistantRes.messages.slice(-1)[0]
    const apiResp = JSON.parse(lastMsg.content)
    const meeting = processApiResponse(apiResp)

    return c.json(meeting)
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Unknown error occurred' }, 502)
  }
})

// ---------------------------------------------------------------------------------------------------- //
// OpenAI Transcript Analysis Route - REMOVED
// ---------------------------------------------------------------------------------------------------- //

// ---------------------------------------------------------------------------------------------------- //
// Lead Scoring Route
// ---------------------------------------------------------------------------------------------------- //
app.post('/agent-api/lead-scoring', async (c) => {
  try {
    const payload = await c.req.json() as LeadScoringRequest
    
    if (!payload.framework || !payload.questions || !payload.transcript) {
      return c.json({ error: 'Missing required fields: framework, questions, and transcript' }, 400);
    }
    
    // Check if lead scoring assistant ID is configured
    if (!Deno.env.get('LANGSMITH_CALL_CARD_LEAD_SCORING_ASSISTANT_ID')) {
      return c.json({ error: 'Lead scoring assistant ID not configured' }, 503);
    }

    try {
      const threadId = await createThread()
      // Convert payload to Record<string, unknown> to satisfy type constraints
      const assistantPayload = {
        framework: payload.framework,
        questions: payload.questions,
        transcript: payload.transcript
      } as Record<string, unknown>
      const assistantRes = await runAssistant(threadId, assistantPayload, 'lead-scoring')

      // Process the response using our helper function
      try {
        const processedResponse = processLeadScoringResponse(assistantRes);
        return c.json(processedResponse);
      } catch (parseError) {
        throw new Error('Failed to process lead scoring response');
      }
    } catch (err: unknown) {
      return c.json({ 
        error: 'Lead scoring analysis failed', 
        details: err instanceof Error ? err.message : 'Unknown error' 
      }, 502);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return c.json({ error: errorMessage }, 500);
  }
});

export default app
