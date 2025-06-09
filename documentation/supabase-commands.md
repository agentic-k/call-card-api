# API - function related commands

## deploy a function 
supabase functions deploy <function-name>

## run all functions:
supabase functions serve --all

## Run all function with specific env file
supabase functions serve --env-file ./supabase/.env.local --no-verify-jwt


## Create a new function
supabase functions new templates

## Generate token with password
curl -X POST 'http: //localhost:54321/auth/v1/token?grant_type=password' \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
  "email": "<email>",
  "password": "<password>"
}'

# Database - Related commands

## generate types 
supabase gen types typescript --local > supabase/types/database.types.ts
