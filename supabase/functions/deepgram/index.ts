// index.ts
import { serve } from "https://deno.land/std@0.114.0/http/server.ts";
import { checkUser } from "./libs/auth.ts";
import { corsHeaders, safeCloseSocket } from "./libs/utils.ts";
import { setupDeepgramConnection, wireSockets } from "./libs/deepgram.ts";

serve(async (req: Request) => {
  console.info(`Incoming request: ${req.method} ${req.url}`);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return new Response("Expected a WebSocket upgrade", {
      status: 400,
      headers: corsHeaders,
    });
  }

  // Extract JWT from Sec-WebSocket-Protocol
  const protocols = (req.headers.get("Sec-WebSocket-Protocol") ?? "")
    .split(",")
    .map((p) => p.trim());
  const jwt = protocols.find((p) => p.startsWith("jwt-"))?.slice(4) ?? null;

  const user = await checkUser(jwt);
  if (!user) {
    return new Response("Authentication failed", {
      status: 401,
      headers: corsHeaders,
    });
  }

  console.info("starting deepgram connection for user:", user.id);
  // Perform WebSocket upgrade
  let clientSocket: WebSocket;
  let upgradeResponse: Response;
  try {
    const { socket, response } = Deno.upgradeWebSocket(req, {
      protocol: jwt ? `jwt-${jwt}` : "",
    });
    clientSocket = socket;
    upgradeResponse = response;
  } catch (e) {
    console.error("Upgrade failed:", e);
    return new Response("WebSocket upgrade error", {
      status: 500,
      headers: corsHeaders,
    });
  }

  console.info("connecting to deepgram...");

  // Once client opens, connect Deepgram and wire messages
  clientSocket.onopen = async () => {
    console.info("Client WebSocket open");
    try {
      const dgSocket = await setupDeepgramConnection();
      wireSockets(clientSocket, dgSocket);
    } catch (e) {
      console.error("Deepgram setup failed:", e);
      safeCloseSocket(clientSocket, 1011, "Deepgram connection error");
    }
  };

  clientSocket.onclose = (ev) => {
    console.info(`Client closed: code=${ev.code}, reason=${ev.reason}`);
    safeCloseSocket(null, 1000, "Client closed");
  };
  clientSocket.onerror = (ev) => {
    console.error("Client socket error:", ev);
    safeCloseSocket(null, 1011, "Client error");
  };

  return upgradeResponse;
});
