// Import necessary modules
import { serve } from "https://deno.land/std@0.114.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Retrieve your API keys from environment variables
const DEEPGRAM_API_KEY = Deno.env.get("VITE_DEEPGRAM_API_KEY") ?? Deno.env.get("DEEPGRAM_API_KEY");
const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL");
// Use SUPABASE_ANON_KEY for client-side auth checks
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");

if (!DEEPGRAM_API_KEY) {
  throw new Error("VITE_DEEPGRAM_API_KEY is not set in environment variables.");
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set in environment variables.");
}

// Define CORS headers (though less critical for WebSockets post-upgrade)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, sec-websocket-protocol',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', // Include necessary methods
};

// Define the Deepgram streaming endpoint
const DEEPGRAM_WS_ENDPOINT = "wss://api.deepgram.com/v1/listen";

async function checkUser(token: string | null) {
  if (!token) {
    console.error('No authentication token provided');
    return null;
  }

  // Create a Supabase client configured to use the provided token
  const supabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY, // Use anon key for client-side checks
    {
      global: {
        headers: { Authorization: `Bearer ${token}` }, // Pass token in Authorization header format
      },
    }
  );

  // Verify the session using the token
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

  if (sessionError || !session) {
    console.error('Session error or no session found:', sessionError?.message || 'No session');
    // Optionally try getUser if getSession fails but a token exists
    // This might happen depending on Supabase client library versions or specific auth flows
    const { data: { user: userFromGetUser }, error: getUserError } = await supabaseClient.auth.getUser();
    if (getUserError || !userFromGetUser) {
        console.error('Attempt to getUser also failed:', getUserError?.message || 'No user');
        return null;
    }
    console.log('Session check failed, but getUser succeeded for user:', userFromGetUser.id);
    return userFromGetUser; // Return user found via getUser
  }

  // Get the user details from the validated session
  // Note: Often getSession is sufficient, but getUser confirms details
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    console.error('User error or no user found even with valid session:', userError?.message || 'No user');
    return null;
  }

  console.log('Authenticated user:', user.id);
  return user;
}

