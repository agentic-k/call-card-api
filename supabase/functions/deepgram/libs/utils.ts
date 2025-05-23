// shared/utils.ts
import * as log from "https://deno.land/std@0.224.0/log/mod.ts";

// CORS headers configuration
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, sec-websocket-protocol",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Safe WebSocket close helper
export function safeCloseSocket(socket: WebSocket | null, code = 1000, reason = "") {
  try {
    if (socket && socket.readyState === WebSocket.OPEN) {
      log.info(`Closing socket: code=${code}, reason=${reason}`);
      socket.close(code, reason);
    }
  } catch (e) {
    log.error("Error closing socket:", e);
  }
}
