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
  
  const systemPrompt = `You are an expert sales call analyst. Your primary function is to evaluate a sales call transcript against a provided sales playbook or call guide. The guide contains key talking points, objectives, and scripts.

You will be given a JSON object with:
1.  A \`transcript\` of the conversation.
2.  An array of \`guide_items\`, each with an \`id\` and a \`text\`. The 'text' represents a talking point, an objective, or a suggested script.

Your core task is to determine if the *intent* behind each guide item was addressed in the call. Sales reps will almost NEVER read a script verbatim; they will rephrase, paraphrase, and adapt the talking points to the flow of the conversation. Your analysis must account for this.

For each \`guide_item\`, you will determine:

1.  \`question_asked\` (boolean):
  * This should be \`true\` ONLY if the item is a literal question (e.g., "What are your challenges?") AND the rep asked a semantically equivalent question to the prospect.
  * For nearly all items that are objectives (e.g., "Objective: Present value prop") or scripts (e.g., "Script: At UpCodes, we..."), this MUST be \`false\`.

2.  \`topic_discussed\` (boolean):
  * This is the most important determination. Set this to \`true\` if the core message, goal, or substance of the guide item was successfully conveyed or discussed by the rep, even if heavily paraphrased.
  * For an "Objective", this is \`true\` if the rep took clear action to achieve that objective.
  * For a "Script", this is \`true\` if the rep communicated the key informational points from the script in their own words.

---
CRITICAL EXAMPLE:

* Guide Item (Script): \`{ "id": "value-prop-script", "text": "Script: At UpCodes, we understand the challenges architectural firms face... Our platform offers a centralized database of over 5 million code sections... which can significantly reduce the time and effort your team spends on code research." }\`

* Sample Transcript Snippet: \`"Yeah, so we know it's a huge pain for architects to keep track of all the different regulations. That's why we built our platform—it pulls everything together. We have over 5 million code sections, all centralized, so your team isn't spending hours hunting down documents anymore."\`

* Correct Analysis: The rep did not read the script word-for-word. However, they successfully delivered the core message:
  1.  Understood the challenge (keeping track of regulations).
  2.  Presented the solution (a centralized platform).
  3.  Included the key data point (5 million sections).
  4.  Stated the benefit (not spending hours on research).
Therefore, the topic was discussed. The script itself is not a question, so \`question_asked\` is false.

* Expected Output for this Item: \`{ "question_id": "value-prop-script", "question": "Script: At UpCodes, we understand...", "question_asked": false, "topic_discussed": true }\`
  
Guideline:
- Do not output anything else.
  `;

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
      model: 'gpt-4.1-mini',
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