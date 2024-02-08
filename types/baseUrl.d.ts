export default interface BaseURLConfig {
  /**
  The URL to prepend.

  @default undefined
  */
  url: string;

  /**
  Tags to apply the `url` to. When using this option, the `url` will only be prepended to the specified tags.

  Maizzle uses a [custom set of tags](https://github.com/posthtml/posthtml-base-url/blob/main/lib/index.js#L6-L60) by default.

  @example

  Prepend `url` to all 'source'-like attribute values on image tags, like `src` and `srcset`:

  ```
  module.exports = {
    baseURL: {
      url: 'https://cdn.example.com/',
      tags: ['img'],
    },
  }
  ```

  With more granular control:

  ```
  module.exports = {
    baseURL: {
      url: 'https://cdn.example.com/',
      tags: {
        img: {
          src: true, // use the value of `url` above
          srcset: 'https://bar.com/',
        },
      },
    },
  }
  ```
  */
  tags?: string[] | Record<string, unknown>;

  /**
  Key-value pairs of attributes and the string to prepend to their existing value.

  @default {}

  @example

  Prepend `https://example.com/` to all `data-url` attribute values:

  ```
  module.exports = {
    baseURL: {
      attributes: {
        'data-url': 'https://example.com/',
      },
    },
  }
  ```
  */
  attributes?: Record<string, unknown>;

  /**
  Whether the string defined in `url` should be prepended to `url()` values in CSS `<style>` tags.

  @default true
  */
  styleTag?: boolean;

  /**
  Whether the string defined in `url` should be prepended to `url()` values in inline CSS.

  @default true
  */
  inlineCss?: boolean;
}
