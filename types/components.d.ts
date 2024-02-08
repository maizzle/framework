export default interface ComponentsConfig {
  /**
  Root path where to look for folders containing component files.

  @default './'
  */
  root?: string;

  /**
  Paths where to look for component files. Must be relative to `root`.

  @default ['src/components', 'src/layouts', 'src/templates']
  */
  folders?: string[];

  /**
  Prefix to use for component tags.

  @default 'x-'
  */
  tagPrefix?: string;

  /**
  Tag name to be used in HTML when using a component.

  @default 'component'
  */
  tag?: string;

  /**
  Attribute name to be used when referencing a component via its path.

  @default 'src'
  */
  attribute?: string;

  /**
  File extension that component files must use.
  Any other files will be ignored and not be made available as components.

  @default 'html'
  */
  fileExtension?: string;

  /**
  Name of the tag that will be replaced with the content that is passed to the component.

  @default 'content'
  */
  yield?: string;

  /**
  Name of the slot tag, where the content will be injected.

  @default 'slot'
  */
  slot?: string;

  /**
  Name of the fill tag, where the content to be injected is defined.

  @default 'fill'
  */
  fill?: string;

  /**
  String to use as a separator between the slot tag and its name.

  @default ':'
  */
  slotSeparator?: string;

  /**
  Tag name for pushing content to a stack.

  @default 'push'
  */
  push?: string;

  /**
  Tag name for popping (rendering) content from a stack.

  @default 'stack'
  */
  stack?: string;

  /**
  Name of the props attribute to use in the `<script>` tag of a component.

  @default 'props'
  */
  propsScriptAttribute?: string;

  /**
  Name of the object that will be used to store the props of a component.

  @default 'props'
  */
  propsContext?: string;

  /**
  Name of the attribute that will be used to pass props to a component as JSON.

  @default 'locals'
  */
  propsAttribute?: string;

  /**
  Name of the key to use when retrieving props passed to a slot via `$slots.slotName.props`.

  @default 'props'
  */
  propsSlot?: string;

  /**
  Configure [`posthtml-parser`](https://github.com/posthtml/posthtml-parser).

  @default {recognizeSelfClosing:true}
  */
  parserOptions?: Record<string, any>;

  /**
  Configure [`posthtml-expressions`](https://github.com/posthtml/posthtml-expressions).

  @default {} // custom object
  */
  expressions?: Record<any, any>;

  /**
  PostHTML plugins to apply to each parsed component.

  @default []
  */
  plugins?: any[];

  /**
  Extra rules for the PostHTML plugin that is used by components to parse attributes.

  @default {}
  */
  attrsParserRules?: Record<any, any>;

  /**
  In strict mode, an error will be thrown if a component cannot be rendered.

  @default true
  */
  strict?: boolean;

  /**
  Utility methods to be passed to `<script props>` in a component.

  @default {merge: _.mergeWith, template: _.template}
  */
  utilities?: Record<string, unknown>;

  /**
  Define additional attributes that should be preserved for specific HTML elements.

  @default {}
  */
  elementAttributes?: Record<string, void>;

  /**
  Attributes that should be preserved on all elements in components.

  @default ['data-*']
  */
  safelistAttributes?: string[];

  /**
  Attributes that should be removed from all elements in components.

  @default []
  */
  blacklistAttributes?: string[];
}
