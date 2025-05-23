import OpenAI from 'jsr:@openai/openai';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { Hono } from 'jsr:@hono/hono';
import { cors } from 'jsr:@hono/hono/cors';

console.log(`Hello: Function "openai" up and running with Hono!`);

// Define custom context type
type Variables = {
  user: any;
};

const app = new Hono<{ Variables: Variables }>();

// Configure CORS
app.use('*', cors({
  origin: '*',
  allowHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type'],
}));

// Helper function to check user authentication
async function checkUser(token: string | null) {
  if (!token) {
    console.error('No authentication token provided');
    return null;
  }

  // Create a Supabase client configured to use the provided token
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '', // Use anon key for client-side checks
    {
      global: {
        headers: { Authorization: `Bearer ${token}` }, // Pass token in Authorization header format
      },
    }
  );

  // Verify the session using the token
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

  if (sessionError || !session) {
    console.error('Session error or no session found:', sessionError?.message || 'No session');
    // Optionally try getUser if getSession fails but a token exists
    // This might happen depending on Supabase client library versions or specific auth flows
    const { data: { user: userFromGetUser }, error: getUserError } = await supabaseClient.auth.getUser();
    if (getUserError || !userFromGetUser) {
      console.error('Attempt to getUser also failed:', getUserError?.message || 'No user');
      return null;
    }
    console.log('Session check failed, but getUser succeeded for user:', userFromGetUser.id);
    return userFromGetUser; // Return user found via getUser
  }

  // Get the user details from the validated session
  // Note: Often getSession is sufficient, but getUser confirms details
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    console.error('User error or no user found even with valid session:', userError?.message || 'No user');
    return null;
  }

  console.log('Authenticated user:', user.id);
  return user;
}

// Authentication middleware
app.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader ? authHeader.replace('Bearer ', '') : null;
  const user = await checkUser(token);
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  // Add user to the context
  c.set('user', user);
  await next();
});

// Main route for analyzing transcripts
app.post('/', async (c) => {
  try {
    const payload = await c.req.json();
    const transcript = payload.transcript || '';
    const questions = payload.questions || [];

    if (!transcript || !Array.isArray(questions)) {
      return c.json({ error: 'Transcript and questions are required' }, 400);
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }

    const openai = new OpenAI({
      apiKey,
    });

    const systemPrompt = `You are an assistant that analyzes a sales‑call transcript for the sales rep. Identify and list "topics / questions" from a sales call transcript of a customer call and determine which of these "topics / questions" have been asked.\n`
    + `For each question object, determine:\n`
    + `- question_asked: "Yes" or "No"\n`
    + `- topic_discussed: "Yes" or "No"\n`
    + `- answer_reference: exact timestamp(s) or transcript line(s), or empty string\n`
    + `\n`
    + `Output: a pure JSON array of objects, each with:\n`
    + `- "question_id" (string): matches the input question's id\n`
    + `- "question" (string): the question text\n`
    + `- "question_asked" (string): "Yes" or "No"\n`
    + `- "topic_discussed" (string): "Yes" or "No"\n`
    + `- "answer_reference" (string): timestamp(s) or empty\n`
    + `Do not output anything else.\n`;

    const responseFormat = {
      "type": "json_schema" as const,
      "json_schema": {
        "name": "analyze_questions_response",
        "strict": true,
        "schema": {
          "type": "object",
          "properties": {
            "responses": {
              "type": "array",
              "description": "List of analyzed question responses",
              "items": {
                "type": "object",
                "properties": {
                  "question_id": {
                    "type": "string",
                    "description": "Matches the input question's id"
                  },
                  "question": {
                    "type": "string",
                    "description": "The text of the question/topic"
                  },
                  "question_asked": {
                    "type": "string",
                    "enum": [
                      "Yes",
                      "No"
                    ],
                    "description": "Whether the question was asked"
                  },
                  "topic_discussed": {
                    "type": "string",
                    "enum": [
                      "Yes",
                      "No"
                    ],
                    "description": "Whether the topic was at least discussed"
                  },
                  "answer_reference": {
                    "type": "string",
                    "description": "Exact timestamp(s) or transcript line(s) where the question was answered, or empty string"
                  }
                },
                "required": [
                  "question_id",
                  "question",
                  "question_asked",
                  "topic_discussed",
                  "answer_reference"
                ],
                "additionalProperties": false
              }
            }
          },
          "required": [
            "responses"
          ],
          "additionalProperties": false
        }
      }
    };

    const userPrompt = `Transcript:\n`
    + `\`\`\`\n`
    + `${transcript}\n`
    + `\`\`\`\n`
    + `Questions/Topics (with IDs):\n`
    + `\`\`\`\n`
    + `${questions.map(q => `{"id":"${q.id}","text":"${q.text.replace(/"/g, '\"')}"}`).join(",\n")}\n`
    + `\`\`\`\n`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      response_format: responseFormat,
      temperature: 0,
      max_completion_tokens: 4000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const reply = response.choices[0].message?.content;

    if (!reply) {
      throw new Error('OpenAI did not return a reply');
    }

    return c.json({ questions: reply });
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

// Handle OPTIONS requests for CORS preflight
app.options('*', (c) => {
  return c.text('ok');
});

// Export for Deno to serve
Deno.serve(app.fetch);