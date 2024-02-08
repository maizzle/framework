import type {StringifyOptions} from 'query-string';

export default interface URLParametersConfig {
  [key: string]: any;

  _options?: {
    /**
    Array of tag names to process. Only URLs inside `href` attributes of tags in this array will be processed.

    @default ['a']

    @example
    ```
    module.exports = {
      urlParameters: {
        _options: {
          tags: ['a[href*="example.com"]'],
        },
        utm_source: 'maizzle',
      }
    }
    ```
    */
    tags?: string[];

    /**
    By default, query parameters are appended only to valid URLs.
    Disable strict mode to append parameters to any string.

    @default true
    */
    strict?: boolean;

    /**
    Options to pass to the `query-string` library.
    */
    qs?: StringifyOptions;
  };
}
