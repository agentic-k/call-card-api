import OpenAI from 'jsr:@openai/openai';
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log(`Helloo: Function "openai" up and running!`)

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function checkUser(token: string | null) {
  if (!token) {
    console.error('No authentication token provided');
    return null;
  }

  // Create a Supabase client configured to use the provided token
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '', // Use anon key for client-side checks
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


// const testAsnwer = "{\"responses\":[{\"id\":\"174fe2a6-89b9-41e0-b698-9791135b510c\",\"question\":\"Thank you for taking the time to speak with me today. How are things going in your industry right now?\",\"answered\":\"No\",\"topicDiscussed\":\"No\",\"answerReference\":\"\"},{\"id\":\"569e0e8c-9f2a-462b-bba1-0caf3ea8a3b8\",\"question\":\"I've reviewed your company's recent initiatives, and I'm excited to discuss how our solutions can support your goals.\",\"answered\":\"No\",\"topicDiscussed\":\"No\",\"answerReference\":\"\"},{\"id\":\"87f3e532-9d08-4a30-b477-fe5d51192b63\",\"question\":\"Can you share some of the challenges you're currently facing with your existing software solutions?\",\"answered\":\"Yes\",\"topicDiscussed\":\"Yes\",\"answerReference\":\"@0:35 - @1:54\"},{\"id\":\"92e6eaa2-72c2-47b2-8d53-ecea043f3eba\",\"question\":\"Who else would be involved in the decision-making process for this project?\",\"answered\":\"No\",\"topicDiscussed\":\"No\",\"answerReference\":\"\"},{\"id\":\"c7119ef5-3e99-4ef3-81eb-13a0d311b4c6\",\"question\":\"What is your timeline for implementing a new solution?\",\"answered\":\"Yes\",\"topicDiscussed\":\"Yes\",\"answerReference\":\"@10:47 - @11:19\"},{\"id\":\"42d3470e-beb1-4114-8ecb-c65883401dec\",\"question\":\"Do you have a budget range in mind for this project?\",\"answered\":\"Yes\",\"topicDiscussed\":\"Yes\",\"answerReference\":\"@6:10 - @7:51\"},{\"id\":\"0974caa3-1d27-4458-8735-cc73479b2b8e\",\"question\":\"Our software typically helps companies like yours achieve a X% improvement in [specific metric] within [timeframe].\",\"answered\":\"No\",\"topicDiscussed\":\"No\",\"answerReference\":\"\"},{\"id\":\"f704fd22-40e6-4633-87b7-4c42b98ac4c0\",\"question\":\"Here's how we differentiate from other solutions in the market...\",\"answered\":\"No\",\"topicDiscussed\":\"No\",\"answerReference\":\"\"},{\"id\":\"34074f05-45be-484e-97bd-edc0e19bc29b\",\"question\":\"Let me share a quick success story: [Brief case study relevant to the client's industry].\",\"answered\":\"Yes\",\"topicDiscussed\":\"Yes\",\"answerReference\":\"@8:14 - @8:40\"},{\"id\":\"b03823ad-79f5-480e-9c34-03fb2055005a\",\"question\":\"What concerns do you have about implementing a new software solution?\",\"answered\":\"Yes\",\"topicDiscussed\":\"Yes\",\"answerReference\":\"@4:33 - @5:00\"},{\"id\":\"e3873770-e893-4fa9-ae7d-88b17f77782e\",\"question\":\"Many of our clients initially had concerns about [common objection], but found that [solution].\",\"answered\":\"No\",\"topicDiscussed\":\"No\",\"answerReference\":\"\"},{\"id\":\"8548204d-0fd6-4dc7-8723-025b9f31c540\",\"question\":\"Considering the potential improvements, how do you see this impacting your bottom line?\",\"answered\":\"No\",\"topicDiscussed\":\"No\",\"answerReference\":\"\"},{\"id\":\"678a3182-7c49-4e64-959b-03b776763520\",\"question\":\"Based on what we've discussed, do you see enough value to move forward with a trial or demo?\",\"answered\":\"No\",\"topicDiscussed\":\"No\",\"answerReference\":\"\"},{\"id\":\"4386937a-3558-4563-adde-2c5e6989b68f\",\"question\":\"What would be the best next step for us to take together?\",\"answered\":\"Yes\",\"topicDiscussed\":\"Yes\",\"answerReference\":\"@10:47 - @11:19\"},{\"id\":\"8222b958-d324-4856-b211-6ce1ebb37a5e\",\"question\":\"Can we schedule a follow-up meeting to discuss this with your team?\",\"answered\":\"No\",\"topicDiscussed\":\"No\",\"answerReference\":\"\"},{\"id\":\"2384d47f-3a04-4cbd-bd00-fc41b18f4f50\",\"question\":\"I'll follow up with an email summarizing our conversation and the agreed next steps.\",\"answered\":\"Yes\",\"topicDiscussed\":\"Yes\",\"answerReference\":\"@11:19\"},{\"id\":\"10e9f35e-e470-4d3e-8291-2d18c4b72d48\",\"question\":\"Thank you again for your time and consideration. I look forward to our next conversation.\",\"answered\":\"No\",\"topicDiscussed\":\"No\",\"answerReference\":\"\"}]}"
// return new Response(JSON.stringify({ questions: testAsnwer }), {
//   headers: {
//     ...corsHeaders,
//     'Content-Type': 'application/json',
//   },
// })

// Define the function
Deno.serve(async (req: Request) => {
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') as string | null

    // Validate user
    const user = await checkUser(token)

    // VALIDATE USER
    // If user is null (invalid/missing token or auth error), return 401
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // User is validated, proceed with POST check and OpenAI logic
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    const payload = await req.json()
    const transcript = payload.transcript || ''
    const questions = payload.questions || []

    if (!transcript || !Array.isArray(questions)) {
      return new Response(JSON.stringify({ error: 'Transcript and questions are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      throw new Error('Missing OPENAI_API_KEY environment variable')
    }

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
    })

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
      store: true
    })

    const reply = response.choices[0].message?.content

    if (!reply) {
      throw new Error('OpenAI did not return a reply')
    }

    return new Response(JSON.stringify({ questions: reply }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Error in function:', error)
    // Type check the error before accessing properties
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const status = error instanceof Error && (error.message === 'Missing Authorization header' || error.message === 'Unauthorized') ? 401 : 500

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    })
  }
})