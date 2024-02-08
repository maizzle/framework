import type LayoutsTypes from './layouts';
import type PostHTMLConfig from './posthtml';
import type TailwindConfig from './tailwind';
import type TemplatesConfig from './templates';
import type ComponentsConfig from './components';
import type {Options as BrowserSyncConfig} from 'browser-sync';

export default interface BuildConfig {
  /**
  Templates configuration.
  */
  templates: TemplatesConfig;

  /**
  Tailwind CSS configuration.
  */
  tailwind?: TailwindConfig;

  /**
  [DEPRECATED] Layouts configuration.
  */
  layouts?: LayoutsTypes;

  /**
  Components configuration.
  */
  components?: ComponentsConfig;

  /**
  PostHTML configuration.
  */
  posthtml?: PostHTMLConfig;

  /**
  Configure PostCSS
   */
  postcss?: {
    /**
    Additional PostCSS plugins that you would like to use.

    @default []

    @example
    ```
    const examplePlugin = require('postcss-example-plugin')
    module.exports = {
      build: {
        postcss: {
          plugins: [
            examplePlugin()
          ]
        }
      }
    }
    ```
    */
    plugins?: any[];
  };

  /**
  Browsersync configuration.

  When you run the `maizzle serve` command, Maizzle uses [Browsersync](https://browsersync.io/)
  to start a local development server and open a directory listing of your emails in your default browser.
  */
  browsersync?: BrowserSyncConfig;

  /**
  Configure how build errors are handled when developing with the Maizzle CLI.

  @default undefined
  */
  fail?: 'silent' | 'verbose';
}
