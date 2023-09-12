/* eslint-disable @typescript-eslint/no-explicit-any */

export type LogLevel = 'log' | 'warn' | 'error';

export type AwaitedReturn<T extends (...params: any) => any> = ReturnType<T> extends Promise<any>
  ? Awaited<ReturnType<T>>
  : ReturnType<T>;

export type StrictParameters<T extends (...args: any[]) => any> = T extends (...args: infer P) => any ? P : never;

export type ApiFunctions = {
  [x: string]: (...params: any[]) => any;
};

export type RPCMethodObject<T extends ApiFunctions> = {
  [K in keyof T]: (...args: StrictParameters<T[K]>) => Promise<AwaitedReturn<T[K]>>;
};

export type RPCAPIReturnType<T extends RPCMethodObject<ApiFunctions>> = {
  [K in keyof T]: (...args: StrictParameters<T[K]>) => Promise<AwaitedReturn<T[K]>>;
};

export type RPCErrorObject = {
  code: number;
  message: string;
  data: unknown;
};

export interface RPCNotification<P extends unknown[]> {
  jsonrpc: '2.0';
  method: string;
  params?: P;
}

export interface RPCRequest<P extends unknown[]> extends RPCNotification<P> {
  jsonrpc: '2.0';
  method: string;
  params?: P;
  id: number;
}

export interface RPCResponseBase {
  jsonrpc: '2.0';
  id: number;
}

export interface RPCResponseResult<T> extends RPCResponseBase {
  result: T;
}

export interface RPCResponseError extends RPCResponseBase {
  error: RPCErrorObject;
}

export type RPCResponse<T> = RPCResponseResult<T> | RPCResponseError;

export type RPCMessage<P extends unknown[], T> = RPCRequest<P> | RPCNotification<P> | RPCResponse<T>;

export type RPCCallBack<T extends (...args: any[]) => any> = {
  (result: AwaitedReturn<T> | undefined, error: RPCErrorObject | undefined): AwaitedReturn<T>;
  timeout: number;
};

// TODO: ordering
// TODO: pull defaults from somewhere
export type RPCOptions = {
  /**
   * Timeout in milliseconds
   *
   * Default: `3000`
   */
  timeoutMs?: number;
  /**
   * If your plugin UI is hosted (non-null origin), the pluginId must be defined to allow messages to be sent
   */
  pluginId?: string;
  /**
   * Specifies what the origin of the plugin UI must be for a message to be dispatched from logic to the UI
   *
   * If defined, add `http://localhost:<port>` to this field in your local environment to allow messaging while running on a dev server
   *
   * Default: `'*'`
   */
  logicTargetOrigin?: string;
  /**
   * Specifies what the origin of the plugin logic must be for a message to be dispatched from UI to the logic
   *
   * Usually `'https://www.figma.com'`
   *
   * Default: `'*'`
   */
  uiTargetOrigin?: string;
};

export type RPCSendRaw = <P extends unknown[], T>(message: RPCMessage<P, T>) => void;

export const isRpcOutGoing = <P extends unknown[], T>(
  req: RPCNotification<P> | RPCResponse<T>
): req is RPCNotification<P> | RPCRequest<P> => {
  return Object.prototype.hasOwnProperty.call(req, 'method');
};

export const isRpcNotification = <P extends unknown[], T>(
  req: RPCNotification<P> | RPCResponse<T>
): req is RPCNotification<P> => {
  return isRpcOutGoing(req) && !Object.prototype.hasOwnProperty.call(req, 'id');
};

export const isRpcRequest = <P extends unknown[], T>(
  req: RPCNotification<P> | RPCResponse<T>
): req is RPCRequest<P> => {
  return isRpcOutGoing(req) && Object.prototype.hasOwnProperty.call(req, 'id');
};

export const isRpcResponseResult = <P extends unknown[], T>(
  req: RPCNotification<P> | RPCResponse<T>
): req is RPCResponseResult<T> => {
  return Object.prototype.hasOwnProperty.call(req, 'result');
};

export const isRpcResponseError = <P extends unknown[], T>(
  req: RPCNotification<P> | RPCResponse<T>
): req is RPCResponseError => {
  return Object.prototype.hasOwnProperty.call(req, 'error');
};

export const isRpcResponse = <P extends unknown[], T>(
  req: RPCNotification<P> | RPCResponse<T>
): req is RPCResponse<T> => {
  return isRpcResponseResult(req) || isRpcResponseError(req);
};
