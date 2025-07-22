import { createClient } from 'npm:@supabase/supabase-js@2.49.4'
import { getValidAccessToken } from '../_libs/user-google-tokens.ts'
import type { Tables, TablesInsert, Database } from '../_libs/types/database.types.ts'
import { shouldUseMockData, getMockCallPackData } from '../agent-api/libs/mock-data.ts'
import {
  validateEnv,
  createThread,
  runAssistant,
  processApiResponse
} from '../agent-api/libs/langmsmith-helper.ts'

// TYPES
import type { GoogleCalendarEvent } from '../_libs/types/google/calendar.types.ts'


// Type definitions
type WatchChannel = Pick<Tables<'watch_channels'>, 'user_id' | 'last_sync_token' | 'resource_id'>


interface MeetingTemplate {
  name: string
  description: string
  [key: string]: any
}

// Initialize Supabase client
const supabaseClient = createClient<Database>(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

async function syncCalendarEvents(
  accessToken: string,
  calendarId: string,
  syncToken: string | null,
  channelId: string,
  userId: string
): Promise<boolean> {
  try {
    const params = new URLSearchParams()
    if (syncToken) {
      params.append('syncToken', syncToken)
    } else {
      const timeMin = new Date()
      timeMin.setHours(0, 0, 0, 0)
      params.append('timeMin', timeMin.toISOString())
    }

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (response.status === 410) {
      return await syncCalendarEvents(accessToken, calendarId, null, channelId, userId)
    }

    if (!response.ok) {
      console.error(`Failed to fetch calendar events for user ${userId}:`, await response.text())
      return false
    }

    const eventData = await response.json()
    const eventsToUpsert: TablesInsert<'calendar_events'>[] = []
    const eventIdsToDelete: string[] = []

    for (const event of eventData.items as GoogleCalendarEvent[]) {
      if (event.status === 'cancelled') {
        eventIdsToDelete.push(event.id)
      } else {
        const attendees = event.attendees
          ?.filter((a) => a.email)
          .map((a) => ({
            email: a.email,
            displayName: a.displayName,
            responseStatus: a.responseStatus,
            organizer: a.organizer ?? false,
            self: a.self ?? false,
          })) || []

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
          raw_event_data: event,
        })
      }
    }

    if (eventsToUpsert.length > 0) {
      const eventIds = eventsToUpsert.map((e) => e.id!)
      const { data: existingEventsData, error: existingEventsError } = await supabaseClient
        .from('calendar_events')
        .select('id, attendees, template_id')
        .in('id', eventIds)

      if (existingEventsError) {
        console.warn('Could not fetch existing events for delta check, proceeding without.', {
          error: existingEventsError,
        })
      }
      const existingEventsMap = new Map(
        (existingEventsData || []).map((event) => [event.id, event])
      )

      const { data: upsertedEvents, error: upsertError } = await supabaseClient
        .from('calendar_events')
        .upsert(eventsToUpsert)
        .select()

      if (upsertError) {
        console.error('Error upserting calendar events:', upsertError)
      } else if (upsertedEvents) {
        for (const savedEvent of upsertedEvents) {
          const googleEvent = (eventData.items as GoogleCalendarEvent[]).find(
            (e) => e.id === savedEvent.id
          )
          if (googleEvent) {
            const existingEvent = existingEventsMap.get(savedEvent.id)

            if (existingEvent?.template_id) {
              const oldAttendees = (existingEvent.attendees as { email: string }[]) || []
              const newAttendees = (savedEvent.attendees as { email: string }[]) || []

              const oldEmails = oldAttendees.map((a) => a.email).sort()
              const newEmails = newAttendees.map((a) => a.email).sort()

              if (JSON.stringify(oldEmails) === JSON.stringify(newEmails)) {
                console.log(
                  `Event ${savedEvent.id} attendees unchanged. Skipping template regeneration.`
                )
                continue
              }

              console.log(
                `Event ${savedEvent.id} attendees changed. Deleting old template ${existingEvent.template_id}.`
              )
              const { error: deleteError } = await supabaseClient
                .from('templates')
                .delete()
                .eq('template_id', existingEvent.template_id)

              if (deleteError) {
                console.error(
                  `Failed to delete old template ${existingEvent.template_id}:`,
                  deleteError.message
                )
              }
            }
            await triggerAgentForTemplateCreation(userId, savedEvent, googleEvent)
          }
        }
      }
    }

    if (eventIdsToDelete.length > 0) {
      const { error: deleteError } = await supabaseClient
        .from('calendar_events')
        .delete()
        .in('id', eventIdsToDelete)
      if (deleteError) console.error('Error deleting calendar events:', deleteError)
    }

    if (eventData.nextSyncToken) {
      const { error: updateError } = await supabaseClient
        .from('watch_channels')
        .update({ last_sync_token: eventData.nextSyncToken })
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

async function generateCallPack(
  callCardContext: string | null,
  prospectCompanyUrl: string,
  userCompanyUrl: string | null
): Promise<MeetingTemplate | { error: string }> {
  try {
    if (shouldUseMockData()) {
      return getMockCallPackData()
    }

    // Ensure required parameters are not empty
    if (!prospectCompanyUrl || !userCompanyUrl) {
      return { error: 'Prospect company URL or user company URL is required' }
    }

    const agentPayload = {
      "template_context": callCardContext || "",
      "prospect_company_url": prospectCompanyUrl,
      "client_company_url": userCompanyUrl,
    };

    console.debug('Generating call pack with payload:', agentPayload)

    try {
      validateEnv()
    } catch (envError) {
      console.error('Environment validation failed:', envError)
      return { error: 'LangSmith configuration is incomplete' }
    }

    console.debug('Attempting to create thread...')
    const threadId = await createThread()
    console.debug('Thread created successfully:', threadId)

    const assistantRes = await runAssistant(threadId, agentPayload)
    console.debug('Assistant response received')

    if (!assistantRes?.messages?.length) {
      throw new Error('No messages in assistant response')
    }

    const lastMsg = assistantRes.messages.slice(-1)[0]
    if (!lastMsg.content) {
      throw new Error('Last message from assistant has no content')
    }

    const apiResp = JSON.parse(lastMsg.content)
    return processApiResponse(apiResp)
  }
  catch (err: unknown) {
    console.error('Template generation failed:', err instanceof Error ? err.message : String(err))
    return { error: err instanceof Error ? err.message : 'Unknown error occurred' }
  }
}

// Helper function to fetch user profile
async function fetchUserProfile(userId: string) {
  const { data: userProfile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('company_url, personal_context, email')
    .eq('id', userId)
    .single()

  if (profileError || !userProfile) {
    throw new Error(`Could not fetch user profile: ${profileError?.message || 'No profile found'}`)
  }

  return {
    company_url: userProfile.company_url,
    personal_context: userProfile.personal_context,
    email: userProfile.email
  }
}

// Helper function to find prospect from attendees
function findProspectFromAttendees(googleEvent: GoogleCalendarEvent) {
  const prospect = googleEvent.attendees?.find(
    (attendee) => attendee.email && !attendee.organizer && !attendee.resource
  )

  if (!prospect?.email) {
    throw new Error('No prospect found for event')
  }

  return prospect
}

// Helper function to create draft template
async function createDraftTemplate(userId: string, googleEvent: GoogleCalendarEvent) {
  const templateName = googleEvent.summary || 'Untitled Template'
  const { data: draftTemplate, error: draftError } = await supabaseClient
    .from('templates')
    .insert({
      template_name: templateName,
      user_id: userId,
      status: 'DRAFT',
      description: googleEvent.description || 'New meeting scheduled',
    })
    .select('template_id')
    .single()

  if (draftError || !draftTemplate) {
    throw new Error(`Failed to create draft template: ${draftError?.message || 'Unknown error'}`)
  }

  return draftTemplate.template_id
}

// Helper function to link template to calendar event
async function linkTemplateToEvent(templateId: string, savedEvent: Tables<'calendar_events'>) {
  const { error: eventUpdateError } = await supabaseClient
    .from('calendar_events')
    .update({ template_id: templateId })
    .eq('id', savedEvent.id)

  if (eventUpdateError) {
    throw new Error(`Failed to link to calendar event: ${eventUpdateError.message}`)
  }
}

// Helper function to get company URL from email domain
function getCompanyUrlFromEmail(email: string): string {
  const domain = email.split('@')[1]
  if (!domain) {
    throw new Error('Could not extract domain from email.')
  }
  return `https://www.${domain}`
}

// Helper function to generate and update template with call pack
async function generateAndUpdateTemplate(
  templateId: string,
  userProfile: { personal_context: string | null; company_url: string | null; email: string | null },
  prospectEmail: string,
  savedEventId: string
) {
  const prospectCompanyUrl = getCompanyUrlFromEmail(prospectEmail)
  console.debug('Generating call pack for event:', savedEventId)

  // Get user company URL from email, similar to how we get prospect company URL
  const userCompanyUrl = userProfile.email ? getCompanyUrlFromEmail(userProfile.email) : null

  const callPack = await generateCallPack(
    userProfile.personal_context,
    prospectCompanyUrl,
    userCompanyUrl
  )

  if (!callPack || 'error' in callPack || !callPack.name || !callPack.description) {
    throw new Error('error' in callPack ? callPack.error : 'Failed to generate a valid call pack.')
  }

  const { error: updateError } = await supabaseClient
    .from('templates')
    .update({
      template_name: callPack.name,
      content: callPack,
      description: callPack.description,
      status: 'ACTIVE',
      error_message: null,
    })
    .eq('template_id', templateId)

  if (updateError) {
    throw new Error(`Failed to update template: ${updateError.message}`)
  }
}

// Main function that orchestrates the template creation process
async function triggerAgentForTemplateCreation(
  userId: string,
  savedEvent: Tables<'calendar_events'>,
  googleEvent: GoogleCalendarEvent
) {
  let templateId: string | undefined

  try {
    // Step 1: Fetch user profile
    const userProfile = await fetchUserProfile(userId)
    console.log('userProfile', userProfile)

    // ************ TESTING START ************ //
    if (shouldUseMockData()) {
      googleEvent.attendees = [
        {
          "self": true,
          "email": "test@brightdata.com",
          "organizer": true,
          "responseStatus": "accepted"
        },
        {
          "email": "test@amazon.com",
          "responseStatus": "needsAction"
        }
      ]
    }
    // ************ TESTING END ************ //

    // Step 2: Find prospect from attendees
    const prospect = findProspectFromAttendees(googleEvent)

    // Step 3: Create draft template
    templateId = await createDraftTemplate(userId, googleEvent)

    // Step 4: Link template to calendar event
    await linkTemplateToEvent(templateId, savedEvent)

    // Step 5: Generate and update template with call pack
    await generateAndUpdateTemplate(templateId, userProfile, prospect.email, savedEvent.id)
  } catch (error) {
    console.error('Failed to create template:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    // Update template status to ERROR if we have a templateId
    if (templateId) {
      await supabaseClient
        .from('templates')
        .update({ status: 'ERROR', error_message: errorMessage })
        .eq('template_id', templateId)
    }
  }
}


// Main webhook handler
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const channelId = req.headers.get('X-Goog-Channel-Id')
  const resourceState = req.headers.get('X-Goog-Resource-State')
  const resourceId = req.headers.get('X-Goog-Resource-Id')

  if (!channelId || !resourceState || !resourceId) {
    return new Response('Bad Request: Missing Google webhook headers.', { status: 400 })
  }

  try {
    const { data: channel, error: channelError } = await supabaseClient
      .from('watch_channels')
      .select<string, WatchChannel>('user_id, last_sync_token, resource_id')
      .eq('channel_id', channelId)
      .single()

    if (channelError || !channel) {
      return new Response('OK: Channel not found, but acknowledged.', { status: 200 })
    }

    const { user_id, last_sync_token, resource_id: calendar_id } = channel

    console.log('resourceState', resourceState)
    if (resourceState === 'not_exists') {
      await supabaseClient.from('calendar_events').delete().eq('calendar_id', calendar_id)
      await supabaseClient.from('watch_channels').delete().eq('channel_id', channelId)
      return new Response('OK: Resource removed.', { status: 200 })
    }

    const accessToken = await getValidAccessToken(supabaseClient, user_id)
    if (!accessToken) {
      return new Response('Forbidden: Could not obtain valid token.', { status: 403 })
    }

    if (resourceState === 'sync' || resourceState === 'exists') {
      await syncCalendarEvents(
        accessToken,
        calendar_id,
        resourceState === 'sync' ? null : last_sync_token,
        channelId,
        user_id
      )
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
})
