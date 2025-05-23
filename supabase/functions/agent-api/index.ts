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

// Validate environment variables
validateEnv()

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

export default app
