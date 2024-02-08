import type {Options as GotOptions} from 'got';
import type ExpressionsConfig from './expressions';

export default interface PostHTMLFetchConfig {
  /**
  Supported tag names.
  Only tags from this array will be processed by the plugin.

  @default ['fetch', 'remote']

  @example
  ```
  module.exports = {
    build: {
      posthtml: {
        fetch: {
          tags: ['get']
        }
      }
    }
  }
  ```
  */
  tags?: string[];

  /**
  String representing the attribute name containing the URL to fetch.

  @default 'url'

  @example
  ```
  module.exports = {
    build: {
      posthtml: {
        fetch: {
          attribute: 'from'
        }
      }
    }
  }
  ```
  */
  attribute?: string;

  /**
  `posthtml-fetch` uses `got` to fetch data.
  You can pass options directly to it, inside the `got` object.

  @default {}

  @example
  ```
  module.exports = {
    build: {
      posthtml: {
        got: {
          prefixUrl: '...'
        }
      }
    }
  }
  ```
  */
  got?: GotOptions;

  /**
  When set to `true`, this option will preserve the `tag`, i.e. `<fetch>` around the response body.

  @default false

  @example
  ```
  module.exports = {
    build: {
      posthtml: {
        fetch: {
          preserveTag: true
        }
      }
    }
  }
  ```
  */
  preserveTag?: boolean;

  /**
  Pass options to `posthtml-expressions`.

  @default {}

  @example
  ```
  module.exports = {
    build: {
      posthtml: {
        fetch: {
          expressions: {
            delimiters: ['[[', ']]']
          }
        }
      }
    }
  }
  ```
  */
  expressions?: ExpressionsConfig;

  /**
  List of plugins that will be called after/before receiving and processing `locals`.

  @default {}

  @example
  ```
  module.exports = {
    build: {
      posthtml: {
        fetch: {
          plugins: {
            after(tree) {
              // Your plugin implementation
            },
            before: [
              tree => {
                // Your plugin implementation
              },
              tree => {
                // ..
              }
            ]
          }
        }
      }
    }
  }
  ```
  */
  plugins?: {
    after?: (tree: any) => void;
    before?: Array<(tree: any) => void>;
  };
}
