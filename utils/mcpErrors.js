export const MCP_ERROR_CODES = {
  BAD_REQUEST: -32003,
  INTERNAL_ERROR: -32603,
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
};

export function createMcpError(code, message, id = null) {
  return {
    jsonrpc: "2.0",
    error: {
      code,
      message,
    },
    id,
  };
}

export function createBadRequestError(message, id = null) {
  return createMcpError(MCP_ERROR_CODES.BAD_REQUEST, message, id);
}

export function createInternalError(message, id = null) {
  return createMcpError(
    MCP_ERROR_CODES.INTERNAL_ERROR,
    message || "Internal server error",
    id,
  );
}

export function extractRpcId(body) {
  return body && body.id !== undefined ? body.id : null;
}
