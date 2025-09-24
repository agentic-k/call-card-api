# Google Calendar Webhook Handler

This webhook handler processes Google Calendar notifications and automatically generates call cards for calendar events.

## Overview

When a new calendar event is created or updated, Google Calendar sends a notification to this webhook. The webhook:

1. Fetches the updated calendar events
2. Creates or updates corresponding event records in the database
3. Generates call cards for new events with attendees
4. Links the call cards to the calendar events

## Required Environment Variables
Make sure these environment variables are set in your Supabase project:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access
- `LANGSMITH_API_URL`: LangSmith API URL for template generation
- `LANGSMITH_API_KEY`: LangSmith API key

## Testing

You can test the webhook using the included test script:

```bash
cd supabase/functions/google-calendar-webhook
deno run --allow-net --allow-env --allow-read test-webhook.ts
```

The script will attempt to load environment variables from:
- `../../.env.local` (the .env.local file in the supabase directory)

**Note:** If your `.env.local` file contains a Docker URL like `http://host.docker.internal:54321`, the test script will automatically convert it to `http://localhost:54321` for local testing.

### Test Behavior

The test script will:

1. **First try to find a user with Google OAuth tokens** - If found, it will run a full integration test
2. **Fall back to a mock test** - If no users with Google tokens are found, it will test the webhook endpoint directly

**Expected Results:**
- **403 Forbidden with "Could not obtain valid token"** - This is the correct behavior when testing without valid Google tokens
- **200 OK** - This would indicate the webhook processed successfully (only with valid Google tokens)

Alternatively, you can set the environment variables directly:

```bash
SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key deno run --allow-net --allow-env test-webhook.ts
```

## Webhook Structure

The webhook expects the following headers from Google Calendar:

- `X-Goog-Channel-Id`: The channel ID for the notification
- `X-Goog-Resource-Id`: The resource ID (calendar ID)
- `X-Goog-Resource-State`: The state of the resource (e.g., `exists`, `sync`, `not_exists`)

## Recent Changes

- Added support for the new template structure with `sales_framework` field
- Updated content structure to match the expected format with `useCases` and `painPoints`
- Fixed template creation to include all required fields

## Troubleshooting

If the webhook is not working:

1. Check the Supabase function logs
2. Verify that all required environment variables are set
3. Ensure the Google Calendar watch channel is properly set up
4. Run the test script to verify webhook functionality

### Common Errors

#### Environment Variable Parsing Error

If you see an error like:

```
error: The module's source code could not be parsed: Expected ';', '}' or <eof> at file:///path/to/.env.local:1:18
```

This means Deno is trying to parse your .env file as a JavaScript/TypeScript module. The test script is designed to handle this by using the Deno dotenv module, but you need to:

1. Make sure you're using the `--allow-read` flag when running the script
2. Check that your .env file is in the correct location (in the supabase root directory)
3. If needed, set environment variables directly on the command line instead of using a .env file
