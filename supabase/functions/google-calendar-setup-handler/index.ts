// supabase/functions/google-calendar-setup-handler/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getAndValidateEnv } from '../_libs/config/env.ts';
import { getSupabaseServiceRoleClient } from '../_libs/supabase.ts';
import type { Database } from '../_libs/types/database.types.ts';
import { renewWatchChannel } from '../_libs/google.ts';
import { getValidAccessToken } from '../_libs/user-google-tokens.ts'; // Import the helper

// --- Type Definitions ---

/**
 * Represents the expected request body from the Electron app,
 * containing already-exchanged Google tokens from Supabase Auth.
 */
interface SetupRequestBody {
  userId: string;
  googleAccessToken: string;
  googleRefreshToken?: string;
  accessTokenExpiresAt: string; // ISO string
}

// --- Environment Variable and Supabase Client Initialization ---
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'WEBHOOK_HANDLER_BASE_URL'] as const;
const env = getAndValidateEnv(requiredEnvVars);
console.log('env', env);

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
    if (!requestBody.userId || !requestBody.googleAccessToken || !requestBody.accessTokenExpiresAt) {
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
    // Always update the access token, which is refreshed on each login.
    console.debug(`Updating Google access token for user: ${userId}`);
    const { error: updateError } = await supabaseClient
      .from('user_google_tokens')
      .update({
        google_access_token: googleAccessToken,
        access_token_expires_at: accessTokenExpiresAt,
        ...(googleRefreshToken && { google_refresh_token: googleRefreshToken }),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error(`Error updating Google tokens for user ${userId}:`, updateError);
      throw new Error(`Failed to update Google tokens: ${updateError.message}`);
    }

    // --- 2. Initiate Google Calendar Watch Request ---
    // Use the access token from the request directly since it's fresh from login
    console.log(`Initiating Google Calendar watch for user: ${userId}`);
    const channelId = crypto.randomUUID();
    const channelToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Dynamically construct the webhook URL from the Supabase project URL.
    const webhookUrl = `${env.WEBHOOK_HANDLER_BASE_URL}/functions/v1/google-calendar-webhook`;

    const watchData = await renewWatchChannel(
      googleAccessToken, // Use the token from the request
      'primary',
      channelId,
      webhookUrl, // Use the dynamically constructed URL
      channelToken
    );

    const resourceId = watchData.resourceId || 'primary';
    const expirationTimestamp = new Date(parseInt(watchData.expiration, 10)).toISOString();

    // --- 3. Record Watch Channel in Supabase ---
    console.log(`Recording watch channel for user: ${userId}, channel: ${channelId}`);
    const { error: upsertChannelError } = await supabaseClient
      .from('watch_channels')
      .upsert({
        channel_id: channelId,
        resource_id: resourceId,
        user_id: userId,
        expiration_timestamp: expirationTimestamp,
        last_sync_token: null,
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
