// Deepgram connection setup and WS handlers
import { config } from "./utils.ts";

// Deepgram connection setup and WS handlers
const WS_ENDPOINT = "wss://api.deepgram.com/v1/listen";

/**
 * Create & open a socket to Deepgram
 */
export function createDeepgramSocket(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      `${WS_ENDPOINT}?encoding=linear16&sample_rate=48000`,
      ["token", config.DEEPGRAM_API_KEY]
    );

    ws.onopen  = () => resolve(ws);
    ws.onerror = () => reject(new Error("DG WS error"));
    ws.onclose = () => reject(new Error("DG WS closed early"));
  });
}

/**
 * Attach handlers for message & errors
 */
export function attachDeepgramHandlers(
  client: WebSocket,
  dg: WebSocket
) {
  // Forward transcripts
  dg.onmessage = (e) => client.send(e.data);

  // Forward audio
  client.onmessage = (e) => {
    if (typeof e.data !== "string" && dg.readyState === WebSocket.OPEN) {
      dg.send(e.data);
    }
  };

  // Cleanup on errors
  dg.onerror   = () => client.close(1011, "DG error");
  dg.onclose   = (e) => client.close(e.code, e.reason);
  client.onclose = () => dg.close(1000, "Client closed");
}