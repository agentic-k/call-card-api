import { Hono } from 'jsr:@hono/hono';
import type { Context } from 'jsr:@hono/hono';
import { createCorsMiddleware } from '../_libs/cors.ts';
import { getUserFromContext, getSupabaseServiceRoleClient } from '../_libs/supabase.ts';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '../_libs/config/google-config.ts';
import type { Database } from '../_libs/types/database.types.ts';

/**
 * Get the appropriate redirect URI based on the environment
 * @returns {string} The redirect URI for the current environment
 */
function getRedirectUri(): string {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!supabaseUrl) {
    throw new Error(
      'SUPABASE_URL is not defined. Please set it in your environment variables.'
    );
  }
  return `${supabaseUrl}/auth/v1/callback`;
}

const app = new Hono();

// Apply CORS middleware to the specific route
app.use('/google-auth-callback', createCorsMiddleware());

app.post('/google-auth-callback', async (c: Context) => {
  try {
    // 1. Extract authorization code from the request body
    const { authorizationCode } = await c.req.json();
    if (!authorizationCode) {
      return c.json({ error: '`authorizationCode` is required' }, 400);
    }

    // 2. Try to get the authenticated user from the JWT.
    // For initial Google login, this might not be available yet.
    const user = await getUserFromContext(c);
    
    // If no authenticated user, this is likely an initial Google login
    // We'll proceed with the token exchange and return the tokens for the client to handle

    // 3. Exchange the authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: authorizationCode,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: getRedirectUri(), // Environment-aware redirect URI
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      return c.json({ error: 'Failed to exchange authorization code for tokens.', details: errorBody }, 502);
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    if (user) {
      // 4a. If we have an authenticated user, store the tokens in the database
      const supabaseAdmin = getSupabaseServiceRoleClient<Database>();
      const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

      const { error: upsertError } = await supabaseAdmin
        .from('user_google_tokens')
        .upsert({
          user_id: user.id,
          google_access_token: access_token,
          google_refresh_token: refresh_token,
          access_token_expires_at: expiresAt,
        }, { onConflict: 'user_id' }); // Specify the conflict target

      if (upsertError) {
        return c.json({ error: 'Failed to store tokens in the database.', details: upsertError.message }, 500);
      }

      // 5a. Return a success response for authenticated user
      return c.json({ success: true, message: 'Tokens stored successfully.' });
    } else {
      // 4b. For initial login, return the tokens to the client for Supabase session creation
      return c.json({ 
        success: true, 
        access_token, 
        refresh_token, 
        expires_in,
        message: 'Tokens retrieved successfully for initial login.' 
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return c.json({ error: 'An internal server error occurred.', details: errorMessage }, 500);
  }
});

export default app;
