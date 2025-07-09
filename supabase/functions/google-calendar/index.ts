import { Hono } from 'jsr:@hono/hono'
import type { Context } from 'jsr:@hono/hono'
import { createCorsMiddleware } from '../_shared/cors.ts'
import { getUserFromContext } from '../_shared/supabase.ts'

const app = new Hono()

app.use('/google-calendar/*', createCorsMiddleware())

// Define the structure of a calendar event
interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  organizer?: {
    email: string;
    displayName?: string;
  };
  status: string;
  htmlLink: string;
}

// Endpoint to fetch upcoming calendar events
app.get('/google-calendar/events', async (c: Context) => {
  try {
    console.debug('=== Starting Google Calendar events request ===')
    const days = 30;
    
    // Get user from context using the shared helper
    const user = await getUserFromContext(c)
    if (!user) {
      return c.json({ error: 'User not found or not authenticated' }, 401)
    }
    
    console.debug('User authenticated successfully:', { userId: user.id, email: user.email })
    console.debug('user data', user)

    // Extract the access token from user.app_metadata
    // The token might be nested differently in the app_metadata object
    const accessToken = user.app_metadata?.provider_token || 
                       user.app_metadata?.google?.access_token || 
                       user.app_metadata?.access_token;

    if (!accessToken) {
      console.error('No Google access token found in user metadata:', user.app_metadata);
      return c.json({ error: 'No Google access token found. Please reconnect your Google account.' }, 401);
    }

    // Use the provided access token to fetch calendar events from Google Calendar API
    const timeMin = new Date().toISOString()
    const timeMax = new Date()
    timeMax.setDate(timeMax.getDate() + Number(days))

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax.toISOString())}&maxResults=10&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.json()
      console.error('Google Calendar API error:', errorData)
      return c.json({ error: `Google Calendar API error: ${errorData.error?.message || calendarResponse.statusText}` }, 502)
    }

    const calendarData = await calendarResponse.json()
    return c.json(calendarData.items as CalendarEvent[])

  } catch (error: unknown) {
    console.error('Error in /google-calendar/events:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return c.json({ error: errorMessage }, 500)
  }
})


export default app
