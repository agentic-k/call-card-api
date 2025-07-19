import { createClient } from '@supabase/supabase-js'
import { getValidAccessToken } from '../_libs/user-google-tokens.ts'
import type { Tables, TablesInsert } from '../_libs/types/database.types.ts'

// --- Type Definitions ---
// These interfaces define the expected structure of data from your Supabase tables.
// They help ensure type safety throughout the function.

/**
 * Represents a subset of columns from the 'watch_channels' table.
 * This type is derived from the master database types for consistency.
 */
type WatchChannel = Pick<Tables<'watch_channels'>, 'user_id' | 'last_sync_token' | 'resource_id'>

/**
 * Represents a simplified structure of a Google Calendar event object.
 * This is used for processing event data received from the Google Calendar API.
 */
interface GoogleCalendarEvent {
  id: string
  status: 'confirmed' | 'tentative' | 'cancelled'
  summary?: string
  description?: string
  start?: {
    dateTime?: string
    date?: string
  }
  end?: {
    dateTime?: string
    date?: string
  }
  htmlLink?: string
  updated?: string
  etag?: string
  attendees?: {
    email: string
    displayName?: string
    organizer?: boolean
    self?: boolean
    responseStatus?: string
  }[]
  // This allows for other properties we don't explicitly define
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
    } else {
      // This is a full sync. Only fetch events from today onwards to avoid syncing the entire history.
      const timeMin = new Date()
      timeMin.setHours(0, 0, 0, 0) // Set to the beginning of today.
      params.append('timeMin', timeMin.toISOString())
    }
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events?${params}`

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
    const eventsToUpsert: TablesInsert<'calendar_events'>[] = []
    const eventIdsToDelete: string[] = []

    // Process each event from the API response.
    for (const event of eventData.items as GoogleCalendarEvent[]) {
      if (event.status === 'cancelled') {
        eventIdsToDelete.push(event.id)
      } else {
        // Filter out attendees without an email (e.g., resources like meeting rooms)
        // and map to a cleaner object for storage. This captures key details for identifying participants.
        const attendees =
          event.attendees
            ?.filter((a) => a.email)
            .map((a) => ({
              email: a.email,
              displayName: a.displayName,
              responseStatus: a.responseStatus,
              organizer: a.organizer ?? false,
              self: a.self ?? false,
            })) || []

        // Selectively map Google event fields to our database schema to avoid "column not found" errors.
        eventsToUpsert.push({
          id: event.id,
          user_id: userId,
          calendar_id: calendarId,
          title: event.summary,
          description: event.description,
          start_time: event.start?.dateTime || event.start?.date,
          end_time: event.end?.dateTime || event.end?.date,
          status: event.status,
          html_link: event.htmlLink,
          last_modified: event.updated,
          etag: event.etag,
          attendees: attendees,
          // Store the entire raw event from Google in a JSONB column for future use.
          raw_event_data: event,
        })
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
        .eq('channel_id', channelId)

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
      .select<string, WatchChannel>('user_id, last_sync_token, resource_id')
      .eq('channel_id', channelId)
      .single()

    if (channelError || !channel) {
      // This can happen if a notification arrives for a channel that has been deleted,
      // or if multiple developers are pointing to the same webhook URL from different databases.
      // We log it, but return a 200 OK to prevent Google from retrying.
      console.warn(`Watch channel not found for ID ${channelId}. Acknowledging to prevent retries. Error:`, channelError);
      return new Response('OK: Channel not found, but acknowledged.', { status: 200 });
    }

    const { user_id, last_sync_token, resource_id: calendar_id } = channel

    // --- Handle 'not_exists' State ---
    // If the resource (calendar) is no longer accessible, clean up related data.
    if (resourceState === 'not_exists') {
      console.log(`Resource ${calendar_id} no longer exists. Cleaning up channel ${channelId}.`)
      await supabaseClient.from('calendar_events').delete().eq('calendar_id', calendar_id)
      await supabaseClient.from('watch_channels').delete().eq('channel_id', channelId)
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
