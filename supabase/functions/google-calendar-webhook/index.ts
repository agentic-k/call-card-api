import { createClient } from '@supabase/supabase-js'
import { getValidAccessToken } from '../_libs/user-google-tokens.ts'

// --- Type Definitions ---
// These interfaces define the expected structure of data from your Supabase tables.
// They help ensure type safety throughout the function.

/**
 * Represents the structure of a record in the 'watch_channels' table.
 * This table stores information about active Google Calendar notification channels.
 */
interface WatchChannel {
  user_id: string
  last_sync_token: string | null
  calendar_id: string
}

/**
 * Represents a simplified structure of a Google Calendar event object.
 * This is used for processing event data received from the Google Calendar API.
 */
interface GoogleCalendarEvent {
  id: string
  status: 'confirmed' | 'tentative' | 'cancelled'
  // Include other event properties you intend to store, e.g., summary, start, end, etc.
  [key: string]: any
}

// --- Environment Variable and Supabase Client Initialization ---

// Create a single Supabase client instance to be reused.
// The service role key is essential for bypassing Row Level Security (RLS)
// to perform administrative tasks like updating user tokens and calendar events.
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

/**
 * Synchronizes calendar events between Google Calendar and the Supabase database.
 * It can perform a full sync or a delta sync based on the provided sync token.
 * It handles event creation, updates, and deletions.
 *
 * @param accessToken The valid Google API access token.
 * @param calendarId The ID of the calendar to sync.
 * @param syncToken The sync token from the last synchronization. If null, a full sync is performed.
 * @param channelId The ID of the watch channel, used for updating the sync token.
 * @param userId The ID of the user owning the calendar.
 * @returns A boolean indicating whether the synchronization was successful.
 */
async function syncCalendarEvents(
  accessToken: string,
  calendarId: string,
  syncToken: string | null,
  channelId: string,
  userId: string
): Promise<boolean> {
  let nextSyncToken: string | null = null

  try {
    const params = new URLSearchParams()
    if (syncToken) {
      params.append('syncToken', syncToken)
    }
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    // If sync token is expired, Google returns a 410. A full re-sync is required.
    if (response.status === 410) {
      console.log(`Sync token for channel ${channelId} is gone. Performing a full re-sync.`)
      // Recursively call with a null syncToken to trigger a full sync.
      return await syncCalendarEvents(accessToken, calendarId, null, channelId, userId)
    }

    if (!response.ok) {
      console.error(`Failed to fetch calendar events for user ${userId}:`, await response.text())
      return false
    }

    const eventData = await response.json()
    const eventsToUpsert: GoogleCalendarEvent[] = []
    const eventIdsToDelete: string[] = []

    // Process each event from the API response.
    for (const event of eventData.items as GoogleCalendarEvent[]) {
      if (event.status === 'cancelled') {
        eventIdsToDelete.push(event.id)
      } else {
        // Prepare event data for upsert, adding user_id and calendar_id.
        eventsToUpsert.push({ ...event, user_id: userId, calendar_id: calendarId })
      }
    }

    // Perform batch database operations for efficiency.
    if (eventsToUpsert.length > 0) {
      const { error: upsertError } = await supabaseClient
        .from('calendar_events')
        .upsert(eventsToUpsert)
      if (upsertError) console.error('Error upserting calendar events:', upsertError)
    }

    if (eventIdsToDelete.length > 0) {
      const { error: deleteError } = await supabaseClient
        .from('calendar_events')
        .delete()
        .in('id', eventIdsToDelete)
      if (deleteError) console.error('Error deleting calendar events:', deleteError)
    }

    nextSyncToken = eventData.nextSyncToken

    // Persist the new sync token for the next delta sync.
    if (nextSyncToken) {
      const { error: updateError } = await supabaseClient
        .from('watch_channels')
        .update({ last_sync_token: nextSyncToken })
        .eq('id', channelId)

      if (updateError) {
        console.error('Error updating nextSyncToken:', updateError)
      }
    }

    return true
  } catch (error) {
    console.error('Exception during calendar sync:', error)
    return false
  }
}

// --- Main Webhook Handler ---

Deno.serve(async (req) => {
  // The webhook handler must respond to Google quickly, so extensive processing
  // should be handled asynchronously if it becomes too slow.

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // --- Header Validation ---
  const channelId = req.headers.get('X-Goog-Channel-Id')
  const resourceState = req.headers.get('X-Goog-Resource-State') // e.g., 'sync', 'exists', 'not_exists'
  const resourceId = req.headers.get('X-Goog-Resource-Id') // The ID of the resource that changed.

  if (!channelId || !resourceState || !resourceId) {
    console.warn('Webhook received with missing required headers.')
    return new Response('Bad Request: Missing Google webhook headers.', { status: 400 })
  }

  try {
    // --- Retrieve Watch Channel Information ---
    const { data: channel, error: channelError } = await supabaseClient
      .from('watch_channels')
      .select<string, WatchChannel>('user_id, last_sync_token, calendar_id')
      .eq('id', channelId)
      .single()

    if (channelError || !channel) {
      console.error(`Watch channel not found for ID ${channelId}:`, channelError)
      return new Response('Unauthorized: Watch channel not found.', { status: 401 })
    }

    const { user_id, last_sync_token, calendar_id } = channel

    // --- Handle 'not_exists' State ---
    // If the resource (calendar) is no longer accessible, clean up related data.
    if (resourceState === 'not_exists') {
      console.log(`Resource ${calendar_id} no longer exists. Cleaning up channel ${channelId}.`)
      await supabaseClient.from('calendar_events').delete().eq('calendar_id', calendar_id)
      await supabaseClient.from('watch_channels').delete().eq('id', channelId)
      return new Response('OK: Resource removed.', { status: 200 })
    }

    // --- For 'sync' and 'exists', we need valid tokens ---
    const accessToken = await getValidAccessToken(supabaseClient, user_id)

    if (!accessToken) {
      console.error(`Failed to obtain valid access token for user ${user_id}. Aborting sync.`)
      return new Response('Forbidden: Could not obtain valid token.', { status: 403 })
    }

    // --- Handle 'sync' and 'exists' States ---
    if (resourceState === 'sync' || resourceState === 'exists') {
      if (resourceState === 'sync') {
        console.log(`Received initial 'sync' notification for channel ${channelId}. Starting full sync.`)
      }
      console.log(`Change detected for calendar ${calendar_id} (channel ${channelId}). Starting delta sync.`)
      await syncCalendarEvents(accessToken, calendar_id, last_sync_token, channelId, user_id)
    }

    // Acknowledge the webhook with a 200 OK to prevent Google from resending it.
    return new Response('OK', { status: 200 })

  } catch (error) {
    if (error instanceof Error) {
      console.error('Unhandled exception in webhook handler:', error.message, error.stack)
    } else {
      console.error('Unhandled exception in webhook handler:', error)
    }
    return new Response('Internal Server Error', { status: 500 })
  }
})
