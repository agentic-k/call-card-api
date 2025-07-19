import { Hono } from 'jsr:@hono/hono'
import type { Context } from 'jsr:@hono/hono'
import { createCorsMiddleware } from '../_libs/cors.ts'
import { getUserFromContext, getSupabaseUserClient } from '../_libs/supabase.ts'

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

export default app