// Start the server
serve(async (req: Request) => {
  console.log(`Request received: ${req.method} ${req.url}`);

  // Handle CORS preflight requests for the initial HTTP connection
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  // Check for WebSocket upgrade request
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    console.log("Request is not a WebSocket upgrade request.");
    return new Response("Expected a WebSocket upgrade request.", { status: 400, headers: corsHeaders });
  }

  // --- Authentication ---
  // Sec-WebSocket-Protocol may return multiple protocol values `jwt-TOKEN, value1, value 2`
  const customProtocols = (req.headers.get("Sec-WebSocket-Protocol") ?? '').split(',').map(p => p.trim());
  const jwtToken = customProtocols.find(p => p.startsWith('jwt-'))?.replace('jwt-', '');

  // Pass jwtToken or null to checkUser
  const user = await checkUser(jwtToken ?? null);

  if (!user) {
      console.error("User authentication failed.");
      // IMPORTANT: For WebSocket upgrades, you cannot return a standard HTTP response body on failure *after* the handshake starts.
      // The correct way is to return an appropriate HTTP status code *before* upgrading.
      // If Deno.upgradeWebSocket is called and auth fails, the connection might still upgrade but then immediately close.
      // The client needs to handle the abrupt closure or lack of expected protocol in the response headers.
      return new Response("Authentication failed.", { status: 401, headers: corsHeaders }); // Send 401 before upgrade
  }

  // Construct the validated protocol string expected by the client
  const validatedProtocol = jwtToken ? `jwt-${jwtToken}` : ''; // Handle case where token might somehow be missing after checkUser (shouldn't happen)

  // --- Upgrade WebSocket Connection ---
  let upgradeResponse: Response;
  let clientSocket: WebSocket;
  try {
      const upgradeResult = Deno.upgradeWebSocket(req, {
          protocol: validatedProtocol, // Tell Deno to include this in the response handshake
      });
      clientSocket = upgradeResult.socket;
      upgradeResponse = upgradeResult.response; // This response has status 101 Switching Protocols
  } catch (error) {
      console.error("WebSocket upgrade failed:", error);
      return new Response("WebSocket upgrade failed.", { status: 500, headers: corsHeaders });
  }


  // --- WebSocket Logic ---
  let deepgramSocket: WebSocket | null = null;

  // Helper function for safe closing with valid codes
  const safeCloseSocket = (socket: WebSocket | null, code = 1000, reason = "") => {
    try {
      if (socket && socket.readyState === WebSocket.OPEN) {
        console.log(`Closing socket with code ${code}, reason: ${reason}`);
        socket.close(code, reason);
      }
    } catch (e) {
      console.error("Error closing socket:", e);
    }
  };

  // Ensure Deepgram connection is fully ready before use
  const setupDeepgramConnection = (): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(
          `${DEEPGRAM_WS_ENDPOINT}?encoding=linear16&sample_rate=48000`,
          ["token", DEEPGRAM_API_KEY]
        );

        ws.onopen = () => {
          console.log("Connected to Deepgram.");
          resolve(ws);
        };

        ws.onerror = (event) => {
          console.error("Deepgram WebSocket error:", event);
          reject(new Error("Deepgram WebSocket error"));
        };

        ws.onclose = (event) => {
          console.warn(`Deepgram WebSocket closed prematurely: Code ${event.code}, Reason: ${event.reason}`);
          reject(new Error("Deepgram WebSocket closed before use"));
        };
      } catch (error) {
        reject(error);
      }
    });
  };

  clientSocket.onopen = async () => {
    console.log("Client WebSocket connection established.");
    try {
      deepgramSocket = await setupDeepgramConnection();

      // This handler receives transcripts FROM Deepgram and sends them TO the client
      deepgramSocket.onmessage = (event) => {
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(event.data);
        }
      };

      // This handler receives audio data FROM the client and sends it TO Deepgram
      // Assign this *only after* deepgramSocket is open
      clientSocket.onmessage = (event) => {
        try {
          // No need to check deepgramSocket.readyState here anymore, 
          // as this handler is only active when it's open.
          // However, a check for clientSocket state might still be useful.
          if (clientSocket.readyState !== WebSocket.OPEN) {
            console.warn("Client socket closed, cannot forward message to Deepgram.");
            return;
          }

          if (typeof event.data === "string") {
            console.log("Client message (sting):", event.data);
            // Handle potential control messages if needed
          } else if (deepgramSocket?.readyState === WebSocket.OPEN) { // Still good practice to check DG state before sending
            deepgramSocket.send(event.data);
          } else {
            console.warn("Deepgram socket closed unexpectedly before sending data.");
          }
        } catch (err) {
          console.error("Error in clientSocket.onmessage:", err);
          safeCloseSocket(clientSocket, 1011, "Server message handling failed");
        }
      };

      deepgramSocket.onerror = (event) => {
        console.error("Deepgram error after open:", event);
        // Use a more specific code if available, otherwise 1011 (Internal Error)
        const closeCode = event instanceof ErrorEvent && event.error?.code ? event.error.code : 1011;
        safeCloseSocket(clientSocket, closeCode, "Deepgram WebSocket error after open");
      };

      deepgramSocket.onclose = (event) => {
        console.log(`Deepgram closed: ${event.code} - ${event.reason}`);
        // Use the code from Deepgram if it's a standard WebSocket code, otherwise use 1000
        const closeCode = event.code >= 1000 && event.code < 5000 ? event.code : 1000;
        safeCloseSocket(clientSocket, closeCode, `Deepgram closed connection: ${event.reason}`);
      };

    } catch (error) {
      console.error("Failed to establish Deepgram connection:", error);
      safeCloseSocket(clientSocket, 1011, "Could not connect to Deepgram");
    }
  };

  // Handle client closing the connection
  clientSocket.onclose = (event) => {
    console.log(`Client WebSocket closed: Code ${event.code}, Reason: ${event.reason}`);
    safeCloseSocket(deepgramSocket, 1000, "Client closed connection");
  };

  // Handle errors on the client socket itself
  clientSocket.onerror = (event) => {
    console.error("Client WebSocket error:", event);
    // Attempt to close Deepgram socket if client errors out
    // Use a generic error code 1011
    safeCloseSocket(deepgramSocket, 1011, "Client WebSocket error");
  };

  // Return the 101 Switching Protocols response
  return upgradeResponse;
});
