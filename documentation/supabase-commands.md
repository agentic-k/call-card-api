# ********************** MIGRATIONS *********************** #
1. Push migration 
  `supabase db push --db-url postgresql://postgres:postgres@127.0.0.1:54322/postgres`

2. Generate types 
`supabase gen types typescript --local > 'supabase/functions/_libs/types/database.types.ts'`


# ********************** API *********************** #

Run all functions:
`supabase functions serve --all`

Run all function with specific env file
`supabase functions serve --env-file ./supabase/.env.local --no-verify-jwt`

# ********************** FUNCTION *********************** #
## Create a new function
supabase functions new templates

# ********************** DEPLOYMENT *********************** #

deploy a function:
`supabase functions deploy <function-name>`

## Generate token with password
=curl -X POST 'http: //localhost:54321/auth/v1/token?grant_type=password' \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
  "email": "<email>",
  "password": "<password>"
}'

# Database - Related commands

