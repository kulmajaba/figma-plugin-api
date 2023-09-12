export class RPCError extends Error {
  code: number;
  message: string;
  data: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super();
    this.code = code;
    this.message = message;
    this.data = data;
  }
}

/**
 * Invalid JSON was received by the server.
 * An error occurred on the server while parsing the JSON text.
 */
export class ParseError extends RPCError {
  constructor(data?: unknown) {
    super(-32700, 'Parse error', data);
  }
}

/**
 * The JSON sent is not a valid Request object.
 */
export class InvalidRequest extends RPCError {
  constructor(data?: unknown) {
    super(-32600, 'Invalid request', data);
  }
}

/**
 * The method does not exist / is not available.
 */
export class MethodNotFound extends RPCError {
  constructor(data?: unknown) {
    super(-32601, 'Method not found', data);
  }
}

/**
 * Invalid method parameter(s).
 */
export class InvalidParams extends RPCError {
  constructor(data?: unknown) {
    super(-32602, 'Invalid params', data);
  }
}

/**
 * Internal JSON-RPC error.
 */
export class InternalError extends RPCError {
  constructor(data?: unknown) {
    super(-32603, 'Internal error', data);
  }
}
