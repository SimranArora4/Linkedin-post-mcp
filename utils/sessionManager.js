import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { v4 as uuidv4 } from "uuid";

export const transports = new Map();
export const pendingTransports = new Map();

export async function createSseSession(res, mcpServer) {
  const transport = new SSEServerTransport("/mcp/message", res);
  const sessionId = transport.sessionId;

  console.log(`[Session] Creating new SSE transport: ${sessionId}`);

  transport.onclose = () => {
    console.log(`[Session] SSE Transport closed: ${sessionId}`);
    cleanupSession(sessionId);
  };

  transports.set(sessionId, transport);

  try {
    await mcpServer.connect(transport);
    console.log(`[Session] SSE Transport connected successfully: ${sessionId}`);
  } catch (error) {
    console.error(`[Session] Failed to connect SSE transport: ${sessionId}`, error);
    transports.delete(sessionId);
    throw error;
  }

  return { sessionId, transport };
}

export async function createAndConnectTransport(sessionId, mcpServer) {
  if (pendingTransports.has(sessionId) || transports.has(sessionId)) {
    console.log(`[Session] Reusing existing transport for session: ${sessionId}`);
    return pendingTransports.get(sessionId) || transports.get(sessionId);
  }

  console.log(`[Session] Creating new transport for session: ${sessionId}`);

  const transport = new StreamableHTTPServerTransport({
    enableJsonResponse: true,
    eventSourceEnabled: true,
    onsessioninitialized: (actualId) => {
      console.log(`[Session] Transport initialized: ${actualId}`);
      pendingTransports.delete(actualId);
    },
  });

  transport.onclose = () => {
    console.log(`[Session] Transport closed for session: ${sessionId}`);
    cleanupSession(sessionId);
  };

  pendingTransports.set(sessionId, transport);
  transports.set(sessionId, transport);

  try {
    await mcpServer.connect(transport);
    console.log(`[Session] Transport connected successfully: ${sessionId}`);
  } catch (error) {
    console.error(`[Session] Failed to connect transport: ${sessionId}`, error);
    pendingTransports.delete(sessionId);
    transports.delete(sessionId);
    throw error;
  }

  return transport;
}

export function cleanupSession(sessionId) {
  if (transports.has(sessionId)) {
    console.log(`[Session] Cleaning up session: ${sessionId}`);
    transports.delete(sessionId);
  }
  if (pendingTransports.has(sessionId)) {
    pendingTransports.delete(sessionId);
  }
}

export function getTransport(sessionId) {
  return transports.get(sessionId);
}

export function generateSessionId() {
  return uuidv4();
}
