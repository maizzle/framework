export type AttributeToStyleSupportedAttributes =
  | 'width'
  | 'height'
  | 'bgcolor'
  | 'background'
  | 'align'
  | 'valign';

export default interface InlineCSSConfig {
  /**
  Which CSS properties should be duplicated as what HTML attributes.

  @default {}

  @example
  ```
  module.exports = {
    build: {
      inlineCSS: {
        styleToAttribute: {
          'background-color': 'bgcolor',
        }
      }
    }
  }
  ```
  */
  styleToAttribute?: Record<string, string>;

  /**
  Duplicate HTML attributes to inline CSS.

  @default false

  @example
  ```
  module.exports = {
    build: {
      inlineCSS: {
        attributeToStyle: ['width', 'bgcolor', 'background']
      }
    }
  }
  ```
  */
  attributeToStyle?: boolean | AttributeToStyleSupportedAttributes[];

  /**
  HTML elements that will receive `width` attributes based on inline CSS width.

  @default []

  @example
  ```
  module.exports = {
    build: {
      inlineCSS: {
        applyWidthAttributes: ['td', 'th']
      }
    }
  }
  ```
  */
  applyWidthAttributes?: string[];

  /**
  HTML elements that will receive `height` attributes based on inline CSS height.

  @default []

  @example
  ```
  module.exports = {
    build: {
      inlineCSS: {
        applyHeightAttributes: ['td', 'th']
      }
    }
  }
  ```
  */
  applyHeightAttributes?: string[];

  /**
  List of elements that should only use `width` and `height`. Their inline CSS `width` and `height` will be removed.

  @example
  ```
  module.exports = {
    inlineCSS: {
      keepOnlyAttributeSizes: {
        width: ['img', 'video'],
        height: ['img', 'video']
      }
    }
  }
  ```
  */
  keepOnlyAttributeSizes?: {
    /**
    List of elements that should only use the `width` HTML attribute (inline CSS width will be removed).

    @default []

    @example
    ```
    module.exports = {
      inlineCSS: {
        keepOnlyAttributeSizes: {
          width: ['img', 'video'],
        }
      }
    }
    ```
    */
    width?: string[];
    /**
    List of elements that should only use the `height` HTML attribute (inline CSS height will be removed).

    @default []

    @example
    ```
    module.exports = {
      inlineCSS: {
        keepOnlyAttributeSizes: {
          height: ['img', 'video']
        }
      }
    }
    ```
    */
    height?: string[];
  };

  /**
  Remove inlined `background-color` CSS on elements containing a `bgcolor` HTML attribute.

  @default false

  @example
  ```
  module.exports = {
    inlineCSS: {
      preferBgColorAttribute: ['td'] // default: ['body', 'marquee', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr']
    }
  }
  ```
  */
  preferBgColorAttribute?: boolean | string[];

  /**
  Array of CSS property names that should be excluded from the CSS inlining process. `--tw-shadow` is excluded by default.

  @default []

  @example
  ```
  module.exports = {
    inlineCSS: {
      excludedProperties: ['padding', 'padding-left']
    }
  }
  ```
  */
  excludedProperties?: string[];

  /**
  An object where each value has a `start` and `end` to specify fenced code blocks that should be ignored during CSS inlining.

  @default {EJS: {}, HBS: {}}

  @example
  ```
  module.exports = {
    EJS: { start: '<%', end: '%>' },
    HBS: { start: '{{', end: '}}' },
  }
  ```
  */
  codeBlocks?: {
    EJS?: Record<string, string>;
    HBS?: Record<string, string>;
  };

  /**
  Provide your own CSS to be inlined. Must be vanilla or pre-compiled CSS.

  Existing `<style>` in your HTML tags will be ignored and their contents won't be inlined.

  @default undefined

  @example
  ```
  module.exports = {
    inlineCSS: {
      customCSS: `
        .custom-class {
          color: red;
        }
      `
    }
  }
  ```
   */
  customCSS?: string;
}
