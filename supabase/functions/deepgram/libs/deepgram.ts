// deepgram.ts
import { safeCloseSocket } from "./utils.ts";

const DEEPGRAM_WS_ENDPOINT = "wss://api.deepgram.com/v1/listen";
const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY")!;

if (!DEEPGRAM_API_KEY) {
  throw new Error("DEEPGRAM_API_KEY is not set");
}

/**
 * Establishes a WebSocket connection to Deepgram
 */
export function setupDeepgramConnection(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    try {
      console.info("Creating WebSocket connection to Deepgram...");
      console.info("API key available:", !!DEEPGRAM_API_KEY);
      
      const ws = new WebSocket(
        `${DEEPGRAM_WS_ENDPOINT}?encoding=linear16&sample_rate=48000`,
        ["token", DEEPGRAM_API_KEY],
      );

      ws.onopen = () => {
        console.info("Connected to Deepgram");
        resolve(ws);
      };
      ws.onerror = (e) => {
        console.error("Deepgram error:", e);
        reject(new Error("Deepgram WebSocket error"));
      };
      ws.onclose = (e) => {
        console.warn(`Deepgram closed: ${e.code}, ${e.reason}`);
        reject(new Error("Deepgram closed before use"));
      };
    } catch (e) {
      console.error("Error creating Deepgram WebSocket:", e);
      reject(e);
    }
  });
}

/**
 * Bridges messages between clientSocket and the Deepgram socket
 */
export function wireSockets(clientSocket: WebSocket, deepgramSocket: WebSocket) {
  deepgramSocket.onmessage = (ev) => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(ev.data);
    }
  };

  clientSocket.onmessage = (ev) => {
    try {
      if (deepgramSocket.readyState === WebSocket.OPEN && ev.data instanceof ArrayBuffer) {
        deepgramSocket.send(ev.data);
      }
    } catch (err) {
      console.error("Client → Deepgram forwarding error:", err);
      safeCloseSocket(clientSocket, 1011, "Forwarding failed");
    }
  };

  deepgramSocket.onerror = (ev) => {
    console.error("Deepgram runtime error:", ev);
    safeCloseSocket(clientSocket, 1011, "Deepgram error");
  };
  deepgramSocket.onclose = (ev) => {
    console.info(`Deepgram terminated: ${ev.code}`, ev.reason);
    safeCloseSocket(clientSocket, ev.code, ev.reason);
  };
}
