import { Hono } from 'jsr:@hono/hono'
import type { Context } from 'jsr:@hono/hono'
import { createCorsMiddleware } from '../_shared/cors.ts'
import type { AITemplateRequest } from './libs/types.ts'
import { 
  validateEnv, 
  createThread, 
  runAssistant, 
  processApiResponse 
} from './libs/langmsmith-helper.ts'

import {
  validateOpenAIEnv,
  analyzeTranscriptQuestions,
  type QuestionInput
} from './libs/openai-helper.ts'

// Validate environment variables
validateEnv()
validateOpenAIEnv()

const app = new Hono()

// --------------------
// 2) Global Middlewares
// --------------------
app.use('/agent-api/*', createCorsMiddleware())

// --------------------
// Create-Call-Pack Route
// --------------------
app.post('/agent-api/create-call-pack', async (c: Context) => {
  const payload = await c.req.json() as AITemplateRequest

  try {
    const threadId = await createThread()
    const assistantRes = await runAssistant(threadId, payload)
    const lastMsg = assistantRes.messages.slice(-1)[0]
    const apiResp = JSON.parse(lastMsg.content)
    const meeting = processApiResponse(apiResp)

    return c.json(meeting)
  } catch (err: any) {
    console.error('🛑 Template generation error:', err)
    return c.json({ error: err.message }, 502)
  }
})

// --------------------
// OpenAI Transcript Analysis Route
// --------------------
/**
 * @param transcript - The transcript of the call
 * @param questions - The questions to check if they were answered
 * @returns The analysis result
 */
app.post('/agent-api/check-answered-questions', async (c) => {
  try {
    const payload = await c.req.json();
    const transcript = payload.transcript || '';
    const questions: QuestionInput[] = payload.questions || [];
    const analysisResult = await analyzeTranscriptQuestions(transcript, questions);
    
    return c.json({ questions: analysisResult });
  } catch (error) {
    console.error('Error in function:', error);
    // Type check the error before accessing properties
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const status = error instanceof Error && 
      (error.message === 'Missing Authorization header' || error.message === 'Unauthorized') 
      ? 401 : 500;

    return c.json({ error: errorMessage }, status);
  }
});

export default app
