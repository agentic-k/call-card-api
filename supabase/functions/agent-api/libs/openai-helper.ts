import OpenAI from 'jsr:@openai/openai';

// --------------------
// Environment Variables
// --------------------
const { OPENAI_API_KEY } = Deno.env.toObject()

// --------------------
// Types for OpenAI Analysis
// --------------------
export interface QuestionInput {
  id: string;
  text: string;
}

export interface AnalysisResponse {
  question_id: string;
  question: string;
  question_asked: boolean;
  topic_discussed: boolean;
}

export interface TranscriptAnalysisRequest {
  transcript: string;
  questions: QuestionInput[];
}

export interface TranscriptAnalysisResult {
  responses: AnalysisResponse[];
}

// --------------------
// Environment Validation
// --------------------
export function validateOpenAIEnv() {
  if (!OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY environment variable');
  }
}

// --------------------
// OpenAI Client Instance
// --------------------
function createOpenAIClient(): OpenAI {
  validateOpenAIEnv();
  return new OpenAI({
    apiKey: OPENAI_API_KEY!,
  });
}

// --------------------
// Analysis Helpers
// --------------------
export async function analyzeTranscriptQuestions(
  transcript: string, 
  questions: QuestionInput[]
): Promise<TranscriptAnalysisResult> {
  if (!transcript || !Array.isArray(questions)) {
    throw new Error('Transcript and questions are required');
  }

  // Filter out invalid questions and add defensive checks
  const validQuestions = questions.filter(q => 
    q && 
    typeof q.id === 'string' && 
    typeof q.text === 'string' && 
    q.text.trim().length > 0
  );

  if (validQuestions.length === 0) {
    throw new Error('No valid questions provided');
  }

  const openai = createOpenAIClient();
  
  const systemPrompt = `You are an assistant that analyzes a sales‑call transcript for the sales rep. Identify and list "topics / questions" from a sales call transcript of a customer call and determine which of these "topics / questions" have been asked.\n`
    + `For each question object, determine:\n`
    + `- question_asked: true or false (boolean)\n`
    + `- topic_discussed: true or false (boolean)\n`
    + `\n`
    + `Output: a pure JSON array of objects, each with:\n`
    + `- "question_id" (string): matches the input question's id\n`
    + `- "question" (string): the question text\n`
    + `- "question_asked" (boolean): true or false\n`
    + `- "topic_discussed" (boolean): true or false\n`
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
                  "type": "boolean",
                  "description": "Whether the question was asked"
                },
                "topic_discussed": {
                  "type": "boolean",
                  "description": "Whether the topic was at least discussed"
                },
              },
              "required": [
                "question_id",
                "question",
                "question_asked",
                "topic_discussed",
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
    + `${validQuestions.map(q => `{"id":"${q.id}","text":"${(q.text || '').replace(/"/g, '\\"')}"}`).join(",\n")}\n`
    + `\`\`\`\n`;

  try {
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

    // Parse the JSON response and return the object
    try {
      return JSON.parse(reply) as TranscriptAnalysisResult;
    } catch (parseError) {
      console.error('[analyzeTranscriptQuestions] Error parsing OpenAI response:', parseError);
      throw new Error('Failed to parse OpenAI analysis response');
    }
  } catch (error) {
    console.error('[analyzeTranscriptQuestions] Error:', error);
    throw error;
  }
}

// --------------------
// Response Processor
// --------------------
export function processAnalysisResponse(openaiResponse: string): TranscriptAnalysisResult {
  try {
    return JSON.parse(openaiResponse) as TranscriptAnalysisResult;
  } catch (error) {
    console.error('[processAnalysisResponse] Error parsing OpenAI response:', error);
    throw new Error('Failed to parse OpenAI analysis response');
  }
} 