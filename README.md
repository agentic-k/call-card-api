# Call Card API

AI-powered sales preparation platform that automatically generates context-aware call cards for sales meetings by syncing with Google Calendar and enriching prospect data.

---

## Problem Statement

Sales representatives spend hours manually researching prospects before calls, often scrambling for context minutes before meetings. This fragmented process leads to:

- **Lost preparation time** – Manual research across LinkedIn, company websites, and CRMs
- **Inconsistent qualification** – Ad-hoc questions without structured sales frameworks
- **Missed context** – Calendar events disconnected from prospect intelligence
- **Reactive workflows** – Preparation happens too late or not at all

Call Card API solves this by automating the entire pre-call workflow: detecting scheduled meetings, gathering prospect intelligence, and generating AI-powered preparation guides — all before the sales rep even opens their calendar.

---

## Features

- **Automated Calendar Monitoring** – Syncs with Google Calendar via webhooks to detect new meetings with external attendees
- **AI Call Pack Generation** – LangSmith AI agents create personalized meeting guides with use cases, pain points, and framework-driven questions
- **LinkedIn Data Enrichment** – Scrapes prospect and company profiles via BrightData API for current intel on funding, size, and personnel
- **Sales Framework Application** – Supports MEDDIC and BANT qualification frameworks with structured question generation
- **Real-Time Lead Scoring** – Analyzes call transcripts post-meeting to score qualification criteria with confidence levels
- **Multi-Tenant Architecture** – Row-level security ensures complete data isolation between users

---

## Tech Stack

### Backend
- **Runtime**: Deno (Supabase Edge Functions)
- **Framework**: Hono (lightweight web framework)
- **Database**: PostgreSQL (Supabase hosted)
- **Authentication**: Supabase Auth + Google OAuth2

### Integrations
- **Google Calendar API** – Real-time event sync via push notifications
- **LangSmith AI** – Custom AI assistants for template and scoring generation
- **BrightData API** – LinkedIn profile and company data scraping
- **Supabase Realtime** – Database change subscriptions (via RLS-enabled Postgres)

### Infrastructure
- **Deployment**: Supabase Edge Functions (Deno Deploy)
- **Security**: Row-Level Security (RLS), JWT-based auth, encrypted token storage
- **Cron Jobs**: Automated watch channel renewal (prevents webhook expiration)

---

## Prerequisites

Before installation, ensure you have:

