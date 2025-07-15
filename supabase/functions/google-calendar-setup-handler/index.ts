// supabase/functions/google-calendar-setup-handler/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getAndValidateEnv } from '../_libs/config/env.ts';
import { getSupabaseServiceRoleClient } from '../_libs/supabase.ts';
import type { Database } from '../_libs/types/database.types.ts';
import { renewWatchChannel } from '../_libs/google.ts'; // This function will use the access_token received

// --- Type Definitions ---

/**
 * Represents the expected request body from the Electron app,
 * containing already-exchanged Google tokens from Supabase Auth.
 */
interface SetupRequestBody {
  userId: string;
  googleAccessToken: string;
  googleRefreshToken: string;
  accessTokenExpiresAt: string; // ISO string
}

// --- Environment Variable and Supabase Client Initialization ---
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'WEBHOOK_HANDLER_URL'] as const;
const env = getAndValidateEnv(requiredEnvVars);

const supabaseClient = getSupabaseServiceRoleClient<Database>();

// --- Main Edge Function Handler ---

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let requestBody: SetupRequestBody;
  try {
    requestBody = await req.json();
    if (!requestBody.userId || !requestBody.googleAccessToken || !requestBody.googleRefreshToken || !requestBody.accessTokenExpiresAt) {
      throw new Error('Missing required fields in request body.');
    }
  } catch (error) {
    console.error('Invalid request body:', error);
    return new Response(JSON.stringify({ error: 'Bad Request: Invalid JSON or missing fields.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Destructure the received tokens and user ID
  const { userId, googleAccessToken, googleRefreshToken, accessTokenExpiresAt } = requestBody;

  try {
    // --- 1. Store Tokens in Supabase ---
    // These tokens are already exchanged by Supabase Auth.
    // This function's role is to store them securely for backend use (webhooks, renewer).
    console.log(`Storing Google tokens for user: ${userId}`);
    const { error: upsertTokenError } = await supabaseClient
      .from('user_google_tokens')
      .upsert({
        user_id: userId,
        google_refresh_token: googleRefreshToken,
        google_access_token: googleAccessToken,
        access_token_expires_at: accessTokenExpiresAt,
      }, { onConflict: 'user_id' }); // Conflict on user_id to update existing tokens

    if (upsertTokenError) {
      console.error(`Error storing Google tokens for user ${userId}:`, upsertTokenError);
      throw new Error(`Failed to store Google tokens: ${upsertTokenError.message}`);
    }

    // --- 2. Initiate Google Calendar Watch Request ---
    // Use the googleAccessToken received from the client to make the watch request.
    console.log(`Initiating Google Calendar watch for user: ${userId}`);
    const channelId = crypto.randomUUID(); // Generate a unique ID for the channel
    const channelToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15); // Simple random token for validation

    // Call the shared utility function to make the watch request
    const watchData = await renewWatchChannel(
      googleAccessToken, // Use the access token received from the client
      'primary', // Assuming primary calendar for now, can be dynamic
      channelId,
      env.WEBHOOK_HANDLER_URL,
      channelToken
    );

    const resourceId = watchData.resourceId || 'primary'; // Fallback to 'primary' if not explicitly returned
    const expirationTimestamp = new Date(parseInt(watchData.expiration, 10)).toISOString(); // Convert from milliseconds

    // --- 3. Record Watch Channel in Supabase ---
    console.log(`Recording watch channel for user: ${userId}, channel: ${channelId}`);
    const { error: upsertChannelError } = await supabaseClient
      .from('watch_channels')
      .upsert({
        channel_id: channelId,
        resource_id: resourceId,
        user_id: userId,
        expiration_timestamp: expirationTimestamp,
        last_sync_token: null, // Initial sync token is null, webhook will set it
      }, { onConflict: 'channel_id' });

    if (upsertChannelError) {
      console.error(`Error storing watch channel for user ${userId}:`, upsertChannelError);
      throw new Error(`Failed to store watch channel: ${upsertChannelError.message}`);
    }

    console.log(`Google Calendar setup complete for user: ${userId}`);
    return new Response(JSON.stringify({ success: true, message: 'Google Calendar setup complete.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in google-calendar-setup-handler:', error.message, error.stack);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      console.error('Unknown error in google-calendar-setup-handler:', error);
      return new Response(JSON.stringify({ success: false, error: 'An unknown error occurred.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
});
