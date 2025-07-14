// call-card-api/supabase/functions/_libs/google.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

/**
 * Defines the expected structure of the response from Google's OAuth token endpoint.
 * This interface is used when refreshing an access token to ensure type safety.
 */
export interface GoogleOAuthTokenResponse {
  access_token: string;
  expires_in: number; // Duration in seconds until the token expires.
  scope: string;
  token_type: string;
}

/**
 * Defines the structure of the response from the Google Calendar API's events.watch method.
 * This provides the new expiration details for a renewed watch channel.
 */
export interface GoogleWatchResponse {
  kind: string;
  id: string; // The unique identifier for the channel.
  resourceId: string;
  resourceUri: string;
  expiration: string; // The new expiration timestamp in milliseconds.
}

/**
 * Refreshes a Google access token using a provided refresh token.
 * This function handles the POST request to Google's OAuth 2.0 token endpoint.
 *
 * @param refreshToken - The refresh token obtained from the user's initial authorization.
 * @returns A promise that resolves to the new token data from Google.
 * @throws An error if the token refresh fails.
 */
export async function refreshGoogleToken(refreshToken: string): Promise<GoogleOAuthTokenResponse> {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID'),
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to refresh Google access token: ${await tokenResponse.text()}`);
  }

  return await tokenResponse.json() as GoogleOAuthTokenResponse;
}

/**
 * Renews an existing watch channel for Google Calendar events.
 * To renew, it's crucial to use the same channel ID as the original subscription.
 *
 * @param accessToken - A valid Google access token.
 * @param calendarId - The ID of the calendar to watch.
 * @param channelId - The ID of the channel to renew.
 * @param webhookUrl - The notification URL where Google will send updates.
 * @returns A promise that resolves to the renewed channel's metadata.
 * @throws An error if the channel renewal fails.
 */
export async function renewWatchChannel(
  accessToken: string,
  calendarId: string,
  channelId: string,
  webhookUrl: string
): Promise<GoogleWatchResponse> {
  const watchResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/watch`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
    }),
  });

  if (!watchResponse.ok) {
    throw new Error(`Failed to renew watch channel: ${await watchResponse.text()}`);
  }

  return await watchResponse.json() as GoogleWatchResponse;
} 