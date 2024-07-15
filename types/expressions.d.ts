export default interface ExpressionsConfig {
  /**
  Define the starting and ending delimiters used for expressions.

  @default ['{{', '}}']
  */
  delimiters?: string[];

  /**
  Define the starting and ending delimiters used for unescaped expressions.

  @default ['{{{', '}}}']
  */
  unescapeDelimiters?: string[];

  /**
  Object containing data that will be available under the `page` object.

  @default {}
  */
  locals?: Record<string, unknown>;

  /**
  Attribute name for `<script>` tags that contain locals.

  @default 'locals'
  */
  localsAttr?: string;

  /**
  Whether to remove `<script>` tags that contain locals.

  @default false
  */
  removeScriptLocals?: boolean;

  /**
  Tag names to be used for if/else statements.

  @default ['if', 'elseif', 'else']
  */
  conditionalTags?: string[];

  /**
  Tag names to be used for switch statements.

  @default ['switch', 'case', 'default']
  */
  switchTags?: string[];

  /**
  Tag names to be used for loops.

  @default ['each', 'for']
  */
  loopTags?: string[];

  /**
  Tag names to be used for scopes.

  @default ['scope']
  */
  scopeTags?: string[];

  /**
  Name of tag inside of which expression parsing is disabled.

  @default 'raw'
  */
  ignoredTag?: string;

  /**
  Enabling strict mode will throw an error if an expression cannot be evaluated.

  @default false
  */
  strictMode?: boolean;

  /**
  What to render when referencing a value that is not defined in `locals`.

  By default, the string 'undefined' will be output.

  @default undefined

  @example

  ```
  // Output empty string if value is not defined
  missingLocal: ''

  // Output original reference if value is not defined
  missingLocal: '{local}'

  // Output custom string if value is not defined
  missingLocal: 'ERR_NO_VALUE: {local}'
  ```
  */
  missingLocal?: string;
}
