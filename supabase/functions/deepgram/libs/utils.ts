// utils.ts      # CORS headers, safeCloseSocket, config// ADHD tip: Keep helpers tiny & documented

// 1. Load & validate env vars once
export const config = {
    DEEPGRAM_API_KEY: Deno.env.get("DEEPGRAM_API_KEY") ?? (() => { throw new Error("Missing DEEPGRAM_API_KEY"); })(),
    SUPABASE_URL:     Deno.env.get("SUPABASE_URL")     ?? (() => { throw new Error("Missing SUPABASE_URL"); })(),
    SUPABASE_ANON_KEY:Deno.env.get("SUPABASE_ANON_KEY")?? (() => { throw new Error("Missing SUPABASE_ANON_KEY"); })(),
  };
  
  // 2. Common CORS headers
  export const corsHeaders = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, sec-websocket-protocol",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
  
  // 3. Graceful socket closer
  export function safeClose(socket: WebSocket | null, code = 1000, reason = "") {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close(code, reason);
    }
  }