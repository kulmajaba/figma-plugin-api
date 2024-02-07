import { handleRaw, sendRequest, setupAuxiliaries, setupMethods } from './rpc';
import {
  ApiFunctions,
  AwaitedReturn,
  RPCAPIReturnType,
  RPCDefaultOptions,
  RPCOptions,
  RPCSendRaw,
  StrictParameters
} from './types';
import { logBase, strictObjectKeys } from './utils';

export { ApiFunctions, RPCAPIReturnType, RPCOptions } from './types';

const DEFAULT_OPTIONS: RPCDefaultOptions = {
  timeoutMs: 3000,
  logicTargetOrigin: '*',
  uiTargetOrigin: '*'
};

let sendRaw: RPCSendRaw;
/**
 * Set up sending and receiving of messages for Figma plugin logic and UI
 */
const setupMessaging = (pluginId: string | undefined, logicTargetOrigin: string, uiTargetOrigin: string) => {
  if (typeof figma !== 'undefined') {
    figma.ui.on('message', (message) => handleRaw(message));

    sendRaw = (message) => figma.ui.postMessage(message, { origin: logicTargetOrigin });
  } else if (typeof parent !== 'undefined') {
    onmessage = (event) => handleRaw(event.data.pluginMessage);

    if (pluginId !== undefined) {
      sendRaw = (pluginMessage) => parent.postMessage({ pluginMessage, pluginId }, uiTargetOrigin);
    } else {
      sendRaw = (pluginMessage) => parent.postMessage({ pluginMessage }, uiTargetOrigin);
    }
  } else {
    // Should not happen but log an error just in case
    console.warn('Both parent and figma are undefined, it seems like the runtime is neither Figma nor a browser');
  }
};

/**
 * Creates one side of a JSON-RPC API for a Figma plugin.
 * @param hostType A typeof string of an object that differentiates between on-host and off-host.
 * For example, if `typeof figma` is used, when `figma` is defined the creator is considered to be on-host
 * and the methods for processing the remote API calls are set up.
 * Off-host the creator sets up the equivalent remote API calls to make requests to host.
 */
const createAPI = <T extends ApiFunctions>(
  methods: T,
  hostType: string,
  options?: RPCOptions
): Readonly<RPCAPIReturnType<T>> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { timeoutMs, pluginId, logicTargetOrigin, uiTargetOrigin } = opts;

  if (sendRaw === undefined) {
    setupMessaging(pluginId, logicTargetOrigin, uiTargetOrigin);
  }

  if (hostType !== 'undefined') {
    // Should not happen but log an error just in case
    if (sendRaw === undefined) {
      console.error('sendRaw is undefined at during setup, the API will not work');
    }

    setupMethods(methods);
  }

  setupAuxiliaries(sendRaw, logBase);

  const api: RPCAPIReturnType<T> = strictObjectKeys(methods).reduce((prev, p) => {
    const method = async (...params: StrictParameters<T[keyof T]>) => {
      if (hostType !== 'undefined') {
        return (await methods[p](...params)) as AwaitedReturn<T[keyof T]>;
      }

      return (await sendRequest(p as string, params, timeoutMs)) as AwaitedReturn<T[keyof T]>;
    };

    prev[p] = method;
    return prev;
  }, {} as RPCAPIReturnType<T>);

  return api;
};

/**
 * Create a set of methods that can be called from plugin logic and are executed in plugin UI.
 * This side has access to the browser API
 */
export const createUIAPI = <T extends ApiFunctions>(
  methods: T,
  options?: RPCOptions
): Readonly<RPCAPIReturnType<T>> => {
  return createAPI(methods, typeof parent, options);
};

/**
 * Create a set of methods that can be called from plugin UI and are executed in plugin logic.
 * This side has acccess to the `figma` API
 */
export const createPluginAPI = <T extends ApiFunctions>(
  methods: T,
  options?: RPCOptions
): Readonly<RPCAPIReturnType<T>> => {
  return createAPI(methods, typeof figma, options);
};
