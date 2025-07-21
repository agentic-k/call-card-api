export interface GoogleCalendarEvent {
    id: string
    status: 'confirmed' | 'tentative' | 'cancelled'
    summary?: string
    description?: string
    start?: { dateTime?: string; date?: string }
    end?: { dateTime?: string; date?: string }
    htmlLink?: string
    updated?: string
    etag?: string
    attendees?: {
      email: string
      displayName?: string
      organizer?: boolean
      self?: boolean
      responseStatus?: string
      resource?: boolean
    }[]
    [key: string]: any
  }
  