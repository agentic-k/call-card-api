# Concept 

All function are deployed with JWT verfiication enabled, but not the websocket

## Commands

### 1. w/ JWT-Verification ENABLED
this will deploy all 
`supabase functions deploy --project-ref {{project-id}}`

### 2. w/ JWT-Verification DISABLED 
this will redeploy web-socket without the jwt
`supabase functions deploy google-calendar-webhook --no-verify-jwt`