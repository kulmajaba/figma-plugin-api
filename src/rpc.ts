import { InvalidRequest, MethodNotFound, RPCError } from './errors';
import {
  ApiFunctions,
  RPCCallBack,
  RPCMessage,
  RPCMethodObject,
  RPCNotification,
  RPCRequest,
  RPCResponse,
  RPCSendRaw,
  isRpcNotification,
  isRpcResponse,
  isRpcResponseError,
  isRpcResponseResult
} from './types';
import { logError, logWarn } from './utils';

// Methods for processing remote API calls (set up on-host)
const methods: RPCMethodObject<ApiFunctions> = {};
type MethodName = keyof typeof methods & string;

// Pending API calls (used off-host)
const pending: Record<number, RPCCallBack<(typeof methods)[MethodName]>> = {};
let rpcIndex = 0;

let sendRaw: RPCSendRaw;

const sendJson = <P extends unknown[], T>(msg: RPCMessage<P, T>) => {
  try {
    sendRaw(msg);
  } catch (err) {
    logError(err);
  }
};

const sendResult = <T>(id: number, result: T) => {
  sendJson({
    jsonrpc: '2.0',
    id,
    result
  });
};

const sendError = (id: number, error: RPCError) => {
  sendJson({
    jsonrpc: '2.0',
    id,
    error: {
      code: error.code,
      message: error.message,
      data: error.data
    }
  });
};

const handleRpc = <P extends unknown[], T>(json: RPCNotification<P> | RPCResponse<T>) => {
  if (!isRpcNotification(json)) {
    if (isRpcResponse(json)) {
      const callback = pending[json.id];
      if (!callback) {
        sendError(json.id, new InvalidRequest(`Missing callback for ${json.id}`));
        return;
      }
      if (callback.timeout) {
        clearTimeout(callback.timeout);
      }
      delete pending[json.id];
      callback(isRpcResponseResult(json) ? json.result : undefined, isRpcResponseError(json) ? json.error : undefined);
    } else {
      handleRequest(json);
    }
  } else {
    handleNotification(json);
  }
};

export const handleRaw = <P extends unknown[], T>(data: RPCNotification<P> | RPCResponse<T>) => {
  try {
    if (!data) {
      return;
    }
    handleRpc(data);
  } catch (err) {
    logError('handleRaw error', err, data);
  }
};

const onRequest = <K extends MethodName>(method: K, params: Parameters<(typeof methods)[K]> | undefined) => {
  if (!methods[method]) {
    logError(`onRequest: Method ${method} not found in methods: ${Object.keys(methods)}`);
    throw new MethodNotFound(method);
  }
  if (params === undefined) {
    return methods[method]();
  }
  return methods[method](...params);
};

const handleNotification = <P extends unknown[]>(json: RPCNotification<P>) => {
  if (!json.method) {
    logWarn(`handleNotification: no method specified in message ${json}`);
    return;
  }

  onRequest(json.method, json.params);
};

const handleRequest = async <P extends unknown[]>(json: RPCRequest<P>) => {
  if (!json.method) {
    logWarn(`handleRequest: no method specified in message ${json}`);
    sendError(json.id, new InvalidRequest('No method specified in message'));
    return;
  }

  try {
    const result = await onRequest(json.method, json.params);
    if (result !== undefined && result instanceof Promise) {
      try {
        await result;
        sendResult(json.id, result);
      } catch (e) {
        sendError(json.id, e as RPCError);
      }
    } else {
      sendResult(json.id, result);
    }
  } catch (err) {
    sendError(json.id, err as RPCError);
  }
};

/**
 *
 * @param _methods Remote API call handlers
 * @param _sendRaw Function for sending the raw JSON, e.g. `parent.postMessage`
 * @param _logBase Logger function for context-aware logging
 */
export const setupMethods = <T extends RPCMethodObject<ApiFunctions>>(_methods: T) => {
  Object.assign(methods, _methods);
};

export const setSendRaw = (_sendRaw: RPCSendRaw) => {
  sendRaw = _sendRaw;
};

export const sendNotification = <P extends unknown[]>(method: string, params: P) => {
  sendJson({ jsonrpc: '2.0', method, params });
};

export const sendRequest = <K extends MethodName, P extends unknown[]>(method: K, params: P, timeoutMs: number) => {
  return new Promise((resolve, reject) => {
    const id = rpcIndex;
    const req: RPCRequest<P> = { jsonrpc: '2.0', method, params, id };
    rpcIndex += 1;
    const callback: RPCCallBack<(typeof methods)[K]> = (result, err) => {
      if (err) {
        const jsError = new RPCError(err.code, err.message, err.data);
        reject(jsError);
        return;
      }
      resolve(result);
    };

    // Set the timeout
    callback.timeout = setTimeout(() => {
      delete pending[id];
      logWarn(`Request id ${id} (${method}) timed out.`);
      reject(new Error(`Request ${id} (${method}) timed out.`));
    }, timeoutMs);

    pending[id] = callback;
    sendJson(req);
  });
};