1. **Supabase Account** – [Sign up at supabase.com](https://supabase.com)
2. **Supabase CLI** – Install via `brew install supabase/tap/supabase` (macOS) or [other methods](https://supabase.com/docs/guides/cli)
3. **Google Cloud Project** – For Calendar API and OAuth credentials
4. **LangSmith Account** – [Sign up at smith.langchain.com](https://smith.langchain.com)
5. **BrightData Account** (optional) – For LinkedIn scraping

### Required API Credentials

You'll need to configure these services:

- **Google Cloud Console**:
  - Enable Google Calendar API
  - Create OAuth 2.0 Client ID (Web application type)
  - Add authorized redirect URI: `https://YOUR_SUPABASE_URL/functions/v1/google-auth-callback`

- **LangSmith**:
  - Create AI assistants for template generation and lead scoring
  - Note the assistant IDs for environment variables

- **BrightData** (optional):
  - Create datasets for LinkedIn profile and company scraping
  - Generate API token

---

## Installation

### 1. Clone and Link Supabase Project

```bash
# Clone the repository
git clone <repository-url>
cd call-card-api

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Optional: Pull remote schema if project already exists
supabase db pull
```

### 2. Run Database Migrations

```bash
# Apply all migrations to create tables and RLS policies
supabase db push
```

This creates:
- `profiles`, `user_google_tokens`, `watch_channels`
- `calendar_events`, `templates`, `callcard`
- RLS policies and triggers

### 3. Configure Environment Variables

Create a `.env.local` file in the `supabase` directory:

```bash
# Supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Google OAuth & Calendar
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Public webhook URL (for Google Calendar notifications)
WEBHOOK_PUBLIC_URL=https://YOUR_PROJECT.supabase.co

# LangSmith AI
LANGSMITH_API_URL=https://api.smith.langchain.com
LANGSMITH_API_KEY=your_langsmith_api_key
LANGSMITH_CALL_TEMPLATE_CREATE_TEMPLATE_ASSISTANT_ID=your_assistant_id
LANGSMITH_CALL_CARD_LEAD_SCORING_ASSISTANT_ID=your_assistant_id  # Optional

# BrightData (Optional - omit to skip LinkedIn scraping)
BRIGHTDATA_API_TOKEN=your_brightdata_token
LINKEDIN_PROFILE_DATASET_ID=your_profile_dataset_id
LINKEDIN_COMPANY_DATASET_ID=your_company_dataset_id
USE_MOCK_DATA=false  # Set to true for development without API costs
```

**⚠️ Production Deployment**: Set these via Supabase Dashboard under **Project Settings → Edge Functions → Secrets** (do NOT commit `.env` files).

### 4. Deploy Edge Functions

```bash
# Deploy all functions to Supabase
supabase functions deploy google-auth-callback
supabase functions deploy google-calendar-setup-handler
supabase functions deploy google-calendar-webhook
supabase functions deploy google-calendar-channel-renewer
supabase functions deploy google-calendar
supabase functions deploy google-calendar-permission
supabase functions deploy callcard
supabase functions deploy templates
supabase functions deploy profiles
supabase functions deploy agent-api
supabase functions deploy scrape-data-integration

# Or deploy all at once
supabase functions deploy
```

### 5. Set Up Webhook Cron Job

Configure automatic renewal of Google Calendar watch channels:

```bash
# In Supabase Dashboard → Database → Cron Jobs, add:
SELECT cron.schedule(
  'renew-google-calendar-channels',
  '0 */6 * * *',  -- Every 6 hours
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/google-calendar-channel-renewer',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

Or manually invoke via:
```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/google-calendar-channel-renewer \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

---

## Usage

### Complete User Flow

#### 1. User Registration
```bash
# Client-side: Sign up with email/password
curl -X POST https://YOUR_PROJECT.supabase.co/auth/v1/signup \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure_password"
  }'
```

#### 2. Google Calendar Authorization

**Step 2a: Initiate OAuth Flow (Client-Side)**
```javascript
// Redirect user to Google OAuth consent screen
const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?
  client_id=${GOOGLE_CLIENT_ID}&
  redirect_uri=${REDIRECT_URI}&
  response_type=code&
  scope=https://www.googleapis.com/auth/calendar.readonly&
  access_type=offline&
  prompt=consent`;

window.location.href = googleAuthUrl;
```

**Step 2b: Exchange Authorization Code**
```bash
# After Google redirects with ?code=AUTHORIZATION_CODE
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/google-auth-callback \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "authorizationCode": "AUTHORIZATION_CODE",
    "redirectUri": "https://yourapp.com/oauth/callback"
  }'
```

Response:
```json
{
  "access_token": "ya29.a0AfH6SMB...",
  "refresh_token": "1//0gZx...",
  "expires_in": 3599,
  "token_type": "Bearer"
}
```

**Step 2c: Activate Calendar Sync**
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/google-calendar-setup-handler \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-from-jwt",
    "googleAccessToken": "ya29.a0AfH6SMB...",
    "googleRefreshToken": "1//0gZx...",
    "accessTokenExpiresAt": "2025-02-04T12:00:00Z"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Google Calendar setup complete."
}
```

✅ **What Happens Next**: Google Calendar now sends push notifications to the webhook whenever events are created/updated.

#### 3. Automatic Call Card Generation

When a user creates a calendar event with attendees:

```
Event Created in Google Calendar:
  Title: "Product Demo - Acme Corp"
  Attendees: john.smith@acme.com
  Time: Tomorrow 2 PM

  ↓ (Google sends webhook notification)

Backend Automatically:
  1. Syncs event to calendar_events table
  2. Detects external attendee (john.smith@acme.com)
  3. Creates DRAFT template
  4. Calls LangSmith AI with:
     - Prospect company: acme.com
     - User context from profile
  5. AI generates use cases, pain points, questions
  6. Updates template to ACTIVE status
  7. Links template to calendar event
```

No manual action required — call card is ready before the meeting!

#### 4. Retrieve Call Cards

**Get All Calendar Events with Templates**
```bash
curl https://YOUR_PROJECT.supabase.co/functions/v1/google-calendar/calendar-events \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

Response:
```json
[
  {
    "id": "event123",
    "title": "Product Demo - Acme Corp",
    "start_time": "2025-02-04T14:00:00Z",
    "attendees": [
      {"email": "john.smith@acme.com", "displayName": "John Smith"}
    ],
    "template_id": "template-uuid-456",
    "callcard_id": null
  }
]
```

**Get Template Details**
```bash
curl https://YOUR_PROJECT.supabase.co/functions/v1/templates/template-uuid-456 \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

Response:
```json
{
  "template_id": "template-uuid-456",
  "template_name": "Acme Corp Enterprise Sales Opportunity",
  "description": "Strategic call preparation for SaaS platform adoption",
  "status": "ACTIVE",
  "sales_framework": {
    "name": "MEDDIC",
    "questions": [...]
  },
  "content": {
    "useCases": [
      {
        "id": "uc1",
        "title": "Revenue Operations Automation",
        "description": "Streamline quote-to-cash processes...",
        "questions": [
          {"id": "q1", "text": "What's your current deal cycle time?"},
          {"id": "q2", "text": "How many manual touchpoints in your sales process?"}
        ]
      }
    ],
    "painPoints": [
      {
        "id": "pp1",
        "title": "Data Fragmentation",
        "description": "Customer data scattered across 5+ systems...",
        "questions": [
          {"id": "q3", "text": "Which systems do your reps log into daily?"}
        ]
      }
    ]
  },
  "created_at": "2025-02-03T10:30:00Z"
}
```

#### 5. Manual Call Card Creation (Alternative)

Users can also create call cards manually:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/callcard \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "callcard_name": "Acme Corp Discovery Call",
    "person_name": "John Smith",
    "person_title": "VP of Sales",
    "company_name": "Acme Corporation",
    "company_funding_stage": "Series B",
    "company_employee_count": 500,
    "company_valuation": 50000000,
    "key_opportunity": "Replace legacy CRM with modern platform",
    "talk_about": ["API integrations", "Data migration", "Pricing models"],
    "calendar_event_id": "event123"
  }'
```

#### 6. Lead Scoring After Call

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/agent-api/lead-scoring \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "framework": "MEDDIC",
    "questions": [
      "What metrics matter most for this project?",
      "Who has final approval authority?",
      "What are your evaluation criteria?"
    ],
    "transcript": {
      "turns": [
        {"speaker": "rep", "text": "What metrics drive this decision?"},
        {"speaker": "prospect", "text": "We need to reduce CAC by 30% this year"},
        {"speaker": "rep", "text": "Who else is involved in the evaluation?"},
        {"speaker": "prospect", "text": "Our CFO and CRO will both need to sign off"}
      ]
    }
  }'
```

Response:
```json
{
  "scoredQuestions": [
    {
      "question": "What metrics matter most for this project?",
      "answer": "Customer acquisition cost reduction of 30%",
      "confidence": 0.92,
      "evidence": "Prospect explicitly stated 'reduce CAC by 30% this year'"
    },
    {
      "question": "Who has final approval authority?",
      "answer": "CFO and CRO joint approval required",
      "confidence": 0.88,
      "evidence": "Mentioned 'CFO and CRO will both need to sign off'"
    }
  ]
}
```

---

## Architecture

The system follows a **serverless edge function architecture** with real-time data synchronization. When a user authorizes Google Calendar access, a **webhook subscription** is created that pushes notifications to Supabase Edge Functions whenever calendar events change. The webhook handler fetches updated events, identifies external attendees as prospects, and triggers an **LangSmith AI assistant** that generates context-aware call preparation content by analyzing both the prospect's company (via domain extraction) and the user's sales context. Generated templates are stored in PostgreSQL with **row-level security** ensuring complete tenant isolation, while a **cron job** automatically renews webhook subscriptions every 6 hours to prevent expiration. The entire flow — from calendar event creation to AI-powered call card generation — happens automatically without user intervention, reducing prep time from hours to seconds.

---

## API Reference

### Authentication

All endpoints require JWT authentication except OAuth callbacks:

```bash
Authorization: Bearer <USER_JWT_TOKEN>
```

Get token from Supabase Auth after login.

---

### Google Calendar Endpoints

#### `POST /functions/v1/google-auth-callback`
Exchange Google authorization code for tokens.

**Request:**
```json
{
  "authorizationCode": "4/0AY0e-g7X...",
  "redirectUri": "https://yourapp.com/callback"
}
```

**Response:**
```json
{
  "access_token": "ya29.a0AfH6...",
  "refresh_token": "1//0gZx...",
  "expires_in": 3599
}
```

---

#### `POST /functions/v1/google-calendar-setup-handler`
Activate calendar sync and create webhook subscription.

**Request:**
```json
{
  "userId": "user-uuid",
  "googleAccessToken": "ya29.a0AfH6...",
  "googleRefreshToken": "1//0gZx...",
  "accessTokenExpiresAt": "2025-02-04T12:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Google Calendar setup complete."
}
```

---

#### `GET /functions/v1/google-calendar/calendar-events`
List user's calendar events with linked templates/callcards.

**Query Parameters:**
- `timeMin` (optional): ISO timestamp for start range
- `timeMax` (optional): ISO timestamp for end range

**Response:**
```json
[
  {
    "id": "event_abc123",
    "title": "Sales Demo - Acme Corp",
    "description": "Product walkthrough",
    "start_time": "2025-02-05T14:00:00Z",
    "end_time": "2025-02-05T15:00:00Z",
    "status": "confirmed",
    "attendees": [
      {
        "email": "john@acme.com",
        "displayName": "John Smith",
        "responseStatus": "accepted"
      }
    ],
    "template_id": "tpl-uuid-456",
    "callcard_id": null,
    "html_link": "https://calendar.google.com/event?eid=..."
  }
]
```

---

#### `POST /functions/v1/google-calendar/calendar-events/:eventId/link-callcard`
Link existing callcard to calendar event.

**Request:**
```json
{
  "callcard_id": "callcard-uuid-789"
}
```

**Response:**
```json
{
  "success": true,
  "event_id": "event_abc123",
  "callcard_id": "callcard-uuid-789"
}
```

---

### Template Endpoints

#### `GET /functions/v1/templates`
List all templates for authenticated user.

**Response:**
```json
[
  {
    "template_id": "tpl-uuid-456",
    "template_name": "Acme Corp Call Prep",
    "description": "Enterprise sales opportunity",
    "status": "ACTIVE",
    "is_default_template": false,
    "sales_framework": {"name": "MEDDIC"},
    "content": {
      "useCases": [...],
      "painPoints": [...]
    },
    "created_at": "2025-02-03T10:00:00Z",
    "updated_at": "2025-02-03T10:05:00Z"
  }
]
```

---

#### `GET /functions/v1/templates/:id`
Get specific template details.

**Response:** Same structure as list item above.

---

#### `POST /functions/v1/templates`
Create template manually (bypasses AI generation).

**Request:**
```json
{
  "template_name": "Custom Template",
  "description": "Manual template creation",
  "content": {
    "useCases": [
      {
        "id": "uc1",
        "title": "Cost Reduction",
        "description": "Save on operational expenses",
        "questions": [
          {"id": "q1", "text": "What's your current monthly spend?"}
        ]
      }
    ],
    "painPoints": []
  },
  "is_default_template": false
}
```

**Response:** Created template object with `template_id`.

---

#### `PUT /functions/v1/templates/:id`
Update existing template.

**Request:** Same as POST (partial updates supported).

---

#### `DELETE /functions/v1/templates/:id`
Delete template.

**Response:**
```json
{
  "success": true
}
```

---

### Call Card Endpoints

#### `GET /functions/v1/callcard`
List all call cards.

**Response:**
```json
[
  {
    "callcard_id": "cc-uuid-789",
    "callcard_name": "Acme Corp Discovery",
    "person_name": "John Smith",
    "person_title": "VP Sales",
    "company_name": "Acme Corporation",
    "company_funding_stage": "Series B",
    "company_employee_count": 500,
    "company_valuation": 50000000,
    "key_opportunity": "CRM replacement project",
    "talk_about": ["Integrations", "Migration timeline"],
    "calendar_event_id": "event_abc123",
    "created_at": "2025-02-03T09:00:00Z"
  }
]
```

---

#### `POST /functions/v1/callcard`
Create new call card.

**Request:**
```json
{
  "callcard_name": "Acme Corp Call",
  "person_name": "John Smith",
  "person_title": "VP Sales",
  "company_name": "Acme Corp",
  "company_funding_stage": "Series B",
  "company_employee_count": 500,
  "key_opportunity": "Enterprise expansion",
  "talk_about": ["API", "Security"],
  "calendar_event_id": "event_abc123"
}
```

**Required fields:**
- `callcard_name`
- `person_name`

**Response:** Created callcard object.

---

#### `PUT /functions/v1/callcard/:id`
Update call card.

**Request:** Partial updates supported.

---

#### `DELETE /functions/v1/callcard/:id`
Delete call card.

---

### AI Agent Endpoints

#### `POST /functions/v1/agent-api/lead-scoring`
Score call transcript against qualification framework.

**Request:**
```json
{
  "framework": "MEDDIC",
  "questions": [
    "What metrics drive this decision?",
    "Who is the economic buyer?",
    "What are your decision criteria?"
  ],
  "transcript": {
    "turns": [
      {"speaker": "rep", "text": "What metrics matter most?"},
      {"speaker": "prospect", "text": "We need to reduce churn by 15%"}
    ]
  }
}
```

**Response:**
```json
{
  "scoredQuestions": [
    {
      "question": "What metrics drive this decision?",
      "answer": "15% churn reduction target",
      "confidence": 0.91,
      "evidence": "Prospect stated 'reduce churn by 15%'"
    }
  ]
}
```

---

### Data Scraping Endpoints

#### `POST /functions/v1/scrape-data-integration/linkedin-profile`
Scrape LinkedIn profile data.

**Request:**
```json
{
  "url": "https://www.linkedin.com/in/johnsmith/"
}
```

**Response:**
```json
{
  "data": {
    "id": "johnsmith",
    "name": "John Smith",
    "city": "San Francisco",
    "country_code": "US",
    "current_company": {
      "name": "Acme Corp",
      "company_id": "acme-corp",
      "link": "https://linkedin.com/company/acme-corp"
    },
    "experience": [...],
    "educations_details": [...]
  }
}
```

**Mock Mode:** Set `USE_MOCK_DATA=true` to return sample data without API costs.

---

#### `POST /functions/v1/scrape-data-integration/linkedin-company-profile`
Scrape company profile.

**Request:**
```json
{
  "url": "https://www.linkedin.com/company/acme-corp/"
}
```

**Response:**
```json
{
  "data": {
    "name": "Acme Corporation",
    "description": "B2B SaaS platform...",
    "company_size": "201-500",
    "website": "https://acme.com",
    "funding": {
      "last_round_type": "Series B",
      "last_round_raised": "$25M"
    },
    "employees_in_linkedin": 487
  }
}
```

---

### Profile Endpoints

#### `GET /functions/v1/profiles`
Get current user's profile.

**Response:**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "username": "johndoe",
  "display_name": "John Doe",
  "company_url": "https://example.com",
  "personal_context": "I'm a sales engineer focused on enterprise SaaS...",
  "company_data": {...},
  "sales_framework": {"name": "MEDDIC"}
}
```

---

#### `PUT /functions/v1/profiles`
Update profile.

**Request:**
```json
{
  "company_url": "https://newcompany.com",
  "personal_context": "Updated background...",
  "sales_framework": {"name": "BANT"}
}
```

---

## Development

### Running Functions Locally

```bash
# Start Supabase local development stack
supabase start

