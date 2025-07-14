import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { getSupabaseServiceRoleClient } from '../_libs/supabase.ts'
import * as watchChannels from '../_libs/watch-channels.ts'
import * as google from '../_libs/google.ts'
import { Database } from '../../types/database.types.ts'

/**
 * This Deno edge function is triggered by a Supabase cron job to proactively
 * renew Google Calendar watch channels before they expire.
 */
Deno.serve(async (_req) => {
  try {
    /**
     * Validate that the GOOGLE_CALENDAR_WEBHOOK_URL environment variable is set.
     * This URL is essential for Google to send notifications for calendar events.
     * If it's missing, the function cannot proceed with renewing watch channels.
     */
    const webhookUrl = Deno.env.get('GOOGLE_CALENDAR_WEBHOOK_URL')
    if (!webhookUrl) {
      throw new Error('GOOGLE_CALENDAR_WEBHOOK_URL environment variable is not set.')
    }

    // Initialize an admin client to perform elevated operations.
    const supabaseAdmin = getSupabaseServiceRoleClient<Database>()

    // Set a threshold to renew channels expiring within the next 48 hours.
    const expirationThreshold = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

    // Fetch all channels that are due for renewal.
    const expiringChannels = await watchChannels.getExpiringChannels(supabaseAdmin, expirationThreshold)

    if (expiringChannels.length === 0) {
      const message = 'No expiring channels to renew.'
      console.log(message)
      return new Response(JSON.stringify({ message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log(`Found ${expiringChannels.length} channels to renew.`)

    // Loop through each expiring channel and attempt to renew it.
    for (const channel of expiringChannels) {
      try {
        console.log(`Renewing channel ${channel.channel_id} for user ${channel.user_id}`)
        
        // Retrieve the user's refresh token and use it to get a new access token.
        const refreshToken = await watchChannels.getRefreshTokenForUser(supabaseAdmin, channel.user_id)
        const newTokens = await google.refreshGoogleToken(refreshToken)
        
        // Update the user's tokens in the database.
        const newAccessToken = newTokens.access_token
        const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
        await watchChannels.updateUserTokens(supabaseAdmin, channel.user_id, newAccessToken, newExpiresAt)
        
        // Use the new access token to renew the watch channel with Google's API.
        const renewalData = await google.renewWatchChannel(newAccessToken, channel.resource_id, channel.channel_id, webhookUrl)
        
        // Update the channel's expiration date in the database.
        const newExpiration = new Date(parseInt(renewalData.expiration, 10)).toISOString()
        await watchChannels.updateChannelExpiration(supabaseAdmin, channel.channel_id, newExpiration)

        console.log(`Successfully renewed channel ${channel.channel_id}. New expiration: ${newExpiration}`)
      } catch (error) {
        // Log errors for individual channel renewals but continue with the next one.
        console.error(`Error renewing channel ${channel.channel_id}: ${(error as Error).message}`)
      }
    }

    const message = 'Channel renewal process finished.'
    return new Response(JSON.stringify({ message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // Catch and log any top-level errors during the function's execution.
    console.error(`Error in channel renewal function: ${(error as Error).message}`)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
