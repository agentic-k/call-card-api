import { type SupabaseClient } from 'npm:@supabase/supabase-js@2.49.4'
import { type Database } from './types/database.types.ts'
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from './config/google-config.ts'

/**
 * Represents the structure of a record in the 'user_google_tokens' table.
 */
type UserGoogleToken = Database['public']['Tables']['user_google_tokens']['Row']

/**
 * Decrypts an encrypted refresh token.
 *
 * @param encryptedToken The refresh token to be decrypted.
 * @returns The decrypted refresh token.
 *
 * NOTE: This is a placeholder. You must implement your own secure decryption logic
 * if you are storing refresh tokens encrypted at rest.
 */
export async function decryptRefreshToken(encryptedToken: string): Promise<string> {
  // For now, it returns the token as-is, assuming it's not encrypted.
  return await Promise.resolve(encryptedToken)
}

/**
 * Retrieves Google tokens for a specific user from the database.
 *
 * @param supabase - The Supabase client instance.
 * @param userId - The UUID of the user.
 * @returns A promise that resolves to the user's Google token data or null if not found.
 */
export async function getGoogleTokens(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserGoogleToken | null> {
  const { data, error } = await supabase
    .from('user_google_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error(`Could not find tokens for user ${userId}:`, error)
    return null
  }
  return data
}

/**
 * Refreshes an expired Google access token using the refresh token.
 * It communicates with Google's OAuth2 endpoint to get a new access token
 * and then updates the user's record in the Supabase database.
 *
 * @param supabase - The Supabase client instance.
 * @param userId - The ID of the user whose token needs refreshing.
 * @param refreshToken - The Google refresh token.
 * @returns A promise that resolves to the new access token, or null if refreshment fails.
 */
export async function refreshAndSaveGoogleToken(
  supabase: SupabaseClient<Database>,
  userId: string,
  refreshToken: string
): Promise<string | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      console.error(`Google token refresh failed for user ${userId}:`, await response.text())
      return null
    }

    const tokenData = await response.json()
    const newAccessToken = tokenData.access_token
    const expiresIn = tokenData.expires_in // in seconds

    // Update the user's tokens in the database with the new values.
    const { error: updateError } = await supabase
      .from('user_google_tokens')
      .update({
        google_access_token: newAccessToken,
        access_token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error(`Failed to update new token for user ${userId}:`, updateError)
      return null
    }

    return newAccessToken
  } catch (error) {
    console.error(`Exception during token refresh for user ${userId}:`, error)
    return null
  }
}

/**
 * Ensures a valid Google access token is available, refreshing it if necessary.
 * This function encapsulates the logic of fetching tokens, checking for expiration,
 * and initiating a refresh.
 *
 * @param supabase - The Supabase client instance.
 * @param userId - The ID of the user.
 * @returns A promise that resolves to a valid access token, or null if one cannot be obtained.
 */
export async function getValidAccessToken(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const tokenInfo = await getGoogleTokens(supabase, userId)
  if (!tokenInfo) {
    return null // User tokens not found.
  }

  const { google_access_token, google_refresh_token, access_token_expires_at } = tokenInfo

  if (!google_refresh_token) {
    console.error(`User ${userId} is missing a refresh token. Cannot proceed.`)
    return null
  }

  // Check if the access token is expired or will expire soon (e.g., within 5 minutes).
  const expiresAt = access_token_expires_at ? new Date(access_token_expires_at).getTime() : 0
  if (!google_access_token || expiresAt < Date.now() + 5 * 60 * 1000) {
    console.log(`Access token for user ${userId} expired or missing. Refreshing...`)
    const decryptedRefreshToken = await decryptRefreshToken(google_refresh_token)
    return await refreshAndSaveGoogleToken(supabase, userId, decryptedRefreshToken)
  }

  return google_access_token
} 