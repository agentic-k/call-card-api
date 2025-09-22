// OpenAI import removed as the related endpoint has been removed

// --------------------
// Environment Variables
// --------------------
const { OPENAI_API_KEY } = Deno.env.toObject()

// --------------------
// OpenAI Environment
// --------------------

// --------------------
// Environment Validation
// --------------------
export function validateOpenAIEnv() {
  if (!OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY environment variable');
  }
}

// OpenAI Client Instance is no longer needed as the related endpoint has been removed
