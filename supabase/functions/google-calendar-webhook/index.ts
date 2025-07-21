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
            // Example usage of weather API (you can move this where needed)
            await fetchWeatherData('London')

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
    
    const agentPayload = {
      "template_context": callCardContext,
      "linkedin_profile_url": prospectCompanyUrl,
      "prospect_company_url": prospectCompanyUrl,
      "client_company_url": userCompanyUrl,
    };
    
    console.debug('Generating call pack with payload:', agentPayload)
    
    // Validate environment variables first
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
    console.debug('Assistant response:', assistantRes)

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

async function triggerAgentForTemplateCreation(
  userId: string,
  savedEvent: Tables<'calendar_events'>,
  googleEvent: GoogleCalendarEvent
) {
  const { data: userProfile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('company_url, personal_context')
    .eq('id', userId)
    .single()

  if (profileError || !userProfile) {
    console.error('Could not fetch user profile:', profileError)
    return
  }

  const prospect = googleEvent.attendees?.find(
    (attendee) => attendee.email && !attendee.organizer && !attendee.resource
  )

  if (!prospect?.email) {
    return
  }

  try {
    const prospectDomain = prospect.email.split('@')[1]
    if (!prospectDomain) {
      throw new Error('Could not extract domain from prospect email.')
    }
    const prospectCompanyUrl = `https://www.${prospectDomain}`
    
    console.debug('Generating call pack for event:', savedEvent.id)

    const callPack = await generateCallPack(
      userProfile.personal_context,
      prospectCompanyUrl,
      userProfile.company_url
    )
    
    if (!callPack || 'error' in callPack || !callPack.name || !callPack.description) {
      return
    }

    const { data: newTemplate, error: templateError } = await supabaseClient
      .from('templates')
      .insert({
        template_name: callPack.name,
        content: callPack,
        user_id: userId,
        description: callPack.description,
      })
      .select('template_id')
      .single()

    if (templateError || !newTemplate) {
      console.error('Failed to save template:', templateError)
      return
    }

    const { error: eventUpdateError } = await supabaseClient
      .from('calendar_events')
      .update({ template_id: newTemplate.template_id })
      .eq('id', savedEvent.id)

    if (eventUpdateError) {
      console.error('Failed to link template to event:', eventUpdateError)
    }
  } catch (error) {
    console.error('Failed to create template:', error)
  }
}

// Weather API Types
interface WeatherResponse {
  weather: {
    description: string;
    main: string;
  }[];
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  name: string;
}

/**
 * Fetches current weather data for a given city using the OpenWeather API
 * @param city - The name of the city to get weather for
 * @returns Promise containing the weather data or null if the request fails
 */
async function fetchWeatherData(city: string): Promise<WeatherResponse | null> {
  try {
    // Note: In production, use environment variables for API keys
    const API_KEY = 'YOUR_API_KEY' // Replace with actual API key in production
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`
    
    const response = await fetch(url)
    if (!response.ok) {
      console.error('Weather API Error:', await response.text())
      return null
    }

    const data: WeatherResponse = await response.json()
    console.log('Weather Data for', city, ':', {
      temperature: data.main.temp,
      feels_like: data.main.feels_like,
      humidity: data.main.humidity,
      description: data.weather[0]?.description
    })

    return data
  } catch (error) {
    console.error('Failed to fetch weather data:', error)
    return null
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