# Serve functions locally
supabase functions serve

# Functions available at http://localhost:54321/functions/v1/<function-name>
```

### Testing Webhooks Locally

Google Calendar webhooks require HTTPS. Use ngrok for local testing:

```bash
# Expose local Supabase
ngrok http 54321

# Update WEBHOOK_PUBLIC_URL in .env.local to ngrok URL
WEBHOOK_PUBLIC_URL=https://abc123.ngrok.io

# Test webhook manually
curl -X POST http://localhost:54321/functions/v1/google-calendar-webhook \
  -H "X-Goog-Channel-Id: test-channel" \
  -H "X-Goog-Resource-Id: primary" \
  -H "X-Goog-Resource-State: exists"
```

Alternatively, use the included test script:

```bash
cd supabase/functions/google-calendar-webhook
deno run --allow-net --allow-env --allow-read test-webhook.ts
```

### Mock Data Mode

For UI development without API costs:

```bash
# In .env.local
USE_MOCK_DATA=true

# LinkedIn scraping endpoints will return realistic mock data
# No BrightData API calls or charges
```

---

## Database Schema

Key tables:

- **`profiles`** – User accounts with company context and sales framework preference
- **`user_google_tokens`** – Encrypted OAuth tokens for Google Calendar access
- **`watch_channels`** – Active Google Calendar webhook subscriptions
- **`calendar_events`** – Synced calendar events with attendee tracking
- **`templates`** – AI-generated call preparation guides (v1)
- **`callcard`** – Meeting-specific prep with prospect intelligence (v2)

All tables use **Row-Level Security (RLS)** to ensure users access only their own data.

View full schema:
```bash
supabase db diff
```

---

## Security

- **JWT Authentication** – All endpoints require valid Supabase auth tokens
- **Row-Level Security** – PostgreSQL RLS policies enforce user data isolation
- **Token Encryption** – Google OAuth tokens stored in secure `user_google_tokens` table
- **Environment Variables** – Secrets managed via Supabase Edge Function secrets (not committed)
- **Webhook Validation** – Google Calendar webhooks validated via `X-Goog-` headers

---

## Troubleshooting

### Google Calendar Not Syncing

1. **Check watch channel status:**
```bash
# Query watch_channels table
SELECT * FROM watch_channels WHERE user_id = 'YOUR_USER_ID';
```

2. **Verify expiration hasn't passed:**
```sql
SELECT * FROM watch_channels
WHERE expiration_timestamp < NOW();
```

3. **Manually renew channels:**
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/google-calendar-channel-renewer \
  -H "Authorization: Bearer SERVICE_ROLE_KEY"
```

### Template Generation Failing

Check `templates.error_message` for AI errors:

```sql
SELECT template_id, status, error_message
FROM templates
WHERE status = 'ERROR';
```

Common causes:
- Invalid LangSmith assistant ID
- Missing user `personal_context` in profile
- Network timeout to LangSmith API

### Local Development Issues

**Function not hot-reloading:**
```bash
# Restart Supabase stack
supabase stop
supabase start
```

**Database migration conflicts:**
```bash
# Reset local database
supabase db reset
```

---

## License

[Specify your license here]

---

## Contributing

This is a portfolio project. For inquiries or collaboration, contact [your email/website].

---

## Roadmap

**Potential Enhancements:**
- [ ] Slack integration for pre-meeting notifications
- [ ] CRM sync (Salesforce, HubSpot) for automatic call card linking
- [ ] Real-time collaboration on call cards (multi-user editing)
- [ ] Voice transcription integration (Zoom, Google Meet)
- [ ] Custom AI assistant training per user/team
- [ ] Mobile app (React Native) for on-the-go call prep

---

**Built with:** Supabase, Deno, PostgreSQL, Google Calendar API, LangSmith AI, BrightData
