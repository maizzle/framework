export default interface RemoveUnusedCSSConfig {
  /**
  Classes or IDs that you don't want removed.

  @default []

  @example
  ```
  module.exports = {
    removeUnusedCSS: {
      whitelist: ['.some-class', '.Mso*', '#*'],
    }
  }
  ```
  */
  whitelist?: string[];

  /**
  Start and end delimiters for computed classes that you don't want removed.

  @default [{heads: '{{', tails: '}}'}, {heads: '{%', tails: '%}'}]

  @example
  ```
  module.exports = {
    removeUnusedCSS: {
      backend: [
        { heads: '[[', tails: ']]' },
      ]
    }
  }
  ```
  */
  backend?: Array<Record<string, string>>;

  /**
  Whether to remove `<!-- HTML comments -->`.

  @default true

  @example
  ```
  module.exports = {
    removeUnusedCSS: {
      removeHTMLComments: false
    }
  }
  ```
  */
  removeHTMLComments?: boolean;

  /**
  Whether to remove `/* CSS comments *\/`.

  @default true

  @example
  ```
  module.exports = {
    removeUnusedCSS: {
      removeCSSComments: false
    }
  }
  ```
  */
  removeCSSComments?: boolean;

  /**
  Whether to remove classes that have been inlined.

  @default undefined

  @example
  ```
  module.exports = {
    removeUnusedCSS: {
      removeInlinedSelectors: false,
    }
  }
  ```
  */
  removeInlinedSelectors?: boolean;

  /**
  List of strings representing start of a conditional comment that should not be removed.

  @default ['[if', '[endif']

  @example
  ```
  module.exports = {
    removeUnusedCSS: {
      doNotRemoveHTMLCommentsWhoseOpeningTagContains: ['[if', '[endif']
    }
  }
  ```
  */
  doNotRemoveHTMLCommentsWhoseOpeningTagContains: string[];

  /**
  Rename all classes and IDs in both your `<style>` tags and your body HTML elements, to be as few characters as possible.

  @default false

  @example
  ```
  module.exports = {
    removeUnusedCSS: {
      uglify: true
    }
  }
  ```
  */
  uglify?: boolean;
}
