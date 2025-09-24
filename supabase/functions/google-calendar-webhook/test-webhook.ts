// Test script for google-calendar-webhook
// This script simulates a Google Calendar webhook notification

import { createClient } from 'npm:@supabase/supabase-js@2.49.4'
import { v4 as uuidv4 } from 'npm:uuid'
import { load } from "https://deno.land/std@0.214.0/dotenv/mod.ts"

// Load environment variables from .env file
try {
  const env = await load({
    envPath: '../../.env.local',
  })
  
  // Set environment variables from .env file
  for (const [key, value] of Object.entries(env)) {
    Deno.env.set(key, String(value))
  }
} catch (error) {
  console.warn("Could not load .env file, falling back to environment variables:", 
    error instanceof Error ? error.message : String(error))
}

// Get environment variables
let SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Fix Docker URL for local testing
if (SUPABASE_URL && SUPABASE_URL.includes('host.docker.internal')) {
  SUPABASE_URL = SUPABASE_URL.replace('host.docker.internal', 'localhost')
  console.log('Updated SUPABASE_URL for local testing:', SUPABASE_URL)
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables')
  console.error('SUPABASE_URL:', SUPABASE_URL)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET')
  Deno.exit(1)
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function runMockTest() {
  console.log('Running mock webhook test (without Google tokens)...')
  
  // Test the webhook endpoint directly to see if it's accessible
  const webhookUrl = `${SUPABASE_URL}/functions/v1/google-calendar-webhook`
  
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Channel-ID': 'test-channel-mock',
    'X-Goog-Resource-ID': 'test-calendar-mock',
    'X-Goog-Resource-State': 'exists',
  }
  
  console.log(`Testing webhook endpoint: ${webhookUrl}`)
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    })
    
    console.log(`Webhook response status: ${response.status}`)
    const responseText = await response.text()
    console.log(`Webhook response: ${responseText}`)
    
    if (response.status === 403 && responseText.includes('Could not obtain valid token')) {
      console.log('✅ Webhook is working correctly - it properly rejects requests without valid Google tokens')
    } else {
      console.log('⚠️  Unexpected response from webhook')
    }
  } catch (error) {
    console.error('❌ Failed to test webhook endpoint:', error)
  }
}

async function runTest() {
  try {
    console.log('Starting webhook test...')
    
    // 1. Get a user with Google tokens to test with
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select(`
        id, 
        email,
        user_google_tokens!inner(
          google_access_token,
          google_refresh_token
        )
      `)
      .not('user_google_tokens.google_refresh_token', 'is', null)
      .limit(1)
    
    if (userError || !users || users.length === 0) {
      console.log('No users with Google tokens found. Creating a mock test...')
      await runMockTest()
      return
    }
    
    const testUser = users[0]
    console.log(`Using test user with Google tokens: ${testUser.email} (${testUser.id})`)
    
    // 2. Create a test watch channel
    const channelId = `test-channel-${uuidv4()}`
    const resourceId = `test-calendar-${uuidv4()}`
    const expirationTime = new Date()
    expirationTime.setDate(expirationTime.getDate() + 7) // 7 days from now
    
    const { data: _channel, error: channelError } = await supabase
      .from('watch_channels')
      .insert({
        channel_id: channelId,
        resource_id: resourceId,
        user_id: testUser.id,
        expiration_timestamp: expirationTime.toISOString(),
      })
      .select()
      .single()
    
    if (channelError) {
      throw new Error(`Failed to create test watch channel: ${channelError.message}`)
    }
    
    console.log(`Created test watch channel: ${channelId}`)
    
    // 3. Create a mock webhook request
    const webhookUrl = `${SUPABASE_URL}/functions/v1/google-calendar-webhook`
    
    const headers = {
      'Content-Type': 'application/json',
      'X-Goog-Channel-ID': channelId,
      'X-Goog-Resource-ID': resourceId,
      'X-Goog-Resource-State': 'exists',
      'X-Goog-Channel-Token': 'test-token',
      'X-Goog-Channel-Expiration': expirationTime.toISOString(),
    }
    
    console.log(`Sending test webhook request to: ${webhookUrl}`)
    console.log('Headers:', headers)
    
    // 4. Send the webhook request
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    })
    
    console.log(`Webhook response status: ${response.status}`)
    console.log(`Webhook response: ${await response.text()}`)
    
    // 5. Clean up the test data
    const { error: deleteError } = await supabase
      .from('watch_channels')
      .delete()
      .eq('channel_id', channelId)
    
    if (deleteError) {
      console.warn(`Failed to clean up test watch channel: ${deleteError.message}`)
    } else {
      console.log('Test data cleaned up successfully')
    }
    
    console.log('Test completed')
  } catch (error) {
    console.error('Test failed:', error)
  }
}

runTest()
