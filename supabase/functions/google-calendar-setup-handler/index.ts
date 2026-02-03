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
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'WEBHOOK_PUBLIC_URL'] as const;
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
    if (!requestBody.userId || !requestBody.googleAccessToken || !requestBody.accessTokenExpiresAt) {
      throw new Error('Missing required fields in request body.');
    }
  } catch (_error) {
    console.error('Invalid request body');
    return new Response(JSON.stringify({ error: 'Bad Request: Invalid JSON or missing fields.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Destructure the received tokens and user ID
  const { userId, googleAccessToken, googleRefreshToken, accessTokenExpiresAt } = requestBody;

  try {
    // --- 1. Store/Update Tokens in Supabase ---

    // Build the payload for the update. The access token is always updated.
    // The refresh token is only updated if a new one is explicitly provided.
    const updatePayload: {
      google_access_token: string;
      access_token_expires_at: string;
      google_refresh_token?: string;
    } = {
      google_access_token: googleAccessToken,
      access_token_expires_at: accessTokenExpiresAt,
    };

    if (googleRefreshToken) {
      updatePayload.google_refresh_token = googleRefreshToken;
    }

    // First, try to update the existing record. This is for users who are reconnecting.
    const { data: updateData, error: updateError } = await supabaseClient
      .from('user_google_tokens')
      .update(updatePayload)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError && updateError.code !== 'PGRST116') { // PGRST116 means no row found
      console.error('Error updating Google tokens:', updateError.message);
      throw new Error(`Failed to update Google tokens: ${updateError.message}`);
    }

    // If no record was updated (a new user) and we have a refresh token, insert a new record.
    if (!updateData && googleRefreshToken) {
      const { error: insertError } = await supabaseClient
        .from('user_google_tokens')
        .insert({
          user_id: userId,
          google_access_token: googleAccessToken,
          google_refresh_token: googleRefreshToken,
          access_token_expires_at: accessTokenExpiresAt,
        });

      if (insertError) {
        console.error('Error inserting Google tokens:', insertError.message);
        throw new Error(`Failed to insert Google tokens: ${insertError.message}`);
      }
    } else if (!updateData && !googleRefreshToken) {
      // This case handles a new user who, for some reason, didn't provide a refresh token.
      // We cannot proceed with calendar sync without it.
      throw new Error('A refresh token is required for the initial setup, but none was provided.');
    }

    // --- 2. Initiate Google Calendar Watch Request ---
    // A valid refresh token must exist in the database for the watch to be meaningful long-term.
    // We check this by fetching the token record again after the upsert.
    const { data: tokenData, error: tokenFetchError } = await supabaseClient
      .from('user_google_tokens')
      .select('google_refresh_token')
      .eq('user_id', userId)
      .single();
    
    if (tokenFetchError || !tokenData?.google_refresh_token) {
        throw new Error('A valid Google refresh token is required to set up calendar sync, but none was found.');
    }

    const calendarIdentifier = 'primary';
    const channelId = crypto.randomUUID();
    const channelToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Dynamically construct the webhook URL. Note the use of WEBHOOK_PUBLIC_URL.
    const webhookUrl = `${env.WEBHOOK_PUBLIC_URL}/functions/v1/google-calendar-webhook`;

    const watchData = await renewWatchChannel(
      googleAccessToken, // Use the token from the request
      calendarIdentifier,
      channelId,
      webhookUrl,
      channelToken
    );

    // IMPORTANT: The resourceId from Google is an opaque value not suitable for subsequent API calls.
    // We must store the calendar ID we used to create the watch ('primary')
    // so that the webhook can use it to fetch events correctly.
    const resourceIdToStore = calendarIdentifier;
    const expirationTimestamp = new Date(parseInt(watchData.expiration, 10)).toISOString();

    // --- 3. Record Watch Channel in Supabase ---
    const { error: upsertChannelError } = await supabaseClient
      .from('watch_channels')
      .upsert({
        channel_id: channelId,
        resource_id: resourceIdToStore,
        user_id: userId,
        expiration_timestamp: expirationTimestamp,
        last_sync_token: null,
      }, { onConflict: 'user_id,resource_id' });

    if (upsertChannelError) {
      console.error('Error storing watch channel:', upsertChannelError.message);
      throw new Error(`Failed to store watch channel: ${upsertChannelError.message}`);
    }

    return new Response(JSON.stringify({ success: true, message: 'Google Calendar setup complete.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in google-calendar-setup-handler:', error.message);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      console.error('Unknown error in google-calendar-setup-handler');
      return new Response(JSON.stringify({ success: false, error: 'An unknown error occurred.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
});
