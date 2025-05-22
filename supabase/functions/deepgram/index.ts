import { serve } from "https://deno.land/std@0.114.0/http/server.ts";
import { corsHeaders, safeClose } from "./libs/utils.ts";
import { checkUser } from "./libs/auth.ts";
import { createDeepgramSocket, attachDeepgramHandlers } from "./libs/deepgram.ts";

/**
 * Extract `jwt-` token from headers
 */
function extractJwt(req: Request): string | undefined {
  const hdr = req.headers.get("Sec-WebSocket-Protocol") ?? "";
  return hdr.split(",").map(s => s.trim())
    .find(p => p.startsWith("jwt-"))
    ?.replace("jwt-", "");
}

serve(async (req) => {
  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Must be WS upgrade
  if ((req.headers.get("upgrade") ?? "").toLowerCase() !== "websocket") {
    return new Response("Must upgrade", { status: 400, headers: corsHeaders });
  }

  // Auth
  const jwt = extractJwt(req);
  const user = await checkUser(jwt);
  if (!user) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  // Upgrade & wire sockets
  const { socket, response } = Deno.upgradeWebSocket(req, {
    protocol: jwt ? `jwt-${jwt}` : undefined,
  });

  socket.onopen = async () => {
    try {
      const dg = await createDeepgramSocket();
      attachDeepgramHandlers(socket, dg);
    } catch {
      safeClose(socket, 1011, "DG failed");
    }
  };

  return response;
});