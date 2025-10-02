import { Hono } from 'jsr:@hono/hono'
import type { Context } from 'jsr:@hono/hono'
import { createCorsMiddleware } from '../_libs/cors.ts'
import { getUserFromContext, getSupabaseUserClient } from '../_libs/supabase.ts'

/**
 * this represents the google calendar api functions
 * Add code for calendar_events table here
 */

const app = new Hono()

app.use('/google-calendar/*', createCorsMiddleware())

// The local CalendarEvent interface is no longer needed.

// Endpoint to fetch upcoming calendar events from the database
app.get('/google-calendar/calendar-events', async (c: Context) => {
  try {

    // Get user from context using the shared helper
    const user = await getUserFromContext(c)
    if (!user) {
      return c.json({ error: 'User not found or not authenticated' }, 401)
    }


    // Create a Supabase client that authenticates with the user's JWT
    const supabase = getSupabaseUserClient(c)

    // Fetch calendar events from the database that belong to the authenticated user
    const { data: calendarEvents, error: dbError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)

    if (dbError) {
      console.error('Database error fetching calendar events:', dbError)
      return c.json({ error: `Database error: ${dbError.message}` }, 500)
    }

    // Return the fetched calendar events
    return c.json(calendarEvents)
  } catch (error: unknown) {
    console.error('Error in /google-calendar/calendar-events:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return c.json({ error: errorMessage }, 500)
  }
})

// Endpoint to create a new calendar event directly in Supabase database
app.post('/google-calendar/calendar-events', async (c: Context) => {
  try {
    const user = await getUserFromContext(c)
    if (!user) {
      return c.json({ error: 'User not found or not authenticated' }, 401)
    }

    const { title, description, startTime, endTime, attendees } = await c.req.json()

    if (!title || !startTime) {
      return c.json({ error: 'title and startTime are required' }, 400)
    }

    console.log(`Creating calendar event for user: ${user.id}`)
    
    // Generate a unique ID for the event
    const eventId = crypto.randomUUID()
    
    // Format start and end times
    const formattedStartTime = new Date(startTime).toISOString()
    const formattedEndTime = endTime 
      ? new Date(endTime).toISOString() 
      : new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString() // Default 1 hour duration
    
    // Store the event directly in our database without Google Calendar integration
    const supabase = getSupabaseUserClient(c)
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        id: eventId,
        user_id: user.id,
        calendar_id: 'local', // Indicate this is a local event
        title: title,
        description: description || '',
        start_time: formattedStartTime,
        end_time: formattedEndTime,
        status: 'confirmed',
        attendees: attendees || [],
        raw_event_data: {
          summary: title,
          description: description || '',
          start: { dateTime: formattedStartTime },
          end: { dateTime: formattedEndTime },
          attendees: attendees?.map((email: string) => ({ email })) || []
        }
      })
      .select()
      .single()

    if (error) {
      console.error('Database error storing calendar event:', error)
      return c.json({ error: `Database error: ${error.message}` }, 500)
    }

    console.log(`Successfully created calendar event with ID: ${eventId}`)
    return c.json(data, 201)
  } catch (error: unknown) {
    console.error('Error creating calendar event:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return c.json({ error: errorMessage }, 500)
  }
})

// Endpoint to update an existing calendar event
app.put('/google-calendar/calendar-events/:eventId', async (c: Context) => {
  try {
    const user = await getUserFromContext(c)
    if (!user) {
      return c.json({ error: 'User not found or not authenticated' }, 401)
    }

    const eventId = c.req.param('eventId')
    const { title, description, startTime, endTime } = await c.req.json()

    if (!title || !startTime) {
      return c.json({ error: 'title and startTime are required' }, 400)
    }

    console.log(`Updating calendar event ${eventId} for user: ${user.id}`)
    
    // Format start and end times
    const formattedStartTime = new Date(startTime).toISOString()
    const formattedEndTime = endTime 
      ? new Date(endTime).toISOString() 
      : new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString() // Default 1 hour duration
    
    const supabase = getSupabaseUserClient(c)
    const { data, error } = await supabase
      .from('calendar_events')
      .update({
        title: title,
        description: description || '',
        start_time: formattedStartTime,
        end_time: formattedEndTime,
        raw_event_data: {
          summary: title,
          description: description || '',
          start: { dateTime: formattedStartTime },
          end: { dateTime: formattedEndTime }
        }
      })
      .eq('id', eventId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json({ error: 'Event not found or access denied' }, 404)
      }
      console.error('Database error updating calendar event:', error)
      return c.json({ error: `Database error: ${error.message}` }, 500)
    }

    console.log(`Successfully updated calendar event with ID: ${eventId}`)
    return c.json(data)
  } catch (error: unknown) {
    console.error('Error updating calendar event:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return c.json({ error: errorMessage }, 500)
  }
})

app.post('/google-calendar/calendar-events/:eventId/link-template', async (c: Context) => {
  try {
    const user = await getUserFromContext(c)
    if (!user) {
      return c.json({ error: 'User not found or not authenticated' }, 401)
    }

    const eventId = c.req.param('eventId')
    const { templateId } = await c.req.json()

    if (!templateId) {
      return c.json({ error: 'templateId is required' }, 400)
    }

    const supabase = getSupabaseUserClient(c)

    const { data, error } = await supabase
      .from('calendar_events')
      .update({ template_id: templateId })
      .eq('id', eventId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json({ error: 'Event not found or access denied' }, 404)
      }
      console.error('Database error updating calendar event:', error)
      return c.json({ error: `Database error: ${error.message}` }, 500)
    }

    return c.json(data)
  } catch (error: unknown) {
    console.error('Error linking template:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return c.json({ error: errorMessage }, 500)
  }
})

// New endpoint to link callcards to events
app.post('/google-calendar/calendar-events/:eventId/link-callcard', async (c: Context) => {
  try {
    const user = await getUserFromContext(c)
    if (!user) {
      return c.json({ error: 'User not found or not authenticated' }, 401)
    }

    const eventId = c.req.param('eventId')
    const { callcardId } = await c.req.json()

    if (!callcardId) {
      return c.json({ error: 'callcardId is required' }, 400)
    }

    const supabase = getSupabaseUserClient(c)

    // First, update the calendar event with the callcard ID
    // Note: We're only updating callcard_id, NOT template_id to avoid foreign key constraint violations
    const { data: eventData, error: eventError } = await supabase
      .from('calendar_events')
      .update({ callcard_id: callcardId })
      .eq('id', eventId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (eventError) {
      if (eventError.code === 'PGRST116') {
        return c.json({ error: 'Event not found or access denied' }, 404)
      }
      console.error('Database error updating calendar event:', eventError)
      return c.json({ error: `Database error: ${eventError.message}` }, 500)
    }

    // Then, update the callcard with the event ID
    const { data: callcardData, error: callcardError } = await supabase
      .from('callcard')
      .update({ calendar_event_id: eventId })
      .eq('callcard_id', callcardId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (callcardError) {
      // If updating the callcard fails, log the error but don't fail the request
      console.error('Database error updating callcard:', callcardError)
    }

    return c.json(eventData)
  } catch (error: unknown) {
    console.error('Error linking callcard:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return c.json({ error: errorMessage }, 500)
  }
})
export default app


