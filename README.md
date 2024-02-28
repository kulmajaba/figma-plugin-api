# figma-plugin-api

Harness the power of JSON-RPC in your Figma plugin communication.

figma-plugin-api allows you to create an API between your Figma plugin (logic) and plugin UI by defining a set of methods with your business logic.
The plugin <-> UI communication is handled by the package using JSON-RPC 2.0 and all you need to do is call your methods asynchronously wherever you need the results.

The plugin is also strongly typed and the methods you pass to the API creators retain their types.

Based on the work of Mathieu Dutour in [https://github.com/Lona/figma-jsonrpc](https://github.com/Lona/figma-jsonrpc)

## Usage

Define your plugin API:

```ts
import { createPluginAPI, createUIAPI } from 'figma-plugin-api';

// Create a set of methods that are called from plugin UI and executed in plugin logic
export const api = createPluginAPI({
  ping() {
    return 'pong';
  },
  setToken(token: string) {
    return figma.clientStorage.setAsync('token', token);
  },
  getToken() {
    return figma.clientStorage.getAsync('token');
  }
});

// Create a set of methods that are called from plugin logic and executed in plugin UI
export const uiApi = createUIAPI({
  selectionChanged(selection) {
    // Display Figma selection in UI
  }
});
```

Use the Plugin API in the UI:

```ts
import { api } from './api';

const pong = await api.ping();

await api.setToken('new token');
```

Use the UI API in the plugin:

```ts
// Import methods to use from uiApi
import { uiApi } from './api';

// Show plugin UI with figma.showUI(__html__) etc.

figma.on('selectionchange', () => {
  uiApi.selectionChange(figma.currentPage.selection);
});
```

**NOTE: You must always import the file calling the API creator functions in both the plugin and the UI, even if you aren't calling any API methods in that module.**
It is necessary so that both modules can handle calls from each other.
You can use an unnamed import (e.g. `import './api'`) if you do not need to call any methods in the module.

### Plugin options

If needed, plugin options can be used to set plugin ID, target origins for messages passed between plugin and UI, and adjust timeout for API calls.

**NOTE: If you are running a hosted (non-null origin) plugin UI, you must set `pluginId` to allow messages to be passed between plugin logic and UI.**

The options work on a "latest takes presence" principle: when `createPluginAPI` or `createUIAPI` are called, whatever options are passed to them override any previous options.
Remember that recreating the APIs with new options only on the plugin or only on the UI side will lead to the different sides of your API working with different options, so it is recommended to define a static common options object and use it for creating both APIs.

```ts
import { createPluginAPI, createUIAPI, RPCOptions } from 'figma-plugin-api';

import manifest from '../manifest.json';

const pluginOptions: RPCOptions = {
  /**
   * Timeout in milliseconds
   * Default: 3000
   */
  timeoutMs: 5000,
  /**
   * If your plugin UI is hosted (non-null origin), pluginId must be defined to allow messages to be sent
   */
  pluginId: manifest.id,
  /**
   * Specifies what the origin of the plugin UI must be for a message to be dispatched from plugin logic to UI
   * If defined, add 'http://localhost:<port>' to this field in your local environment
   * to allow messaging while running on a dev server
   * Default: '*'
   */
  logicTargetOrigin: 'https://www.your-hosted-plugin.com',
  /**
   * Specifies what the origin of the plugin logic must be for a message to be dispatched from UI to plugin logic
   * Usually 'https://www.figma.com'
   * Default: '*'
   */
  uiTargetOrigin: 'https://www.figma.com'
};

export const api = createPluginAPI(
  {
    ...
  },
  pluginOptions
);

export const uiApi = createUIAPI(
  {
    ...
  },
  pluginOptions
);
```

## Troubleshooting

### Debugging tactics

- Add logging to your API methods to see if they are being called
- Add logging to the plugin and UI to see if messages are being received:
  - Plugin logic:
    ```ts
    figma.ui.onmessage = (msg) => {
      console.log('Plugin received message:', msg);
    };
    ```
  - Plugin UI:

    ```ts
    window.addEventListener('message', (e) => {
      // React specific: Do not log React dev tools messages
      if (e.data.source?.includes('react-devtools')) {
        return;
      }

      if (Object.hasOwn(e.data, 'pluginMessage')) {
        console.log('UI received message:', e.data.pluginMessage);
      } else {
        console.log('UI received message:', e);
      }
    });
    ```

### Error: Request \<number\> (\<method name\>) timed out.

Most probably either the remote API call doesn't get through to the handler side, there is no handler for it, or the return message doesn't get through to the caller side.
Checklist:

- Have you imported the api module in both plugin logic and plugin UI?
  - Some packagers with certain configurations will drop unused named imports, so make sure to use `import './api-wrapper';` instead of `import { api } from './api-wrapper;` if you are not using any of the API functions. The first syntax commonly means "this module has side effects" and the import will be included.
- Hosted plugins (non-null origin): have you set the plugin id to the API options?
- If you have set `logicTargetOrigin` and/or `uiTargetOrigin`, are they correct?
  - Omit them from the API options or set them to the `'*'` wildcard to test.

## Library developers

This library is intended to be imported from one source for the entire project as it behaves like a singleton and expects to be the only handler of RPC procotol calls.
This means if you use this library in your library, add it as a `peerDependency` and ensure it is not bundled with your code.
